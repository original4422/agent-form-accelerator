// A bounded declarative condition on newly observed option labels, never code,
// a selector, a fabricated option value, or a fuzzy semantic match.
const words=s=>String(s).normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu)?.join(' ')??'';
export function validateSearchCondition(value) {
 if(!value||typeof value.query!=='string'||!value.query.trim()||value.query.length>120||
    !Array.isArray(value.labelParts)||value.labelParts.length<1||value.labelParts.length>6||
    value.labelParts.some(s=>typeof s!=='string'||s.length>120||!words(s)))throw new Error('INVALID_SEARCH_CONDITION');
 return {query:value.query,labelParts:[...value.labelParts]};
}
export function chooseObservedOption(search,condition) {
 if(search.status!=='observed'||search.truncated)return {reason:search.truncated?'TRUNCATED_CHOICES':search.reason??'SEARCH_BLOCKED'};
 const parts=condition.labelParts.map(words);
 const matches=(search.options??[]).filter(o=>!o.disabled&&parts.every(p=>(' '+words(o.label)+' ').includes(' '+p+' ')));
 return matches.length===1?{option:matches[0]}:{reason:matches.length?'AMBIGUOUS_CONDITION':'CONDITION_NOT_MET'};
}
