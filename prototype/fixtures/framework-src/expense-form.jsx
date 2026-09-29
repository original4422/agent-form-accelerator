// Owned expense draft using the unmodified MIT SurveyJS renderer.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Model} from 'survey-core';
import {Survey} from 'survey-react-ui';
import 'survey-core/survey-core.min.css';
const model=new Model({title:'Fictional travel reimbursement',showQuestionNumbers:'off',showNavigationButtons:false,clearInvisibleValues:'onHidden',textUpdateMode:'onBlur',elements:[
 {type:'html',name:'instructions',html:'<p>Prepare a draft only. Text fields save when you leave them. Wait for Draft saved before editing another field. Choose the travel mode before filling costs. Rail reimburses the fare; personal car reimburses GBP 0.50 per kilometre plus parking. No receipt upload or submission is required.</p>'},
 {type:'text',name:'employee',title:'Employee name',isRequired:true},
 {type:'text',name:'purpose',title:'Business purpose',isRequired:true},
 {type:'text',name:'date',title:'Travel date',inputType:'date',isRequired:true},
 {type:'radiogroup',name:'mode',title:'Travel mode',isRequired:true,choices:[{value:'rail',text:'Rail'},{value:'car',text:'Personal car'}]},
 {type:'text',name:'fare',title:'Rail fare (GBP)',inputType:'number',min:0,step:0.01,isRequired:true,visibleIf:"{mode} = 'rail'"},
 {type:'text',name:'kilometres',title:'Distance (km)',inputType:'number',min:0,step:0.1,isRequired:true,visibleIf:"{mode} = 'car'"},
 {type:'text',name:'registration',title:'Vehicle registration',isRequired:true,visibleIf:"{mode} = 'car'"},
 {type:'text',name:'parking',title:'Parking (GBP)',inputType:'number',min:0,step:0.01,isRequired:true,visibleIf:"{mode} = 'car'"},
 {type:'comment',name:'note',title:'Additional explanation'},
 {type:'html',name:'feedback',html:'<div role="status" id="save-status">Draft saved.</div><div role="status" id="total"></div>'}
]});
let root,status,total;
const renderSaved=data=>{total.textContent=data.totalPence===null?'Total unavailable until travel costs are entered.':`Saved reimbursement total: GBP ${(data.totalPence/100).toFixed(2)}`;};
const initial=await(await fetch('/draft')).json();model.data=initial.draft;let accepted=initial.draft;
model.onAfterRenderSurvey.add(()=>{root=document.querySelector('form');status=document.getElementById('save-status');total=document.getElementById('total');root.setAttribute('aria-busy','false');renderSaved(initial);root.addEventListener('input',event=>{const el=event.target;if(!el.matches('input:not([type=radio]),textarea'))return;const key=el.closest('[data-name]')?.getAttribute('data-name'),value=el.type==='number'?Number(el.value):el.value;status.textContent=value===accepted[key]?(pending?'Saving draft…':'Draft saved.'):'Unsaved changes. Leave the edited field to save.';});});
let queue=Promise.resolve(),pending=0;
model.onValueChanged.add(()=>{
 const draft=structuredClone(model.data);pending++;root.setAttribute('aria-busy','true');status.textContent='Saving draft…';
 queue=queue.then(async()=>{
  const response=await fetch('/draft',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(draft)});const result=await response.json();
  if(!response.ok)throw Error(result.error);accepted=result.draft;renderSaved(result);
 }).then(()=>{pending--;if(!pending){root.setAttribute('aria-busy','false');status.textContent='Draft saved.';}},error=>{pending--;root.setAttribute('aria-busy',String(pending>0));status.textContent=`Save rejected: ${error.message}`;});
});
createRoot(document.getElementById('survey')).render(<Survey model={model}/>);
