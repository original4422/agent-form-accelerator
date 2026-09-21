// Narrow public-DOM adapter for the observed Ashby Yes/No component.
// aria-pressed alone is insufficient. No React internals or applicant answers.
export function ashbyYesNoState(ref) {
 const el=globalThis.__afaPrototype?.nodes.get(ref)?.el;
 const visible=n=>!!n?.isConnected&&!!n.getClientRects().length&&!n.closest('[hidden],[inert],[aria-hidden="true"]')&&getComputedStyle(n).display!=='none'&&getComputedStyle(n).visibility!=='hidden';
 if(!visible(el)||!el.matches('button.ashby-application-form-input-yesno-option[aria-pressed]'))return null;
 const root=el.parentElement,entry=root?.parentElement;
 if(!root?.classList.contains('ashby-application-form-input-yesno')||!entry?.classList.contains('ashby-application-form-field-entry'))return null;
 const buttons=[...root.querySelectorAll('button')],inputs=[...root.querySelectorAll('input')],labels=[...entry.children].filter(n=>n.tagName==='LABEL'&&visible(n));
 if(buttons.length!==2||inputs.length!==1||labels.length!==1||inputs[0].type!=='checkbox'||visible(inputs[0]))return null;
 const label=labels[0],fieldPath=entry.getAttribute('data-field-path');
 if(!fieldPath||inputs[0].name!==fieldPath||label.htmlFor!==fieldPath)return null;
 const name=n=>((n.getAttribute('aria-labelledby')??'').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id)?.textContent??'').join(' ')||n.getAttribute('aria-label')||n.innerText).replace(/\s+/g,' ').trim();
 const names=buttons.map(name),question=name(label);
 if(!question||names.some(n=>!n)||new Set(names).size!==2)return null;
 if(buttons.some(b=>b.parentElement!==root||!visible(b)||!b.classList.contains('ashby-application-form-input-yesno-option')||
   !['true','false'].includes(b.getAttribute('aria-pressed'))||b.type==='reset'||(b.type!=='button'&&b.form)||
   ['formaction','formmethod','popovertarget','commandfor'].some(a=>b.hasAttribute(a))))return null;
 if(buttons.map(b=>b.getAttribute('data-option')).sort().join(',')!=='no,yes')return null;
 const states=buttons.map(b=>b.getAttribute('aria-pressed')==='true'),selected=states[buttons.indexOf(el)],selectedCount=states.filter(Boolean).length;
 return {ref,adapter:'ashby-yesno-v1',selected,selectedCount,valid:selectedCount<=1,
   disabled:el.matches(':disabled')||!!el.closest('[aria-disabled="true"]'),
   identity:JSON.stringify([fieldPath,label.htmlFor,question,buttons.map((b,i)=>[names[i],b.getAttribute('data-option'),b.type,b.getAttribute('type'),b.getAttribute('form'),b.form?.id??null,b.getAttribute('aria-labelledby'),b.getAttribute('aria-label')])])};
}
