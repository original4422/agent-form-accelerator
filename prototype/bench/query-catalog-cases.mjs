// Independent test/controller only. Not imported by any model-facing provider.
export function catalogPlan(c){
 const field=label=>c.page.fields.find(f=>f.label===label).ref;
 const source=label=>c.source.entries.find(e=>e.label===label).id;
 const map={'Full name':'姓名','Email':'邮箱','Home city':'居住城市','Preferred office':'意向办公城市','Introduction':'个人介绍'};
 return {url:c.page.url,bindings:Object.fromEntries(Object.entries(map).map(([f,s])=>[field(f),source(s)])),choices:{[field('Home city')]:{search:{queries:['大阪','Osaka'],labelParts:['Osaka','Japan']}},[field('Preferred office')]:{search:{queries:['苏州','Suzhou'],labelParts:['Suzhou','Jiangsu','China']}}}};
}
export async function catalogOracle(page){
 return page.evaluate(()=>{
  const expected={name:'程示例',email:'cheng@example.test',home:'osaka',office:'suzhou',statement:'这是一份虚构资料，用来检查不同目录查询方式下的表单填写。需要保留地区限定信息。',date:''};
  const errors=[];if(JSON.stringify(window.applicationState)!==JSON.stringify(expected))errors.push('application values');
  const labels=[...document.querySelectorAll('.select__single-value')].map(n=>n.textContent);if(JSON.stringify(labels)!==JSON.stringify(['Osaka, Japan','Suzhou, Jiangsu, China']))errors.push('selected DOM labels');
  if([...document.querySelectorAll('input[role=combobox]')].some(n=>n.value))errors.push('remaining query');
  if(document.querySelector('[role=listbox]'))errors.push('open popup');if(window.submissionCount)errors.push('submit');
  if(!document.querySelector('input[type=date]').validity.valueMissing)errors.push('invented date');
  return {passed:!errors.length,errors,targets:5,submits:window.submissionCount,searches:window.searchRequests};
 });
}
