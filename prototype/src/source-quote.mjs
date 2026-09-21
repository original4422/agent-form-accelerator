// Exact excerpts, never replacement text or transformations. Kept in the same
// apply call so unstructured source input does not add a model round trip.
export function resolveSourceBinding(entries,binding){
 if(Array.isArray(binding)){
  if(binding.length<2||binding.length>12||new Set(binding).size!==binding.length||binding.some(id=>typeof id!=='string'))throw new Error('INVALID_SOURCE_JOIN');
  const parts=binding.map(id=>resolveSourceBinding(entries,id));
  if(parts.some(p=>p.entry.page!==parts[0].entry.page))throw new Error('CROSS_PAGE_SOURCE_JOIN');
  return {entry:parts[0].entry,value:parts.map(p=>p.value).join('\n'),sourceIds:binding};
 }
 const id=typeof binding==='string'?binding:binding?.sourceId;
 const entry=entries.find(e=>e.id===id);if(!entry)throw new Error('UNKNOWN_FIELD_OR_SOURCE');
 if(typeof binding==='string')return {entry,value:entry.value};
 if(!binding||Object.keys(binding).some(k=>!['sourceId','quote'].includes(k))||typeof binding.quote!=='string'||!binding.quote.trim()||binding.quote.length>10000)throw new Error('INVALID_SOURCE_QUOTE');
 const start=entry.value.indexOf(binding.quote);
 if(start<0||entry.value.indexOf(binding.quote,start+1)>=0)throw new Error('SOURCE_QUOTE_NOT_UNIQUE');
 return {entry,value:binding.quote,quote:{start,end:start+binding.quote.length}};
}

export const sourceBindingKey=target=>JSON.stringify([target.sourceId,target.sourceQuote??null,target.sourceIds??null]);
