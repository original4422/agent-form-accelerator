// A transport projection only. The session retains every observed option and
// validates against the full live observation before writing.
const normalized=s=>String(s??'').normalize('NFKC').trim().toLowerCase();
export function projectPage(page,source,{optionMode='full'}={}) {
 const facts=new Set(source.entries.map(e=>normalized(e.value)));
 return {url:page.url,formContext:page.formContext,formUpdate:page.formUpdate,formStatus:page.formStatus,limitations:page.limitations,fields:page.fields.map(({ref,label,group,kind,required,supported,disabled,readOnly,valid,pending,value,options,adapter,query,displayValue,selectionKey})=>{
  const f={ref,label,group,kind,required,supported,disabled,readOnly,valid,pending,value,options,adapter,query,displayValue,selectionKey};
  if(optionMode==='compact'&&kind==='select'&&options?.length>40){
   const selected=options.filter(o=>o.value===value);
   const candidates=[...selected,...options.filter(o=>o.value!==value&&(facts.has(normalized(o.label))||facts.has(normalized(o.value))))];
   f.options=candidates.slice(0,40);f.optionCount=options.length;f.optionsTruncated=f.options.length<options.length;
   f.optionRule='Selected option and exact source-string matches only; not semantic recommendations. Use form_search for other observed choices.';
  }
  return f;
 }),controls:page.controls.map(({ref,label,group,kind,required,supported,disabled,readOnly,valid,pending,value,options})=>({ref,label,group,kind,required,supported,disabled,readOnly,valid,pending,value,options}))};
}
