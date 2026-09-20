import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as Select from '@radix-ui/react-select';
function Choice({label,value,onChange,options,disabled=false,busy=false}) {
  return <div className="field"><span>{label}</span><Select.Root value={value} onValueChange={onChange} disabled={disabled}>
    <Select.Trigger aria-label={label} aria-required="true" aria-busy={busy}><Select.Value placeholder="请选择"/><Select.Icon aria-hidden="true"> ▾</Select.Icon></Select.Trigger>
    <Select.Portal><Select.Content position="popper"><Select.Viewport>{options.map(([key,text,off])=><Select.Item key={key} value={key} disabled={off}><Select.ItemText>{text}</Select.ItemText><Select.ItemIndicator aria-hidden="true"> ✓</Select.ItemIndicator></Select.Item>)}</Select.Viewport></Select.Content></Select.Portal>
  </Select.Root></div>;
}
function App(){
 const [data,setData]=useState({fullName:'',email:'',country:'',city:'',degree:'',schools:[{school:'',major:''}],summary:''});
 const [cities,setCities]=useState([]),[loading,setLoading]=useState(false),[checking,setChecking]=useState(false),[invalid,setInvalid]=useState(false);
 const timer=useRef(), cityTimer=useRef();
 const set=(key,value)=>setData(d=>({...d,[key]:value}));
 useEffect(()=>{window.applicationState=structuredClone(data);window.validationState={checking,invalid,loading};},[data,checking,invalid,loading]);
 const email=value=>{set('email',value);setChecking(true);setInvalid(false);clearTimeout(timer.current);timer.current=setTimeout(()=>{setInvalid(value.endsWith('@invalid.example'));setChecking(false);},700);};
 const country=value=>{setData(d=>({...d,country:value,city:''}));setLoading(true);setCities([]);clearTimeout(cityTimer.current);cityTimer.current=setTimeout(()=>{setCities(value==='cn'?[['hz','杭州'],['bj','北京']]:[['ny','纽约'],['sf','旧金山']]);setLoading(false);},240);};
 const school=(index,key,value)=>setData(d=>({...d,schools:d.schools.map((s,i)=>i===index?{...s,[key]:value}:s)}));
 return <main><h1>申请资料 / React + Radix</h1><p>本地虚构表单。选择器、受控输入、延迟校验和重复经历。</p>
 <form onSubmit={e=>{e.preventDefault();window.submissionCount++;}}>
 <label>Applicant name<input name="p1" required value={data.fullName} onChange={e=>set('fullName',e.target.value)}/></label>
 <label>Email address<input name="p2" type="email" required value={data.email} onChange={e=>email(e.target.value)} aria-busy={checking} aria-invalid={invalid}/></label>
 <p role="status">{checking?'正在验证邮箱…':invalid?'邮箱无法接受，请更换。':''}</p>
 <Choice label="Country of residence" value={data.country} onChange={country} options={[["cn","中国"],["us","美国"]]}/>
 <Choice key={data.country} label="Preferred office city" value={data.city} onChange={v=>set('city',v)} disabled={!data.country||loading} busy={loading} options={cities}/>
 <Choice label="Qualification level" value={data.degree} onChange={v=>set('degree',v)} options={[["ug","本科"],["pg","硕士"],["phd","博士",true]]}/>
 {data.schools.map((s,index)=><fieldset key={index}><legend>Education {index+1}</legend><label>Institution<input required value={s.school} onChange={e=>school(index,'school',e.target.value)}/></label><label>Subject<input required value={s.major} onChange={e=>school(index,'major',e.target.value)}/></label></fieldset>)}
 <button type="button" onClick={()=>setData(d=>({...d,schools:[...d.schools,{school:'',major:''}]}))}>Add education</button>
 <label>Personal statement<textarea value={data.summary} onChange={e=>set('summary',e.target.value)} required/></label>
 <button type="submit">Submit application</button></form></main>;
}
window.submissionCount=0;
createRoot(document.getElementById('root')).render(<App/>);
