import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import AsyncSelect from 'react-select/async';
// Experimental retrieval variation, not a replica of a recruitment platform.
// Labels are identical across pages, but catalog indexing differs independently.
const reverse=location.pathname.endsWith('query-catalog-b.html');
const catalog={home:[{value:'osaka',label:'Osaka, Japan',terms:reverse?['osaka']:['大阪']},{value:'tokyo',label:'Tokyo, Japan',terms:reverse?['tokyo']:['东京']}],office:[{value:'suzhou',label:'Suzhou, Jiangsu, China',terms:reverse?['苏州']:['suzhou']},{value:'suzhou-other',label:'Suzhou, Anhui, China',terms:reverse?['宿州']:['suzhou']} ]};
function App(){
 const [data,setData]=useState({name:'',email:'',home:'',office:'',statement:'',date:''});
 const set=(k,v)=>setData(d=>({...d,[k]:v}));
 useEffect(()=>{window.applicationState=structuredClone(data);},[data]);
 const choice=(key,label)=><div className="field"><label htmlFor={key}>{label}</label><AsyncSelect inputId={key} aria-label={label} classNamePrefix="select" value={catalog[key].find(o=>o.value===data[key])??null} onChange={o=>set(key,o?.value??'')} loadOptions={async query=>{window.searchRequests.push({key,query});await new Promise(r=>setTimeout(r,300));return catalog[key].filter(o=>o.terms.some(t=>t.includes(query.trim().toLowerCase())));}} placeholder="Search" noOptionsMessage={()=>'No matching items'}/></div>;
 return <main><h1>Candidate details</h1><form onSubmit={e=>{e.preventDefault();window.submissionCount++;}}><label>Full name<input required value={data.name} onChange={e=>set('name',e.target.value)}/></label><label>Email<input type="email" required value={data.email} onChange={e=>set('email',e.target.value)}/></label>{choice('home','Home city')}{choice('office','Preferred office')}<label>Introduction<textarea required value={data.statement} onChange={e=>set('statement',e.target.value)}/></label><label>Earliest available start date<input type="date" required value={data.date} onChange={e=>set('date',e.target.value)}/></label><button type="submit">Send application</button></form></main>;
}
window.submissionCount=0;window.searchRequests=[];createRoot(document.getElementById('root')).render(<App/>);
