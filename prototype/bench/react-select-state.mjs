// DOM adapter for React Select 5 single-select with its documented classNamePrefix.
// Public DOM only: no React fiber/state, site-specific labels or answer keys.
export function reactSelectState(ref) {
  const el=globalThis.__afaPrototype?.nodes.get(ref)?.el;
  if(!el?.isConnected || !el.matches('input[role="combobox"][aria-autocomplete="list"]'))return null;
  let control=el.parentElement,prefix;
  for(let depth=0;control&&depth<5;depth++,control=control.parentElement){
    const token=[...control.classList].find(c=>c.endsWith('__control'));
    if(token){prefix=token.slice(0,-'__control'.length);break;}
  }
  if(!prefix||!control)return null;
  const byClass=suffix=>[...control.querySelectorAll('*')].filter(n=>n.classList.contains(prefix+suffix));
  const containers=byClass('__value-container');
  if(containers.length!==1||!containers[0].contains(el)||control.querySelectorAll('[role="combobox"]').length!==1)return null;
  if(containers[0].classList.contains(prefix+'__value-container--is-multi')||byClass('__multi-value').length)return null;
  const visible=n=>n.getClientRects().length&&!n.closest('[hidden],[inert],[aria-hidden="true"]')&&getComputedStyle(n).visibility!=='hidden';
  const selected=byClass('__single-value').filter(visible);
  if(selected.length>1)return null;
  // Narrow public rendering adapter: intl-tel-input country flags distinguish
  // identical dial-code displays (e.g. US and Canada both show +1).
  const flags=selected[0]?[...selected[0].querySelectorAll('.iti__flag')].filter(visible):[];
  const codes=flags.length===1?[...flags[0].classList].filter(c=>/^iti__[a-z]{2}$/.test(c)):[];
  const selectionKey=codes.length===1?codes[0]:undefined;
  const displayLabel=selected[0]?.textContent.replace(/\s+/g,' ').trim()??'';
  const choices=globalThis.__afaPrototype.comboboxOptions.get(el)??[];
  const matching=selectionKey?choices.filter(o=>o.selectionKey===selectionKey&&!o.disabled):[];
  const selectedLabel=matching.length===1?matching[0].label:displayLabel;
  const names=n=>n?[n.getAttribute('aria-label'),n.getAttribute('aria-labelledby'),(n.getAttribute('aria-labelledby')??'').split(/\s+/).map(id=>document.getElementById(id)?.textContent)]:null;
  const group=el.closest('fieldset,[role="group"],[role="radiogroup"]');
  const popups=(el.getAttribute('aria-controls')??'').split(/\s+/).map(id=>document.getElementById(id)).filter(n=>n?.getAttribute('role')==='listbox'&&visible(n));
  const popupNotice=suffix=>popups.some(p=>[...p.querySelectorAll('*')].some(n=>n.classList.contains(prefix+suffix)&&visible(n)));
  return {ref,adapter:'react-select-single-v5',selectedLabel,displayLabel,selectionKey,query:el.value,
    loading:byClass('__loading-indicator').length>0||!!control.closest('[aria-busy="true"]')||popupNotice('__menu-notice--loading'),
    emptyResult:popupNotice('__menu-notice--no-options'),
    expanded:el.getAttribute('aria-expanded')==='true',controls:el.getAttribute('aria-controls'),
    identity:JSON.stringify([prefix,el.tagName,el.type,el.name,el.getAttribute('role'),names(el),[...el.labels??[]].map(n=>n.textContent),names(group),group?.querySelector('legend')?.textContent])};
}
