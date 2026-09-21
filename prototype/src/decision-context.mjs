// Lossless transport factoring. It neither infers answers nor hides controls.
// Only adjacent fields with the same observed group share defaults.
export function factorPage(page) {
 const sections=[];
 for(const field of page.fields){
  let section=sections.at(-1);
  if(!section||section.group!==field.group){section={group:field.group,fields:[]};sections.push(section);}
  const {group,...rest}=field;section.fields.push(rest);
 }
 for(const section of sections){
  const defaults={};
  for(const [key,value] of Object.entries(section.fields[0])){
   if(key==='ref'||key==='label'||value===undefined)continue;
   if(section.fields.every(f=>Object.hasOwn(f,key)&&JSON.stringify(f[key])===JSON.stringify(value)))defaults[key]=value;
  }
  section.defaults=defaults;
  section.fields=section.fields.map(f=>Object.fromEntries(Object.entries(f).filter(([k])=>!Object.hasOwn(defaults,k))));
 }
 const {fields,...rest}=page;
 return {...rest,format:'grouped-fields-v1',fieldRule:'Each field inherits its section.group and section.defaults; its own properties override defaults. All observed fields are included.',sections};
}
export function expandFactoredPage(page) {
 if(page.format!=='grouped-fields-v1')return page;
 const {format,fieldRule,sections,...rest}=page;
 return {...rest,fields:sections.flatMap(s=>s.fields.map(f=>({...s.defaults,...f,group:s.group})))};
}
