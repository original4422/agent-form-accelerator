import {createHash} from 'node:crypto';
const wire=value=>JSON.parse(JSON.stringify(value));
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const patch=(before,after)=>({set:Object.fromEntries(Object.entries(after).filter(([k,v])=>!equal(before[k],v))),remove:Object.keys(before).filter(k=>!Object.hasOwn(after,k))});

// Only the model-facing representation changes. The session retains its full
// observation, full task ledger and per-target read-back evidence.
export function projectReceipt(result,previousPage,previousDocumentId=previousPage?.documentId,currentDocumentId=result.observation?.documentId) {
  if(!result.observation||!previousPage||result.observation.url!==previousPage.url||
    !previousDocumentId||currentDocumentId!==previousDocumentId||
    !(result.complete===true||result.appliedSubsetComplete===true))return result;
  const page=wire(result.observation);previousPage=wire(previousPage);
  // A duplicate ref cannot be represented unambiguously by a keyed delta.
  if([previousPage,page].some(p=>!Array.isArray(p.fields)||new Set(p.fields.map(f=>f.ref)).size!==p.fields.length))return result;
  const {fields:oldFields,...oldMeta}=previousPage,{fields,...meta}=page;
  const oldByRef=new Map(oldFields.map(f=>[f.ref,f]));
  const changed=[],added=[];
  for(const f of fields){
    const prior=oldByRef.get(f.ref);
    if(!prior){added.push(f);continue;}
    const change=patch(prior,f);if(Object.keys(change.set).length||change.remove.length)changed.push({ref:f.ref,...change});
  }
  const delta={baseHash:digest(previousPage),metadata:patch(oldMeta,meta),
    changedFields:changed,addedFields:added,removedRefs:oldFields.filter(f=>!fields.some(n=>n.ref===f.ref)).map(f=>f.ref),fieldOrder:fields.map(f=>f.ref)};
  const {observation,task,...receipt}=result;
  if(task?.targets){
    const {targets,...rest}=task;
    receipt.task={...rest,plannedCount:targets.length,verifiedCount:targets.filter(t=>t.status==='verified').length};
  }else if(task)receipt.task=task;
  return {...receipt,receiptFormat:'changes-v1',observationDelta:delta};
}

// Independent reconstruction helper for checks/clients; the executor never uses
// reconstructed state for writes or validation.
export function restoreObservation(previous,delta) {
  previous=wire(previous);if(digest(previous)!==delta.baseHash)throw new Error('DELTA_BASE_MISMATCH');
  const apply=(before,p)=>{const result={...before,...p.set};for(const key of p.remove)delete result[key];return result;};
  const {fields,...meta}=previous,byRef=new Map(fields.map(f=>[f.ref,f]));
  for(const ref of delta.removedRefs)byRef.delete(ref);
  for(const change of delta.changedFields){if(!byRef.has(change.ref))throw new Error('UNKNOWN_DELTA_REF');byRef.set(change.ref,apply(byRef.get(change.ref),change));}
  for(const f of delta.addedFields)byRef.set(f.ref,f);
  return {...apply(meta,delta.metadata),fields:delta.fieldOrder.map(ref=>{if(!byRef.has(ref))throw new Error('UNKNOWN_DELTA_REF');return byRef.get(ref);})};
}
