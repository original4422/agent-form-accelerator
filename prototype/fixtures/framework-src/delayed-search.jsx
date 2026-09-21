// Independent real React Select fixture for a delayed loading notice outside
// the control. No site code copied; only the observed public state sequence.
import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import Select from 'react-select';
window.applicationState={degree:null};window.submissionCount=0;window.lookupLog=[];
function App(){
 const [query,setQuery]=useState(''),[options,setOptions]=useState([]),[loading,setLoading]=useState(false),[selected,setSelected]=useState(null);
 useEffect(()=>{
  window.lookupState={pending:!!query};setLoading(false);setOptions([]);
  if(!query)return;
  window.lookupLog.push(query);
  const start=setTimeout(()=>setLoading(true),250);
  const done=setTimeout(()=>{if(window.hangSearch)return;setOptions(window.emptySearch?[]:[{label:'Master of Science',value:'msc'}].filter(o=>o.label.toLowerCase().includes(query.toLowerCase())));setLoading(false);window.lookupState={pending:false};},650);
  return()=>{clearTimeout(start);clearTimeout(done);};
 },[query]);
 useEffect(()=>{window.applicationState={degree:selected?.value??null};},[selected]);
 return <main style={{maxWidth:600,margin:40}}><h1>Delayed option readiness</h1><form onSubmit={e=>{e.preventDefault();window.submissionCount++;}}>
  <label htmlFor="degree">Qualification</label><Select inputId="degree" name="degree" aria-label="Qualification" required classNamePrefix="select" inputValue={query} onInputChange={v=>setQuery(v)} value={selected} options={options} onChange={setSelected} isLoading={loading} components={{LoadingIndicator:()=>null}}/>
  <button type="submit">Submit</button></form></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
