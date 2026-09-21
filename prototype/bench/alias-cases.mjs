// Independent test/benchmark oracle and manual functional-test bindings only.
// Never imported into the MCP provider or included in model context.
export function aliasQueries({source,page}) {
  const field=label=>page.fields.find(f=>f.label===label);
  const entry=(label,section)=>source.entries.find(e=>e.label===label&&(!section||e.context.endsWith(section)));
  return [
    {ref:field('Preferred office city').ref,sourceId:entry('意向工作城市').id,query:'Hangzhou'},
    {ref:field('Institution').ref,sourceId:entry('学校','第一段教育经历').id,query:'Southern Example College'},
    {ref:field('Institution').ref,sourceId:entry('学校','第二段教育经历').id,query:'Northern Example University'},
  ];
}
export function aliasBindings(context,searches) {
  const {source,page}=context;
  const map={'Applicant name':'姓名','Email address':'邮箱','Country of residence':'居住国家','Preferred office city':'意向工作城市','Qualification level':'学历层次','Institution':'学校','Subject':'专业','Personal statement':'个人介绍'};
  const bindings=Object.fromEntries(page.fields.filter(f=>map[f.label]).map(f=>[f.ref,source.entries.find(e=>e.label===map[f.label]&&(!f.group||e.context.endsWith('第一段教育经历'))).id]));
  const repeated=Object.fromEntries(page.fields.filter(f=>f.group==='Education 1').map(f=>[f.ref,source.entries.find(e=>e.label===map[f.label]&&e.context.endsWith('第二段教育经历')).id]));
  const choices={};
  for(const s of searches.slice(0,2))choices[s.ref]={optionRef:s.options.find(o=>!o.label.includes('Nanjing')).optionRef};
  const school=page.fields.find(f=>f.label==='Institution');
  return {url:page.url,bindings,choices,repeatGroups:[{templateGroup:'Education 1',expectGroup:'Education 2',controlRef:page.controls[0].ref,bindings:repeated,choices:{[school.ref]:{optionRef:searches[2].options[0].optionRef}}}]};
}
export async function aliasOracle(page,summary) {
  return page.evaluate(summary=>{
    const expected={fullName:'林示例',email:'candidate@example.test',country:'cn',city:'hz',degree:'pg',schools:[{school:'school-south',major:'软件工程'},{school:'school-north',major:'计算机科学'}],summary,availableFrom:''};
    const errors=[];
    if(JSON.stringify(window.applicationState)!==JSON.stringify(expected))errors.push('application state or invented date');
    const labels=[...document.querySelectorAll('.select__single-value')].map(n=>n.textContent);
    if(JSON.stringify(labels)!==JSON.stringify(['Hangzhou, Zhejiang, China','Southern Example College — Shenzhen campus','Northern Example University — Beijing campus']))errors.push('selected DOM labels');
    if([...document.querySelectorAll('input[role=combobox]')].some(n=>n.value))errors.push('query text left');
    if(window.validationState.pending)errors.push('pending search');
    if(document.querySelector('[role=listbox]'))errors.push('popup open');
    if(window.submissionCount)errors.push('submitted');
    if(!document.querySelector('input[type=date]').validity.valueMissing)errors.push('missing fact was fabricated');
    return {passed:!errors.length,errors,knownTargets:10,requiredUnanswered:1,searches:window.searchRequests.length,submits:window.submissionCount};
  },summary);
}
