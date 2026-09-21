// Independent benchmark expectations. Never imported by the MCP provider.
export const PUBLIC_URL='https://jobs.lever.co/palantir/c34b424e-caf2-455a-b104-ae1096ccca29/apply';
export const CASES=[
 ['name','姓名'],['email','邮箱'],['phone','电话'],['org','当前公司'],
 ['cards[a69a985a-eae9-4c14-90fb-b5a4b891523e][field1]','常用名'],
 ['cards[a69a985a-eae9-4c14-90fb-b5a4b891523e][field2]','姓名读音'],
 ['cards[63ab2c2b-61f2-4444-8289-36cb8ed5c80a][field2]','预计到岗时间'],
 ['cards[dbe30cab-7c88-4981-b9c9-a1ed816d52e0][field1]','办公地点偏好的补充说明'],
 ['cards[d54adf7b-3148-4095-93bb-72bef32a61f8][field0]','高中名称'],
 ['cards[d54adf7b-3148-4095-93bb-72bef32a61f8][field1]','高中毕业年份'],
 ['cards[3da58b41-acf5-40a1-945e-c7f047ef8050][field0]','大学英文名称'],
 ['cards[026d7ce7-7ca4-44ed-9db6-1c7857707f0e][field0]','大学预计毕业年份'],
 ['cards[a6197d84-549e-4a91-8bb0-6af972510013][field0]','职位获知渠道'],
 ['cards[504ca500-ddc8-45de-a4c4-95d4195434f9][field0]','希望从事的工作'],
 ['cards[504ca500-ddc8-45de-a4c4-95d4195434f9][field1]','最困难的技术挑战'],
];
// Question prefixes only used by manual functional preflight/oracle, not runtime.
export const BOOL_CASES=[
 ['Language Skill(s)','English (ENG)','掌握语言'],['Language Skill(s)','Mandarin (MAN)','掌握语言'],
 ['Do you have any, or anticipate','No','是否有其他录用通知的截止期限'],
 ['What are your preferred office','New York, NY','额外意向办公地点'],['What are your preferred office','Seattle, WA','额外意向办公地点'],
 ['Are you legally authorized','Yes','是否有当地合法工作资格'],
 ['Will you now or in the future','No','未来是否需要雇主提供签证支持'],
 ['As part of our interview process','No, I do not consent','是否同意AI面试记录'],
 ['Please share my resume','No','是否同意将简历及联系方式分享给外部合作伙伴'],
 ['Are you a resident','No','是否居住在加利福尼亚'],
];
const BOOLEAN_NAMES=['cards[a69a985a-eae9-4c14-90fb-b5a4b891523e][field0]', 'cards[a69a985a-eae9-4c14-90fb-b5a4b891523e][field0]', 'cards[63ab2c2b-61f2-4444-8289-36cb8ed5c80a][field0]', 'cards[dbe30cab-7c88-4981-b9c9-a1ed816d52e0][field0]', 'cards[dbe30cab-7c88-4981-b9c9-a1ed816d52e0][field0]', 'cards[1c719ca9-5069-4afe-9e82-39ca420e0edb][field0]', 'cards[1c719ca9-5069-4afe-9e82-39ca420e0edb][field1]', 'cards[73796cde-fc01-4758-9002-c85155f3503d][field0]', 'cards[3fd0c7ef-7ec1-4475-a325-d9941e7ca87c][field0]', 'cards[3fd0c7ef-7ec1-4475-a325-d9941e7ca87c][field1]'];
export async function publicOracle(page,source){
 return page.evaluate(({cases,boolCases,booleanNames,entries})=>{
  const errors=[],form=document.querySelector('form'),data=new FormData(form);
  for(const [name,label]of cases){const el=[...form.elements].find(el=>el.name===name),expected=entries.find(e=>e.label===label).value;
   if(!el){errors.push(`missing ${label}`);continue;}
   const display=el.tagName==='SELECT'?el.selectedOptions[0]?.textContent.trim():el.value;
   if(display!==expected)errors.push(`wrong ${label}`);
   if(data.get(name)!==el.value)errors.push(`serialization ${label}`);
  }
  // Read native labels + visible question containers directly, without the
  // observer's refs/group map. Ensure each selected boolean is serialized.
  const selected=[...form.querySelectorAll('input:checked')].map(el=>({name:el.name,value:el.value,label:[...el.labels??[]].map(l=>l.textContent.trim()).join(' ')}));
  for(const [i,[prefix,label]]of boolCases.entries()){if(!selected.some(s=>s.name===booleanNames[i]&&s.label===label&&data.getAll(s.name).includes(s.value)))errors.push(`boolean ${prefix}/${label}`);}
  if(selected.length!==boolCases.length)errors.push('unexpected boolean choice');
  if(form.querySelector('input[name=location]')?.value)errors.push('invented location');
  if(form.querySelector('input[type=file]')?.files.length)errors.push('unexpected file');
  return {passed:!errors.length,errors,knownTargets:cases.length+boolCases.length,submitAttempts:window.__afaSubmitAttempts??0,scope:'DOM display and native FormData only; network-dependent location, resume upload, business acceptance not verified.'};
 },{cases:CASES,boolCases:BOOL_CASES,booleanNames:BOOLEAN_NAMES,entries:source.entries});
}
