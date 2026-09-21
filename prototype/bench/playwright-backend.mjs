// Experimental backend substitution. Shares perception and goal coordination,
// but every write is a Playwright action, never executeFormRequest(op='fill').
// No fixture names, field mappings, source IDs, or expected answers live here.
import {executeFormRequest} from '../extension/form-runtime.js';
import {executeGoal} from '../extension/goal-executor.js';
import {reactSelectState} from './react-select-state.mjs';

export function createPlaywrightBackend(page) {
  const observe = async request => {
    const result = await page.evaluate(executeFormRequest, request);
    if (result.error) throw new Error(result.error);
    for(const field of result.fields??[])if(field.kind==='unsupported-combobox') {
      const state=await page.evaluate(reactSelectState,field.ref);
      if(state)Object.assign(field,{kind:'autocomplete',supported:true,adapter:state.adapter,value:state.selectedLabel,
        query:state.query,pending:field.pending||state.loading,valid:field.valid&&!state.query&&!state.expanded,
        options:await page.evaluate(ref=>globalThis.__afaPrototype.comboboxOptions.get(globalThis.__afaPrototype.nodes.get(ref)?.el),field.ref)});
    }
    return result;
  };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const until = async (test, deadline) => {
    while (!(await test())) {
      if (Date.now() >= deadline) throw new Error('CONTROL_NOT_READY');
      await pause(20);
    }
  };
  const handleFor = async ref => {
    const handle = await page.evaluateHandle(ref => globalThis.__afaPrototype.nodes.get(ref)?.el, ref);
    const element = handle.asElement();
    if (!element) { await handle.dispose(); throw new Error('STALE_OR_MISSING_FIELD'); }
    return element;
  };
  const selectCombo = async (el, expected, request) => {
    if (typeof expected !== 'string' || !expected || expected.length > 250) throw new Error('Expected exact option label');
    // Background becomes aria-hidden while some portals are open, so a full
    // visible snapshot cannot validate this transition. Retain a conservative
    // semantic fingerprint and recheck it before choosing an option.
    const semanticIdentity = el => {
      const names = node => node ? [node.getAttribute('aria-label'),node.getAttribute('aria-labelledby'),
        (node.getAttribute('aria-labelledby') ?? '').split(/\s+/).map(id=>document.getElementById(id)?.textContent)] : null;
      const group=el.closest('fieldset,[role="group"],[role="radiogroup"]');
      return JSON.stringify([el.tagName,el.type,el.name,el.getAttribute('role'),names(el),
        [...el.labels ?? []].map(n=>n.textContent),names(group),group?.querySelector('legend')?.textContent]);
    };
    const identity = await el.evaluate(semanticIdentity);
    const deadline = Math.min(Date.now() + 1000, request.deadline ?? Infinity);
    let popup;
    try {
      if (await el.getAttribute('aria-expanded') !== 'true') await el.press('ArrowDown', {timeout:1000});
      await until(async () => {
        const handle = await el.evaluateHandle(el => {
          const ids = (el.getAttribute('aria-controls') ?? '').split(/\s+/).filter(Boolean);
          const candidates = ids.map(id => document.getElementById(id)).filter(n => n && n.getAttribute('role') === 'listbox' && n.getClientRects().length && !n.closest('[hidden],[inert],[aria-hidden="true"]'));
          if (candidates.length > 1) throw new Error('AMBIGUOUS_COMBOBOX_POPUP');
          const n = candidates[0];
          return n && !n.closest('[aria-busy="true"]') && n.querySelector('[role="option"]') ? n : null;
        });
        popup = handle.asElement();
        if (!popup) await handle.dispose();
        return !!popup;
      }, deadline);
      if (await popup.getAttribute('aria-multiselectable') === 'true') throw new Error('UNSUPPORTED_MULTISELECT');
      const choices = await popup.evaluate(popup => [...popup.querySelectorAll('[role="option"]')].map((el, index) => {
        const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
        const label = clean((el.getAttribute('aria-labelledby') ?? '').split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ') || el.getAttribute('aria-label') || el.innerText);
        return {index, label, value:label, disabled:el.matches(':disabled') || !!el.closest('[aria-disabled="true"]'), visible:!!el.getClientRects().length && !el.closest('[hidden],[inert],[aria-hidden="true"]')};
      }));
      await el.evaluate((el, choices) => globalThis.__afaPrototype.comboboxOptions.set(el, choices.filter(o => o.visible).map(({label,value,disabled}) => ({label,value,disabled}))), choices);
      const matches = choices.filter(o => o.visible && !o.disabled && o.label === expected);
      if (matches.length !== 1) throw new Error('OPTION_MISSING_OR_AMBIGUOUS');
      if (page.url() !== request.url || await el.evaluate(semanticIdentity) !== identity || !(await el.evaluate(el => el.isConnected && !el.matches(':disabled') && !el.closest('[aria-disabled="true"]')))) throw new Error('FIELD_CHANGED');
      const options = await popup.$$('[role="option"]');
      try { await options[matches[0].index].press('Enter', {timeout:1000}); }
      finally { await Promise.all(options.map(o => o.dispose())); }
      await until(async () => await el.getAttribute('aria-expanded') !== 'true', deadline);
    } finally {
      if (await el.getAttribute('aria-expanded').catch(() => null) === 'true') {
        await (popup ?? el).press('Escape', {timeout:300}).catch(() => {});
      }
      await popup?.dispose();
    }
  };
  const selectAutocomplete = async (el, field, expected, request, {query=expected,discoverOnly=false}={}) => {
    if(typeof expected!=='string'||!expected||expected.length>250)throw new Error('Expected exact option label');
    const initial=await page.evaluate(reactSelectState,field.ref);
    if(!initial)throw new Error('UNSUPPORTED_AUTOCOMPLETE');
    const deadline=Math.min(Date.now()+1500,request.deadline??Infinity);
    let popup;
    try {
      await el.fill(query,{timeout:1000});
      if(await el.getAttribute('aria-expanded')!=='true')await el.press('ArrowDown',{timeout:1000});
      await until(async()=>{
        const state=await page.evaluate(reactSelectState,field.ref);
        if(!state||state.identity!==initial.identity||page.url()!==request.url)throw new Error('FIELD_CHANGED');
        if(state.loading)return false;
        const handle=await el.evaluateHandle(el=>{
          const ids=(el.getAttribute('aria-controls')??'').split(/\s+/).filter(Boolean);
          const candidates=ids.map(id=>document.getElementById(id)).filter(n=>n?.getAttribute('role')==='listbox'&&n.getClientRects().length&&!n.closest('[aria-hidden="true"],[hidden],[inert]'));
          if(candidates.length>1)throw new Error('AMBIGUOUS_COMBOBOX_POPUP');return candidates[0]??null;
        });
        popup=handle.asElement();if(!popup)await handle.dispose();return !!popup;
      },deadline);
      if(await popup.getAttribute('aria-multiselectable')==='true')throw new Error('UNSUPPORTED_MULTISELECT');
      const choices=await popup.evaluate(p=>[...p.querySelectorAll('[role="option"]')].map((n,index)=>({index,label:n.textContent.replace(/\s+/g,' ').trim(),disabled:n.getAttribute('aria-disabled')==='true',visible:!!n.getClientRects().length&&!n.closest('[hidden],[inert],[aria-hidden="true"]')})).filter(o=>o.visible));
      await el.evaluate((el,choices)=>globalThis.__afaPrototype.comboboxOptions.set(el,choices.map(({label,disabled})=>({label,value:label,disabled}))),choices);
      if(discoverOnly)return choices.map(({label,disabled})=>({label,disabled}));
      const found=choices.filter(o=>!o.disabled&&o.label===expected);
      if(found.length!==1)throw new Error('OPTION_MISSING_OR_AMBIGUOUS');
      const state=await page.evaluate(reactSelectState,field.ref);
      if(!state||state.identity!==initial.identity||state.loading||page.url()!==request.url||!(await el.isEnabled()))throw new Error('FIELD_CHANGED');
      const options=await popup.$$('[role="option"]');
      try{await options[found[0].index].click({timeout:1000});}finally{await Promise.all(options.map(o=>o.dispose()));}
      await until(async()=>{
        const current=await page.evaluate(reactSelectState,field.ref);
        if(!current||current.identity!==initial.identity)throw new Error('FIELD_CHANGED');
        return !current.loading&&!current.expanded&&!current.query&&current.selectedLabel===expected;
      },deadline);
    }finally{
      if(await el.getAttribute('aria-expanded').catch(()=>null)==='true')await el.press('Escape',{timeout:300}).catch(()=>{});
      await el.evaluate(el=>el.blur()).catch(()=>{});
      await popup?.dispose();
    }
  };
  const fill = async request => {
    const started = performance.now();
    const initial = await observe({op:'validate',snapshot:request.snapshot,url:request.url});
    let current = initial;
    const results = [], written = [];
    for (const action of request.actions) {
      let el;
      try {
        if (request.deadline && Date.now() >= request.deadline) throw new Error('GOAL_DEADLINE');
        // Full snapshot validation is conservative: if an earlier action changed
        // a dependent node, return to the shared planner for a fresh observation.
        current = await observe({op:'validate',snapshot:current.snapshot,url:request.url});
        const field = [...initial.fields,...initial.controls].find(f => f.ref === action.ref);
        if (!field) throw new Error('STALE_OR_MISSING_FIELD');
        if (!field.supported) throw new Error('UNSUPPORTED_CONTROL');
        el = await handleFor(action.ref);
        if (!await el.isVisible()) throw new Error('STALE_OR_MISSING_FIELD');
        if (await el.evaluate(el => el.matches(':disabled') || el.readOnly || !!el.closest('[aria-disabled="true"]') || el.getAttribute('aria-readonly') === 'true')) throw new Error('NOT_EDITABLE');
        if (action.op === 'expand' && field.kind === 'add-row') {
          await el.click({timeout:1000}); results.push({ref:action.ref,status:'expanded'}); break;
        }
        if (action.op !== 'set' || field.kind === 'add-row') throw new Error('Expected set action');
        let expected = action.value;
        if (field.kind === 'autocomplete') await selectAutocomplete(el,field,expected,request,{query:action.query??expected});
        else if (field.kind === 'combobox') await selectCombo(el, expected, request);
        else if (['radio','checkbox'].includes(field.kind)) {
          if (typeof expected !== 'boolean' || (field.kind === 'radio' && !expected)) throw new Error('Expected boolean; radio may only be selected');
          await el.setChecked(expected, {timeout:1000});
        } else if (field.kind === 'select') {
          const options = field.options.filter(o => !o.disabled && (o.value === expected || o.label === expected));
          if (options.length !== 1) throw new Error('OPTION_MISSING_OR_AMBIGUOUS');
          expected = options[0].value; await el.selectOption(expected, {timeout:1000});
        } else {
          if (typeof expected !== 'string') throw new Error('Expected text');
          await el.fill(expected, {timeout:1000}); await el.evaluate(el => el.blur());
        }
        results.push({ref:action.ref,status:'written'}); written.push({ref:action.ref,expected});
      } catch (e) {
        const reason = /STALE_SNAPSHOT|FIELD_CHANGED/.test(e.message) ? 'FIELD_CHANGED' : e.message;
        results.push({ref:action.ref,status:'blocked',reason}); break;
      } finally { await el?.dispose(); }
    }
    // Same quiet-window rule used by the original primitive; actual completion
    // still depends on the shared planner's explicit pending/invalid checks.
    await page.evaluate(async deadline => {
      let changes=0; const observer=new MutationObserver(() => changes++);
      observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true});
      try { const end=Math.min(Date.now()+600,deadline ?? Infinity); while(Date.now()<end){const before=changes;await new Promise(r=>setTimeout(r,35));if(changes===before)break;} }
      finally { observer.disconnect(); }
    }, request.deadline);
    const observation = await observe({op:'inspect'});
    for (const {ref,expected} of written) {
      const result=results.find(r=>r.ref===ref),field=observation.fields.find(f=>f.ref===ref);
      if (!field) Object.assign(result,{status:'needs-review',reason:'FIELD_REPLACED'});
      else if (field.value!==expected) Object.assign(result,{status:'needs-review',reason:'VALUE_NOT_RETAINED'});
      else if (field.pending) result.status='pending-validation';
      else if (field.valid===false) Object.assign(result,{status:'needs-review',reason:'HTML_VALIDATION_FAILED'});
      else result.status='verified';
    }
    for (const a of request.actions) if (!results.some(r=>r.ref===a.ref)) results.push({ref:a.ref,status:'not-attempted'});
    return {results,observation,elapsedMs:performance.now()-started};
  };
  const request = async r => {
    if(r.op==='discover'){
      if(!Array.isArray(r.queries)||!r.queries.length||r.queries.length>12)throw new Error('INVALID_SEARCH_QUERIES');
      const initial=await observe({op:'validate',snapshot:r.snapshot,url:r.url}),searches=[],deadline=Date.now()+8000;
      let observation=initial;
      for(const query of r.queries){
        let el;
        try{
          if(Date.now()>=deadline)throw new Error('SEARCH_DEADLINE');
          observation=await observe({op:'validate',snapshot:observation.snapshot,url:r.url});
          const prior=initial.fields.find(f=>f.ref===query.ref),field=observation.fields.find(f=>f.ref===query.ref);
          if(!field||!['autocomplete','select'].includes(field.kind)||field.disabled||!prior||field.label!==prior.label||field.group!==prior.group)throw new Error('FIELD_CHANGED');
          if(typeof query.query!=='string'||!query.query.trim()||query.query.length>120)throw new Error('INVALID_SEARCH_QUERY');
          if(field.kind==='select'){
            const term=query.query.normalize('NFKC').trim().toLowerCase();
            const matches=field.options.filter(o=>o.label.normalize('NFKC').toLowerCase().includes(term));
            searches.push({ref:query.ref,status:'observed',options:matches.slice(0,40),totalMatches:matches.length,truncated:matches.length>40});
            continue;
          }
          el=await handleFor(query.ref);
          const options=await selectAutocomplete(el,field,query.query,{...r,deadline},{query:query.query,discoverOnly:true});
          observation=await observe({op:'inspect'});
          const after=observation.fields.find(f=>f.ref===query.ref);
          if(!after||after.label!==field.label||after.group!==field.group||after.kind!==field.kind)throw new Error('FIELD_CHANGED');
          if(after.value!==field.value)throw new Error('DISCOVERY_CHANGED_SELECTION');
          searches.push({ref:query.ref,status:'observed',options});
        }catch(e){searches.push({ref:query.ref,status:'blocked',reason:e.message,options:[]});observation=await observe({op:'inspect'});}
        finally{await el?.dispose();}
      }
      return {searches,observation};
    }
    if (r.op==='goal') return executeGoal(r,request);
    if (r.op==='inspect'||r.op==='validate') return observe(r);
    if (r.op==='fill') return fill(r);
    throw new Error('UNSUPPORTED_BACKEND_OPERATION');
  };
  return {request};
}
