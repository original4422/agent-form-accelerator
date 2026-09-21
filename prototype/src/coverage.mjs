// Coverage is deliberately narrower than application/server completion.
export const fieldKey=f=>JSON.stringify([f.group,f.label]);
export function summarizeCoverage(page,verified) {
  const active=page.fields.filter(f=>!f.disabled),units=new Map();
  for(const f of active.filter(f=>f.required)) {
    const key=f.kind==='radio'?JSON.stringify(['radio',f.group]):fieldKey(f);
    if(!units.has(key))units.set(key,[]);units.get(key).push(f);
  }
  const reviewed=f=>{
    const prior=verified.get(fieldKey(f));
    return prior&&prior.kind===f.kind&&prior.actual===f.value&&!f.pending&&f.valid!==false&&
      active.filter(x=>fieldKey(x)===fieldKey(f)).length===1;
  };
  const unresolved=[];
  for(const fields of units.values()) {
    const radio=fields[0].kind==='radio';
    // Radio requiredness applies to its question, not every unselected option.
    const candidates=radio?active.filter(f=>f.kind==='radio'&&f.group===fields[0].group):fields;
    if(candidates.some(f=>reviewed(f)&&(!radio||f.value===true)))continue;
    const f=fields[0];unresolved.push({ref:f.ref,group:f.group,label:radio?f.group:f.label,kind:f.kind,
      reason:!f.supported?'unsupported':f.pending?'pending':verified.has(fieldKey(f))?'changed-or-invalid':'not-bound-to-source'});
  }
  return {scope:'Visible enabled required fields only; hidden steps and server acceptance are not covered.',
    limitations:page.limitations,
    requiredUnits:units.size,verifiedRequiredUnits:units.size-unresolved.length,unresolvedRequired:unresolved,
    visibleRequiredCovered:unresolved.length===0,
    unsupported:active.filter(f=>!f.supported).map(({ref,group,label,kind,required})=>({ref,group,label,kind,required}))};
}
