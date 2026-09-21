import React,{useEffect,useState} from 'react';import{createRoot}from'react-dom/client';import Select from'react-select';
const options=[{value:'us',label:'United States +1'},{value:'ca',label:'Canada +1'}];window.applicationState={country:null,phone:''};window.submissionCount=0;
function App(){const[country,setCountry]=useState(null),[phone,setPhone]=useState('');
 useEffect(()=>{window.applicationState={country:country?.value??null,phone};},[country,phone]);
 const change=o=>{setCountry(o);if(window.swapCountry)setTimeout(()=>setCountry(options[1]),60);};
 const render=(o,{context})=><><span className={'iti__flag iti__'+(window.duplicateFlag?'us':o.value)} style={{display:'inline-block',width:16,height:12,background:o.value==='us'?'navy':'red'}}/>{context==='value'?'+1':o.label}</>;
 return <main style={{width:600,margin:40}}><form onSubmit={e=>{e.preventDefault();window.submissionCount++;}}><label htmlFor="country">Telephone country</label><Select inputId="country" name="country" aria-label="Telephone country" required classNamePrefix="select" options={options} value={country} onChange={change} formatOptionLabel={render}/><label>Phone<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} onBlur={()=>{if(phone==='2025550147')setPhone('(202) 555-0147');}}/></label><button type="submit">Submit</button></form></main>;
}createRoot(document.getElementById('root')).render(<App/>);
