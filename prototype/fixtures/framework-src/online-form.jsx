import React,{useState,useRef} from 'react';import {createRoot} from 'react-dom/client';import * as Select from '@radix-ui/react-select';import AsyncSelect from 'react-select/async';
const variant=location.pathname.split('/').at(-1),countries=[{value:'uk',label:'United Kingdom'},{value:'ca',label:'Canada'}],degrees=[{value:'master',label:"Master's degree"},{value:'bachelor',label:"Bachelor's degree"}],cities=[{value:'london',label:'London, United Kingdom'},{value:'london-ca',label:'London, Canada'}],schools=[{value:'north-london',label:'Northern Example University — London campus'},{value:'north-york',label:'Northern Example University — York campus'},{value:'south-bristol',label:'Southern Example College — Bristol campus'}];
function App(){
 const [values,setValues]=useState({}),[busy,setBusy]=useState(false),[errors,setErrors]=useState({}),[questions,setQuestions]=useState([]),[rows,setRows]=useState(1);const revision=useRef(0),saved=useRef({}),queue=useRef(Promise.resolve()),pending=useRef(0);
 const local=(key,value)=>setValues(v=>({...v,[key]:value}));
 const save=(key,value)=>{
  pending.current++;setBusy(true);
  queue.current=queue.current.then(async()=>{
   try{if(saved.current[key]===value)return;const r=await fetch('/draft',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({key,value,revision:revision.current})}),body=await r.json();if(!r.ok)throw Error(body.error);revision.current=body.revision;saved.current[key]=value;setQuestions(body.questions);setRows(body.rows);setErrors(e=>({...e,[key]:false}));}
   catch{setErrors(e=>({...e,[key]:true}));}finally{pending.current--;setBusy(pending.current>0);}
  });
  return queue.current;
 };
 const dirty=Object.entries(values).some(([key,value])=>value!==saved.current[key]);
 const text=(key,label,type='text',required=true)=><div className="field" key={key}><label htmlFor={key}>{label}</label>{type==='textarea'?<textarea id={key} required={required} value={values[key]??''} aria-invalid={!!errors[key]} onChange={e=>local(key,e.target.value)} onBlur={e=>save(key,e.target.value)}/>:<input id={key} required={required} type={type} value={values[key]??''} aria-invalid={!!errors[key]} onChange={e=>local(key,e.target.value)} onBlur={e=>save(key,e.target.value)}/>}</div>;
 const choice=(key,label,options,kind)=>{
  const change=value=>{local(key,value);save(key,value);};
  if(variant==='search'&&kind)return <div className="field" key={key}><label htmlFor={key}>{label}</label><AsyncSelect inputId={key} classNamePrefix="online" aria-label={label} aria-required aria-invalid={!!errors[key]} value={options.find(o=>o.value===values[key])??null} onChange={o=>change(o.value)} loadOptions={async q=>{const r=await fetch('/catalog?kind='+kind+'&q='+encodeURIComponent(q));if(!r.ok)throw Error();return r.json();}} menuPortalTarget={document.body}/></div>;
  if(variant==='radix')return <div className="field" key={key}><span>{label}</span><Select.Root value={values[key]??''} onValueChange={change}><Select.Trigger aria-label={label} aria-required aria-invalid={!!errors[key]}><Select.Value placeholder="Choose"/></Select.Trigger><Select.Portal><Select.Content position="popper"><Select.Viewport>{options.map(o=><Select.Item key={o.value} value={o.value}><Select.ItemText>{o.label}</Select.ItemText></Select.Item>)}</Select.Viewport></Select.Content></Select.Portal></Select.Root></div>;
  return <div className="field" key={key}><label htmlFor={key}>{label}</label><select id={key} required value={values[key]??''} aria-invalid={!!errors[key]} onChange={e=>change(e.target.value)}><option value="">Choose</option>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>;
 };
 return <main><h1>Application draft</h1><form aria-busy={busy} onSubmit={e=>{e.preventDefault();fetch('/submit',{method:'POST'});}}><p>Fictional test application. Text fields save when you leave them. Check that the status says “Changes saved.” when finished. Wait until saving finishes before editing another field. Complete both education records. Do not submit.</p>
 {choice('country','Country of residence',countries)}{questions.map(q=>choice(q.key,q.label,q.options))}
 {text('name','Applicant name')}{text('email','Email address','email')}{choice('city','Preferred office city',cities,'city')}{choice('degree','Qualification level',degrees)}{text('available','Earliest available start date','date')}
 {Array.from({length:rows},(_,i)=><fieldset key={i}><legend>Education {i+1}</legend>{choice('school'+i,'Institution',schools,'school')}{text('major'+i,'Subject')}</fieldset>)}
 {rows<2&&<button type="button" onClick={()=>save('rows',2)}>Add education</button>}
 {text('summary','Personal statement','textarea')}
 <section><p>Answer exactly one of the following three questions. Leave the other two empty.</p>
 {['decision','challenge','lesson'].map((key,i)=>text(key,['A project decision','A challenge to an existing requirement','A lesson learned'][i],'textarea',false))}</section>
 <p role="status">{busy?'Saving changes…':Object.values(errors).some(Boolean)?'Some changes were rejected.':dirty?'Unsaved changes. Leave the edited field to save.':'Changes saved.'}</p><button type="submit">Submit application</button>
 </form></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
