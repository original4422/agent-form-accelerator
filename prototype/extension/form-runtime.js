// PROTOTYPE. This function is serialized into the extension's isolated world.
// It never evaluates model-generated code or accepts arbitrary CSS selectors.
export async function executeFormRequest(request) {
  try {
  const started = performance.now();
  const state = globalThis.__afaPrototype ??= {
    documentId: crypto.randomUUID(), nodes: new Map(), ids: new WeakMap(), next: 0,
    snapshot: null, busy: false,
  };
  const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
  const visible = (el) => el.isConnected && el.getClientRects().length > 0 &&
    !el.closest('[hidden],[inert],[aria-hidden="true"]') &&
    getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
  // A conservative subset of accessible-name computation, not a full AccName implementation.
  // Work on live nodes so display:none/aria-hidden helper text cannot pollute labels.
  const textOf = (root, includeHidden = false, omit = new Set()) => {
    if (!root) return '';
    const walk = (node) => {
      if (omit.has(node)) return '';
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (node.nodeType !== Node.ELEMENT_NODE) return '';
      if (node !== root && node.matches('input,select,textarea,button,[role="combobox"],script,style')) return '';
      if (!includeHidden && (node.hidden || node.getAttribute('aria-hidden') === 'true' ||
          getComputedStyle(node).display === 'none' || getComputedStyle(node).visibility === 'hidden')) return '';
      return Array.from(node.childNodes).map(walk).join(' ');
    };
    return clean(walk(root));
  };
  const ariaName = (el) => clean((el.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean)
    .map((id) => { const ref = document.getElementById(id); return textOf(ref, !!ref && !visible(ref)); }).join(' ') || el.getAttribute('aria-label'));
  // Some forms render question text beside an unlabeled control. Use the
  // nearest single-control container only; never borrow a multi-field heading.
  // This is a visible contextual name, not a full accessible-name computation.
  const contextualName = (el) => {
    if(!['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||['checkbox','radio','file','password'].includes(el.type))return '';
    for(let node=el.parentElement,depth=0;node&&depth<4&&!['FORM','BODY','HTML'].includes(node.tagName);node=node.parentElement,depth++){
      const peers=Array.from(node.querySelectorAll('input,textarea,select,[role="combobox"]')).filter(p=>visible(p)&&p.type!=='hidden');
      if(peers.length!==1||peers[0]!==el)return '';
      const name=textOf(node,false,new Set([el]));
      if(name)return name;
    }
    return '';
  };
  const label = (el) => clean(ariaName(el) || Array.from(el.labels ?? []).map((l) => textOf(l)).join(' ') ||
    (el.tagName === 'BUTTON' ? textOf(el) : '') || contextualName(el) || el.getAttribute('placeholder') || el.name || el.id).slice(0, 250);
  // Some fieldsets use a visible direct label instead of a legend. Only one
  // unassociated direct label can name the question; option labels cannot.
  const directQuestion = node => {
    const labels=Array.from(node.children).filter(n=>n.tagName==='LABEL'&&!n.control&&visible(n)&&textOf(n));
    return labels.length===1?textOf(labels[0]):'';
  };
  const toggleGroup = el => {
    for(let node=el.parentElement,depth=0;node&&depth<4&&!['FORM','BODY','HTML'].includes(node.tagName);node=node.parentElement,depth++){
      const controls=Array.from(node.querySelectorAll('input,textarea,select,button,[role="combobox"]')).filter(n=>visible(n)&&n.type!=='hidden');
      if(controls.some(n=>n.tagName!=='BUTTON'||!n.hasAttribute('aria-pressed')))return '';
      const question=directQuestion(node);if(question)return question;
    }
    return '';
  };
  const group = (el) => {
    const explicit = el.closest('fieldset,[role="group"],[role="radiogroup"]');
    if (explicit) return clean(ariaName(explicit) || textOf(explicit.querySelector(':scope > legend')) || directQuestion(explicit) || `unlabeled-group:${getRef(explicit)}`).slice(0, 250);
    if(el.tagName==='BUTTON'&&el.hasAttribute('aria-pressed'))return toggleGroup(el).slice(0,250);
    if (!['radio', 'checkbox'].includes(el.type) || !el.name) return '';
    const scope = el.form ?? document;
    const peers = Array.from(scope.querySelectorAll('input')).filter((p) => p.name === el.name && p.type === el.type && visible(p));
    if (peers.length < 2) return '';
    const omitted = new Set(peers.flatMap((p) => [...Array.from(p.labels ?? []), p]));
    for (let node = el.parentElement, level = 0; node && node !== scope && level < 7; node = node.parentElement, level++) {
      if (!peers.every((p) => node.contains(p))) continue;
      const controls = Array.from(node.querySelectorAll('input,select,textarea')).filter(visible);
      if (controls.some((p) => !peers.includes(p))) break;
      const question = textOf(node, false, omitted);
      if (question) return question.slice(0, 250);
    }
    // An opaque but unique group is safer than merging all Yes/No controls.
    return `name:${el.name}`;
  };
  const kind = (el) => {
    if (el.getAttribute('role') === 'combobox' && el.tagName !== 'SELECT') {
      // Only select-only buttons. Editable/autocomplete/tree/grid widgets need
      // a different contract; never treat their text as a selected value.
      return el.tagName === 'BUTTON' && el.type === 'button' &&
        (!el.getAttribute('aria-haspopup') || el.getAttribute('aria-haspopup') === 'listbox')
        ? 'combobox' : 'unsupported-combobox';
    }
    if (el.tagName === 'BUTTON'&&el.hasAttribute('aria-pressed')) return 'unsupported-toggle';
    if (el.tagName === 'BUTTON') return 'add-row';
    if (el.tagName === 'SELECT') return el.multiple ? 'unsupported-multiselect' : 'select';
    if (el.tagName === 'TEXTAREA') return 'textarea';
    return el.type || 'unsupported';
  };
  const supported = new Set(['text', 'email', 'tel', 'url', 'number', 'date', 'month', 'time', 'textarea', 'select', 'combobox', 'checkbox', 'radio', 'add-row']);
  state.comboboxOptions ??= new WeakMap();
  const options = (el) => el.tagName === 'SELECT' ? Array.from(el.options).map((o) => ({value: o.value, label: clean(o.text), disabled: o.disabled})) : state.comboboxOptions.get(el);
  const required = el => !!el.required || el.getAttribute('aria-required')==='true' || (el.type==='radio' && el.closest('[role="radiogroup"]')?.getAttribute('aria-required')==='true');
  const signature = (el) => JSON.stringify([label(el), kind(el), el.name, el.getAttribute('role'),
    group(el), required(el), el.tagName === 'SELECT' ? options(el) : undefined]);
  const pending = (el) => !!el.closest('[aria-busy="true"]');
  const disabled = (el) => el.matches(':disabled') || !!el.closest('[aria-disabled="true"]');
  const valid = (el) => el.validity?.valid !== false && !pending(el) &&
    (!el.getAttribute('aria-invalid') || el.getAttribute('aria-invalid') === 'false');
  const value = (el) => ['password', 'file'].includes(kind(el)) ? undefined :
    ['checkbox', 'radio'].includes(kind(el)) ? el.checked : kind(el)==='unsupported-toggle' ? el.getAttribute('aria-pressed') : kind(el) === 'combobox' ? textOf(el) : el.value;
  const getRef = (el) => {
    if (!state.ids.has(el)) state.ids.set(el, `f${++state.next}`);
    return state.ids.get(el);
  };
  const isAdd = (el) => el.tagName === 'BUTTON' && el.type === 'button' && !el.hasAttribute('aria-pressed') &&
    /^(添加|新增|增加|Add\b)/i.test(label(el));
  // Preserve public explanatory text separately from field names. Containers
  // express observed proximity, not inferred rules or answers.
  const formContext = (nodes) => {
    const entries=Array.from(nodes,([ref,{el}])=>({ref,el})).filter(({el})=>visible(el));
    if(!entries.length)return {data:{blocks:[],truncated:false},signature:'[]'};
    const form=entries[0].el.closest('form');
    let root=form&&entries.every(({el})=>form.contains(el))?form:entries[0].el.parentElement;
    while(root&&!entries.every(({el})=>root.contains(el)))root=root.parentElement;
    root??=document.body;
    const described=new Map();
    for(const {ref,el} of entries)for(const id of (el.getAttribute('aria-describedby')??'').split(/\s+/).filter(Boolean)){
      const node=document.getElementById(id);if(!node)continue;
      if(node.closest('[aria-live],[role="status"],[role="alert"],[role="log"]'))continue;
      // React Select's public classNamePrefix placeholder is attached through
      // aria-describedby and disappears after selection. It is widget state,
      // not a stable question requirement. Do not exclude external help text.
      const placeholder=[...node.classList].find(c=>c.endsWith('__placeholder'));
      if(placeholder&&el.matches('input[role="combobox"][aria-autocomplete="list"]')){
        const prefix=placeholder.slice(0,-'__placeholder'.length),container=node.parentElement;
        if(container?.classList.contains(prefix+'__value-container')&&container.contains(el)&&container.querySelectorAll('[role="combobox"]').length===1)continue;
      }
      if(!described.has(node))described.set(node,[]);described.get(node).push(ref);
    }
    const semantic='h1,h2,h3,h4,h5,h6,[role="heading"],p,li,legend';
    const candidates=[...root.querySelectorAll(semantic)].filter(node=>{
      const outer=node.parentElement?.closest(semantic);
      return visible(node)&&!node.closest('button,select,textarea,[role="option"],[role="listbox"],[role="status"],[role="alert"],[aria-live]')&&!(outer&&root.contains(outer));
    });
    for(const node of described.keys())if(!candidates.includes(node))candidates.push(node);
    const complete=[];
    for(const node of candidates){
      const text=textOf(node,described.has(node)&&!visible(node));if(!text)continue;
      let refs=described.get(node);
      if(!refs){
        for(let container=node.parentElement;container&&root.contains(container);container=container.parentElement){
          refs=entries.filter(({el})=>container.contains(el)).map(({ref})=>ref);if(refs.length)break;
        }
      }
      if(refs?.length)complete.push({text,fieldRefs:refs,relation:described.has(node)?'aria-describedby':'container'});
    }
    let remaining=12000,truncated=false;const blocks=[];
    for(const block of complete){
      if(blocks.length>=128||!remaining){truncated=true;break;}
      const length=Math.min(block.text.length,1200,remaining);if(length<block.text.length)truncated=true;
      blocks.push({...block,text:block.text.slice(0,length)});remaining-=length;
    }
    return {data:{blocks,truncated,scope:'Headings, paragraphs, list items, legends and explicit descriptions near observed fields. Container refs show proximity, not a parsed constraint. Other page text and visual-only rules may be absent.'},signature:JSON.stringify(complete)};
  };
  // Transient public feedback stays separate from stable question requirements.
  // Preserve page wording; an idle aria-busy flag is not a saved-state verdict.
  const formStatus = nodes => {
    const entries=Array.from(nodes,([ref,{el}])=>({ref,el}));
    const refsFor=node=>{
      const described=entries.filter(({el})=>node.id&&(el.getAttribute('aria-describedby')??'').split(/\s+/).includes(node.id)).map(({ref})=>ref);
      if(described.length)return described;
      const owner=node.closest('form,[role="form"]');
      for(let scope=node;scope&&!scope.matches('body,html');scope=scope.parentElement){
        const refs=entries.filter(({el})=>el.closest('form,[role="form"]')===owner&&scope.contains(el)).map(({ref})=>ref);
        if(refs.length)return refs;
        if(scope===owner)break;
      }
      return [];
    };
    const messages=[],busy=[];let truncated=false;
    for(const node of document.querySelectorAll('[role="status"],[role="alert"],[aria-busy]')){
      if(!visible(node))continue;
      const fieldRefs=refsFor(node);if(!fieldRefs.length)continue;
      const role=node.getAttribute('role');
      if(role==='status'||role==='alert'){
        const text=textOf(node);if(text){
          if(messages.length<32){messages.push({role,text:text.slice(0,1200),fieldRefs});if(text.length>1200)truncated=true;}
          else truncated=true;
        }
      }
      const value=node.getAttribute('aria-busy');
      if(value==='true'||value==='false'){
        if(busy.length<32)busy.push({value:value==='true',fieldRefs});else truncated=true;
      }
    }
    return {messages,busy,truncated};
  };
  const contextChanged = () => state.contextSignature!==undefined&&formContext(state.nodes).signature!==state.contextSignature;
  const observe = () => {
    const fields = [], controls = [], nodes = new Map();
    for (const el of document.querySelectorAll('input,textarea,select,[role="combobox"],button')) {
      if (!visible(el) || el.type === 'hidden' || (el.tagName === 'BUTTON' && !isAdd(el) && el.getAttribute('role') !== 'combobox' && !el.hasAttribute('aria-pressed'))) continue;
      if (el.tagName === 'INPUT' && ['submit', 'button', 'reset', 'image'].includes(el.type)) continue;
      const ref = getRef(el), field = {ref, label: label(el), kind: kind(el),
        group: group(el), domId: el.id || undefined,
        required: required(el),
        disabled: disabled(el),
        readOnly: !!el.readOnly, supported: supported.has(kind(el)), valid: valid(el), pending: pending(el), value: value(el), options: options(el)};
      nodes.set(ref, {el, signature: signature(el)});
      (kind(el) === 'add-row' ? controls : fields).push(field);
    }
    state.nodes = nodes;
    const context=formContext(nodes);state.contextSignature=context.signature;
    state.snapshot = crypto.randomUUID();
    return {snapshot: state.snapshot, documentId: state.documentId, url: location.href,
      title: document.title, fields, controls,formContext:context.data,formStatus:formStatus(nodes),
      limitations: {requiredness:'Native required and aria-required only; visual-only markers may be missed.',iframes: document.querySelectorAll('iframe').length,
        shadowRoots: Array.from(document.querySelectorAll('*')).some((el) => !!el.shadowRoot)},
    };
  };
  // A quiet DOM window + final value read-back, not network-idle or a fixed per-field delay.
  const settle = async (root = document.documentElement) => {
    let changes = 0;
    const observer = new MutationObserver(() => { changes++; });
    observer.observe(root, {childList: true, subtree: true, attributes: true});
    const deadline = performance.now() + 600;
    let stable = false;
    while (performance.now() < deadline && (!request.deadline || Date.now() < request.deadline)) {
      const before = changes;
      await new Promise((r) => setTimeout(r, 35));
      if (changes === before) { stable = true; break; }
    }
    observer.disconnect();
    return stable;
  };
  const selectCombobox = async (el, expected) => {
    const initialSignature = signature(el);
    const until = Math.min(Date.now() + 1000, request.deadline ?? Infinity);
    const pause = () => new Promise((r) => setTimeout(r, 20));
    const key = (node, name) => node.dispatchEvent(new KeyboardEvent('keydown', {key: name, code: name, bubbles: true, cancelable: true}));
    let popup;
    try {
      el.focus();
      if (el.getAttribute('aria-expanded') !== 'true') key(el, 'ArrowDown');
      while (Date.now() < until) {
        const ids = (el.getAttribute('aria-controls') ?? '').split(/\s+/).filter(Boolean);
        const candidates = ids.map((id) => document.getElementById(id)).filter((n) => n && visible(n) && n.getAttribute('role') === 'listbox');
        if (candidates.length > 1) throw new Error('AMBIGUOUS_COMBOBOX_POPUP');
        popup = candidates[0];
        if (popup && popup.querySelector('[role="option"]') && !pending(popup)) break;
        await pause();
      }
      if (!popup || !visible(popup) || pending(popup)) throw new Error('COMBOBOX_POPUP_NOT_READY_OR_UNLINKED');
      if (popup.getAttribute('aria-multiselectable') === 'true') throw new Error('UNSUPPORTED_MULTISELECT');
      const choices = Array.from(popup.querySelectorAll('[role="option"]')).filter(visible).map((node) => ({node, label: ariaName(node) || textOf(node), disabled: disabled(node)}));
      state.comboboxOptions.set(el, choices.map(({label, disabled}) => ({label, value: label, disabled})));
      const matches = choices.filter((o) => !o.disabled && o.label === expected);
      if (matches.length !== 1) throw new Error('OPTION_MISSING_OR_AMBIGUOUS');
      if (location.href !== request.url || !el.isConnected || signature(el) !== initialSignature || disabled(el)) throw new Error('FIELD_CHANGED');
      // Keyboard activation still works after real mouse hover; some widgets
      // intentionally ignore click when their last pointer type was a mouse.
      matches[0].node.focus();
      key(matches[0].node, 'Enter');
      while (el.getAttribute('aria-expanded') === 'true' && Date.now() < until) await pause();
      if (el.getAttribute('aria-expanded') === 'true') throw new Error('COMBOBOX_NOT_CLOSED');
    } finally {
      // Restore UI even on an unknown/disabled option; never search unrelated
      // popups or click outside the linked listbox to force a selection.
      if (el.getAttribute('aria-expanded') === 'true') {
        key(popup ?? el, 'Escape');
        const closingDeadline = Math.min(Date.now() + 300, request.deadline ?? Infinity);
        while (el.getAttribute('aria-expanded') === 'true' && Date.now() < closingDeadline) await pause();
      }
    }
  };
  if (request.op === 'validate' || request.op === 'guard') {
    if (request.snapshot !== state.snapshot || request.url !== location.href) throw new Error('STALE_SNAPSHOT: inspect again');
    if(contextChanged())throw new Error('FORM_CONTEXT_CHANGED: inspect again');
    for (const {el, signature: prior} of state.nodes.values()) {
      if (!visible(el) || signature(el) !== prior) throw new Error('FIELD_CHANGED: inspect again');
    }
  }
  // Internal read-only batch guard: keep the full semantic checks above, but
  // do not regenerate/refill a large observation for a yes/no decision.
  if(request.op==='guard'){
    if(state.busy)throw new Error('BUSY: another fill is running');
    // Include new visible controls so a newly inserted question cannot become
    // silently part of a batch whose meaning was decided before it existed.
    for(const el of document.querySelectorAll('input,textarea,select,[role="combobox"],button')){
      if(!visible(el)||el.type==='hidden'||(el.tagName==='BUTTON'&&!isAdd(el)&&el.getAttribute('role')!=='combobox'&&!el.hasAttribute('aria-pressed')))continue;
      if(el.tagName==='INPUT'&&['submit','button','reset','image'].includes(el.type))continue;
      if(!state.nodes.has(state.ids.get(el)))throw new Error('FIELD_CHANGED: new control; inspect again');
    }
    return {snapshot:state.snapshot,documentId:state.documentId,url:location.href,elapsedMs:performance.now()-started};
  }
  if (request.op === 'inspect' || request.op === 'validate') {
    if (state.busy) throw new Error('BUSY: another fill is running');
    return {...observe(), elapsedMs: performance.now() - started};
  }
  if (request.op !== 'fill') throw new Error('Unknown operation');
  if (state.busy) throw new Error('BUSY: another fill is running');
  if (request.snapshot !== state.snapshot || request.url !== location.href) throw new Error('STALE_SNAPSHOT: inspect again');
  if (!Array.isArray(request.actions) || request.actions.length < 1 || request.actions.length > 100) throw new Error('Expected 1–100 actions');
  if (new Set(request.actions.map((a) => a.ref)).size !== request.actions.length) throw new Error('Duplicate field references');
  state.busy = true;
  const results = [], written = [];
  try {
    for (const action of request.actions) {
      if (request.deadline && Date.now() >= request.deadline) break;
      const record = state.nodes.get(action.ref);
      const el = record?.el;
      let error;
      if(contextChanged())error='FORM_CONTEXT_CHANGED';
      else if (!el || !el.isConnected || !visible(el)) error = 'STALE_OR_MISSING_FIELD';
      else if (request.url !== location.href || signature(el) !== record.signature) error = 'FIELD_CHANGED';
      else if (disabled(el) || el.readOnly || el.getAttribute('aria-readonly') === 'true') error = 'NOT_EDITABLE';
      else if (!supported.has(kind(el))) error = 'UNSUPPORTED_CONTROL';
      if (error) {
        results.push({ref: action.ref, status: 'blocked', reason: error});
        // A stale page invalidates the remaining plan: never silently retarget it.
        if (['STALE_OR_MISSING_FIELD', 'FIELD_CHANGED', 'FORM_CONTEXT_CHANGED'].includes(error)) break;
        continue;
      }
      try {
        const type = kind(el);
        if (type === 'add-row') {
          if (action.op !== 'expand' || !isAdd(el)) throw new Error('ONLY_OBSERVED_ADD_BUTTONS');
          el.click();
          await settle();
          results.push({ref: action.ref, status: 'expanded', needsInspection: true});
          break;
        }
        if (action.op !== 'set') throw new Error('Expected set action');
        let expected = action.value;
        if (type === 'combobox') {
          if (typeof expected !== 'string' || !expected || expected.length > 250) throw new Error('Expected exact option label');
          await selectCombobox(el, expected);
        } else if (type === 'checkbox' || type === 'radio') {
          if (typeof expected !== 'boolean' || (type === 'radio' && !expected)) throw new Error('Expected boolean; radio may only be selected');
          if (el.checked !== expected) el.click();
        } else {
          if (typeof expected !== 'string') throw new Error('Expected string value');
          if (expected.length > 20000) throw new Error('Value too long');
          if (type === 'select') {
            const matches = Array.from(el.options).filter((o) => !o.disabled && (o.value === expected || clean(o.text) === expected));
            if (matches.length !== 1) throw new Error('OPTION_MISSING_OR_AMBIGUOUS');
            expected = matches[0].value;
          }
          const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype :
            el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          el.focus();
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, expected);
          el.dispatchEvent(new Event('input', {bubbles: true}));
          el.dispatchEvent(new Event('change', {bubbles: true}));
          el.blur();
        }
        written.push({el, expected, ref: action.ref, signature: record.signature});
        results.push({ref: action.ref, status: 'pending-verification'});
        if (type === 'select' || type === 'radio' || type === 'checkbox') await settle();
      } catch (e) {
        results.push({ref: action.ref, status: 'blocked', reason: e.message});
      }
    }
    const settled = await settle();
    for (const item of written) {
      const result = results.find((r) => r.ref === item.ref);
      const actual = value(item.el);
      const isValid = valid(item.el);
      const retained = item.el.isConnected && visible(item.el) && actual === item.expected;
      result.status = retained && isValid ? 'verified' : retained && pending(item.el) && item.el.validity?.valid !== false ? 'pending-validation' : 'needs-review';
      if (result.status === 'needs-review') result.reason = !item.el.isConnected ? 'FIELD_REPLACED' : actual !== item.expected ? 'VALUE_NOT_RETAINED' : !isValid ? 'HTML_VALIDATION_FAILED' : 'FIELD_HIDDEN';
    }
    const completed = new Set(results.map((r) => r.ref));
    for (const a of request.actions) if (!completed.has(a.ref)) results.push({ref: a.ref, status: 'not-attempted'});
    const observation = observe();
    return {results, settled, observation, elapsedMs: performance.now() - started,
      complete: results.every((r) => r.status === 'verified') && settled,
      verification: 'DOM read-back and native validity only; not application/server acceptance'};
  } finally { state.busy = false; }
  } catch (error) { return {error: error.message}; }
}
