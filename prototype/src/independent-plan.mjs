import {sourceBindingKey} from './source-quote.mjs';
import {fieldKey} from './coverage.mjs';

// The caller declares dependency boundaries; no independence is inferred from DOM
// proximity. Expansion and closed checkbox-set plans keep their existing path.
export function validateIndependentGroups(args,targets) {
  if(args.independentGroups===undefined)return;
  if(args.repeatGroups?.length||args.checkboxGroups?.length)throw new Error('INDEPENDENT_EXPANSION_NOT_SUPPORTED');
  const groups=args.independentGroups,refs=targets.map(t=>t.ref);
  if(!Array.isArray(groups)||!groups.length||groups.length>100||groups.some(g=>!Array.isArray(g)||!g.length))throw new Error('INVALID_INDEPENDENT_GROUPS');
  const flat=groups.flat();
  if(flat.length!==refs.length||new Set(flat).size!==flat.length||flat.some(ref=>!refs.includes(ref)))throw new Error('INDEPENDENT_GROUPS_MUST_PARTITION_BINDINGS');
  // Radio/checkbox answers to one question cannot be split into separate units.
  const owners=new Map();
  for(const [index,group]of groups.entries())for(const ref of group){
    const t=targets.find(t=>t.ref===ref);
    if(!['radio','checkbox','pressed-choice'].includes(t.kind)||!t.group)continue;
    if(owners.has(t.group)&&owners.get(t.group)!==index)throw new Error('CHOICE_QUESTION_SPLIT_ACROSS_GROUPS');
    owners.set(t.group,index);
  }
  return groups;
}

const localFailures=new Set(['CONTROL_NOT_READY','SEARCH_DEADLINE','CONDITION_NOT_MET','AMBIGUOUS_CONDITION','TRUNCATED_CHOICES']);
export function partitionIndependentPlan(groups,decisions,before,after) {
  if(before.url!==after.url||before.documentId!==after.documentId)throw new Error('PLAN_PAGE_CHANGED');
  const failed=decisions.filter(d=>!d.option);
  if(failed.some(d=>!localFailures.has(d.reason)))throw new Error('PLAN_SEARCH_INTEGRITY_FAILED');
  const deferred=new Map();
  for(const group of groups){
    const failures=failed.filter(d=>group.includes(d.ref));
    if(failures.length)for(const ref of group)deferred.set(ref,{reason:failures.find(d=>d.ref===ref)?.reason??'DEPENDENT_TARGET_UNRESOLVED',blockedBy:failures.map(d=>d.ref)});
  }
  // A failed lookup may remove its own input. It cannot license changed meaning
  // elsewhere, a replaced document, or unknown newly visible fields.
  const meaning=f=>JSON.stringify([f.group,f.label,f.kind]);
  for(const prior of before.fields){
    const current=after.fields.find(f=>f.ref===prior.ref);
    if(!current){if(failed.some(d=>d.ref===prior.ref))continue;throw new Error('PLAN_FIELD_CHANGED');}
    if(meaning(prior)!==meaning(current))throw new Error('PLAN_FIELD_CHANGED');
  }
  if(after.fields.some(f=>!before.fields.some(p=>p.ref===f.ref)))throw new Error('PLAN_FIELD_CHANGED');
  return deferred;
}

// Retains requested facts even when a later snapshot hides their controls.
// This is not a whole-application completeness oracle.
export function createTargetLedger(verified) {
  const tracked=new Map();
  const key=t=>JSON.stringify([sourceBindingKey(t),t.group,t.label,t.kind]);
  return {
    clear:()=>tracked.clear(),
    register(targets){for(const t of targets){tracked.set(key(t),{ref:t.ref,sourceId:t.sourceId,...(t.sourceQuote?{sourceQuote:t.sourceQuote}:{}),...(t.sourceIds?{sourceIds:t.sourceIds}:{}),sourceLabel:t.sourceLabel,group:t.group,label:t.label,kind:t.kind,reason:'NOT_VERIFIED'});verified.delete(fieldKey(t));}},
    defer(targets,reasons){for(const t of targets)if(reasons.has(t.ref))Object.assign(tracked.get(key(t)),reasons.get(t.ref));},
    summary(page){
      if(!tracked.size)return {};
      const targets=[...tracked.values()].map(t=>{
        const matches=page.fields.filter(f=>fieldKey(f)===fieldKey(t)&&f.kind===t.kind),f=matches.length===1?matches[0]:undefined;
        const v=verified.get(fieldKey(t));
        const done=f&&v&&sourceBindingKey(v)===sourceBindingKey(t)&&v.kind===f.kind&&v.actual===f.value&&!f.disabled&&!f.pending&&f.valid!==false;
        return {...t,status:done?'verified':'unresolved',reason:done?undefined:t.reason,currentPresence:matches.length===1?'present':matches.length?'ambiguous':'absent'};
      });
      const unresolvedTargets=targets.filter(t=>t.status!=='verified');
      return {task:{scope:'Source targets explicitly planned in this document session; not the entire application.',complete:unresolvedTargets.length===0,targets,unresolvedTargets}};
    }
  };
}
