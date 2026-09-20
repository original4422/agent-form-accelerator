// Strong warm-template baseline. A reusable generic script, NOT learned per case.
// Preparation/authoring cost is excluded, just as executor development is excluded.
export const cachedNativeScript = `(async () => {
  const norm = s => String(s ?? '').replace(/\\s+/g, ' ').trim();
  const visible = el => el.isConnected && el.getClientRects().length && !el.closest('[hidden],[inert],[aria-hidden="true"]');
  const group = el => norm(el.closest('fieldset')?.querySelector('legend')?.textContent);
  const label = el => norm([...el.labels ?? []].map(l => l.textContent).join(' ') || el.getAttribute('aria-label'));
  const find = fact => [...document.querySelectorAll('input,textarea,select')].filter(el => visible(el) && label(el) === fact.label && group(el) === fact.group);
  const wait = async predicate => { const until=Date.now()+1000; while(!predicate()) { if(Date.now()>until)throw Error('Not ready'); await new Promise(r=>setTimeout(r,25)); } };
  for (const expansion of expansions) if (![...document.querySelectorAll('fieldset')].some(el => norm(el.querySelector('legend')?.textContent)===expansion.expectGroup)) {
    const controls=[...document.querySelectorAll('button[type=button]')].filter(el=>visible(el) && norm(el.textContent)===expansion.label);
    if(controls.length!==1)throw Error('Ambiguous or missing add button'); controls[0].click();
    await wait(()=>[...document.querySelectorAll('fieldset')].some(el=>norm(el.querySelector('legend')?.textContent)===expansion.expectGroup));
  }
  for(const fact of facts) {
    await wait(()=>{const found=find(fact);return found.length===1 && !found[0].disabled && (found[0].tagName!=='SELECT'||[...found[0].options].some(o=>!o.disabled&&o.value===fact.value));});
    const el=find(fact)[0]; if(el.readOnly || ['password','file','hidden','submit','reset','button'].includes(el.type))throw Error('Unsupported field');
    if(['checkbox','radio'].includes(el.type)){if(el.checked!==fact.value)el.click();}
    else {const proto=el.tagName==='SELECT'?HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;el.focus();Object.getOwnPropertyDescriptor(proto,'value').set.call(el,fact.value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.blur();}
  }
  return {filled:facts.length};
})()`;
