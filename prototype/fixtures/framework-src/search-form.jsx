import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import AsyncSelect from 'react-select/async';
const aliases=location.pathname.endsWith('/alias-form.html');
const schools=aliases?[{value:'school-south',label:'Southern Example College',campus:'Shenzhen campus',terms:['southern','southern example college']},{value:'school-other',label:'Southern Example College',campus:'Nanjing campus',terms:['southern','southern example college']},{value:'school-north',label:'Northern Example University',campus:'Beijing campus',terms:['northern','northern example university']}]:[{value:'school-south',label:'南方示例学院'},{value:'school-north',label:'北方示例大学'},{value:'off',label:'停用学校',isDisabled:true}];
function App(){
 const [data,setData]=useState({fullName:'',email:'',country:'',city:'',degree:'',schools:[{school:'',major:''}],summary:'',...(aliases?{availableFrom:''}:{})});
 const [pending,setPending]=useState({});
 const set=(key,value)=>setData(d=>({...d,[key]:value}));
 useEffect(()=>{window.applicationState=structuredClone(data);window.validationState={pending:Object.values(pending).some(Boolean)};},[data,pending]);
 const load=(key,options)=>async query=>{
   setPending(p=>({...p,[key]:true}));window.searchRequests.push({key,query});
   await new Promise(r=>setTimeout(r,window.searchDelay??450));
   setPending(p=>({...p,[key]:false}));
   if(window.emptySearch)return [];
   const found=options.filter(o=>aliases?(o.terms??[]).some(term=>term.includes(query.toLowerCase().trim())):o.label.includes(query));
   return window.duplicateSearch&&found.length?[...found,{...found[0],value:found[0].value+'-duplicate'}]:found;
 };
 const cityOptions=aliases?[{value:'hz',label:'Hangzhou, Zhejiang, China',terms:['hangzhou']},{value:'bj',label:'Beijing, China',terms:['beijing']}]:[{value:'hz',label:'杭州'},{value:'bj',label:'北京'},{value:'ny',label:'纽约'}];
 const search=(id,label,value,options,onChange,disabled=false)=><div className="field"><label htmlFor={id}>{label}</label><AsyncSelect inputId={id} name={id} classNamePrefix={new URL(location.href).searchParams.get('prefix')??'select'} isMulti={new URL(location.href).searchParams.has('multi')} aria-label={label} aria-required={true} formatOptionLabel={o=>o.campus?`${o.label} — ${o.campus}`:o.label} isDisabled={disabled} value={options.find(o=>o.value===value)??null} onChange={o=>{onChange(o?.value??'');if(window.rejectSelection)setTimeout(()=>onChange(''),100);}} loadOptions={load(id,options)} isOptionDisabled={o=>!!o.isDisabled} menuPortalTarget={document.body} styles={{menuPortal:base=>({...base,zIndex:30})}} placeholder="输入后选择" noOptionsMessage={()=>'没有匹配项'} loadingMessage={()=>'正在搜索…'}/></div>;
 return <main><h1>申请资料 / 异步搜索选择</h1><p>独立 React Select 组件样本，输入文本不代表选中实体。</p><form onSubmit={e=>{e.preventDefault();window.submissionCount++;}}>
 <label>Email address<input type="email" required value={data.email} onChange={e=>set('email',e.target.value)}/></label>
 <label>Applicant name<input required value={data.fullName} onChange={e=>set('fullName',e.target.value)}/></label>
 <label>Country of residence<select required value={data.country} onChange={e=>set('country',e.target.value)}><option value="">请选择</option><option value="cn">中国</option><option value="us">美国</option></select></label>
 {search('city-'+data.country,'Preferred office city',data.city,cityOptions,v=>set('city',v))}
 <label>Qualification level<select required value={data.degree} onChange={e=>set('degree',e.target.value)}><option value="">请选择</option><option value="ug">本科</option><option value="pg">硕士</option></select></label>
 {data.schools.map((s,i)=><fieldset key={i}><legend>Education {i+1}</legend>{search('school-'+i,'Institution',s.school,schools,value=>setData(d=>({...d,schools:d.schools.map((s,j)=>i===j?{...s,school:value}:s)})))}<label>Subject<input required value={s.major} onChange={e=>setData(d=>({...d,schools:d.schools.map((s,j)=>i===j?{...s,major:e.target.value}:s)}))}/></label></fieldset>)}
 <button type="button" onClick={()=>setData(d=>({...d,schools:[...d.schools,{school:'',major:''}]}))}>Add education</button>
 <label>Personal statement<textarea required value={data.summary} onChange={e=>set('summary',e.target.value)}/></label>{aliases&&<label>Earliest available start date<input type="date" required value={data.availableFrom} onChange={e=>set('availableFrom',e.target.value)}/></label>}<button type="submit">Submit application</button></form></main>;
}
window.submissionCount=0;window.searchRequests=[];
createRoot(document.getElementById('root')).render(<App/>);
