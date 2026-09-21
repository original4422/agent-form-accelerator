// A bounded declarative condition on newly observed option labels, never code,
// a selector, a fabricated option value, or a fuzzy semantic match.
const words=s=>String(s).normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu)?.join(' ')??'';
export function validateSearchCondition(value,{queryVariants=false}={}) {
 const queries=value?.queries??[value?.query];
 if(!value||(Object.hasOwn(value,'queries')&&(!queryVariants||Object.hasOwn(value,'query')))||
    !Array.isArray(queries)||queries.length<1||queries.length>3||new Set(queries.map(q=>typeof q==='string'?q.normalize('NFKC').trim().toLowerCase():q)).size!==queries.length||
    queries.some(q=>typeof q!=='string'||!q.trim()||q.length>120)||
    !Array.isArray(value.labelParts)||value.labelParts.length<1||value.labelParts.length>6||
    value.labelParts.some(s=>typeof s!=='string'||s.length>120||!words(s)))throw new Error('INVALID_SEARCH_CONDITION');
 return {...(Object.hasOwn(value,'queries')?{queries:[...queries]}:{query:value.query}),labelParts:[...value.labelParts]};
}
export function chooseObservedOption(search,condition) {
 if(search.status!=='observed'||search.truncated)return {reason:search.truncated?'TRUNCATED_CHOICES':search.reason??'SEARCH_BLOCKED'};
 const parts=condition.labelParts.map(words);
 const matches=(search.options??[]).filter(o=>!o.disabled&&parts.every(p=>(' '+words(o.label)+' ').includes(' '+p+' ')));
 return matches.length===1?{option:matches[0]}:{reason:matches.length?'AMBIGUOUS_CONDITION':'CONDITION_NOT_MET'};
}
