// One host decision, bounded deterministic reconciliation. Unknown semantics return
// to the host. No fuzzy field matching, hidden writes, generated JS or model API.
export function valuesEquivalent(kind,actual,expected) {
  if(actual===expected)return true;
  if(kind!=='tel'||typeof actual!=='string'||typeof expected!=='string')return false;
  const key=value=>{const v=value.trim();return /^\+?[0-9\s().-]+$/.test(v)&&/[0-9]/.test(v)?(v.startsWith('+')?'+':'')+v.replace(/\D/g,''):undefined;};
  const a=key(actual),b=key(expected);
  return a!==undefined&&b!==undefined&&a===b;
}
export async function executeGoal(request, primitive) {
  const started = performance.now(), deadline = Date.now() + 8000;
  const fields = request.fields, expansions = request.expansions ?? [];
  const key = (f) => JSON.stringify([f.group, f.label]);
  if (!Array.isArray(fields) || !fields.length || fields.length > 100 ||
      fields.some((f) => typeof f.group !== 'string' || typeof f.label !== 'string' || !['string', 'boolean'].includes(typeof f.value)) ||
      new Set(fields.map(key)).size !== fields.length) throw new Error('Expected 1–100 unique exact group/label targets');
  if (!Array.isArray(expansions) || expansions.length > 8 || expansions.some((e) => typeof e.label !== 'string' || typeof e.expectGroup !== 'string' || !e.expectGroup) ||
      new Set(expansions.map((e) => e.expectGroup)).size !== expansions.length) throw new Error('Invalid expansions');
  let calls = 0, observation;
  const call = async (r) => { calls++; const value = await primitive(r); if (value.error) throw new Error(value.error); return value; };
  observation = await call(request.snapshot ? {op: 'validate', snapshot: request.snapshot, url: request.url} : {op: 'inspect'});
  const documentId = observation.documentId;
  if (observation.url !== request.url) throw new Error('WRONG_PAGE');
  const guard = () => {
    if (observation.url !== request.url || observation.documentId !== documentId) throw new Error('PAGE_CHANGED');
    if (Date.now() >= deadline) throw new Error('GOAL_DEADLINE');
    if(observation.formUpdate?.reason)throw new Error(observation.formUpdate.reason);
  };
  const refresh = async () => { observation = await call({op: 'inspect'}); guard(); };
  const contextFor = (o,f) => JSON.stringify((o.formContext?.blocks??[]).filter(b=>b.fieldRefs.includes(f.ref)).map(b=>[b.text,b.relation]));
  const contexts=new Map(observation.fields.map(f=>[key(f),contextFor(observation,f)]));
  const pressedContracts=new Map(observation.fields.filter(f=>f.kind==='pressed-choice').map(f=>[key(f),f.choiceIdentity]));
  const originals = new Map(), writes = new Map(), expanded = new Set(), attempted = new Set();
  const trace = [];
  const unique = (items, predicate, reason) => {
    const matches = items.filter(predicate); if (matches.length > 1) throw new Error(reason); return matches[0];
  };
  for (const f of fields) {
    const found = unique(observation.fields, (o) => key(o) === key(f), `AMBIGUOUS_FIELD: ${f.group}/${f.label}`);
    if (found) originals.set(key(f), found.kind);
  }
  const controls = new Map();
  for (const e of expansions) {
    const control = unique(observation.controls, (o) => o.label === e.label, 'AMBIGUOUS_ADD_CONTROL');
    if (control && !control.disabled) controls.set(e.expectGroup, control.ref);
  }
  const resolve = (target) => {
    const f = unique(observation.fields, (o) => key(o) === key(target), `AMBIGUOUS_FIELD: ${target.group}/${target.label}`);
    if (!f) return {target, reason: 'FIELD_NOT_VISIBLE'};
    if(contexts.has(key(target))&&contexts.get(key(target))!==contextFor(observation,f))throw new Error('FORM_CONTEXT_CHANGED');
    if(pressedContracts.has(key(target))&&pressedContracts.get(key(target))!==f.choiceIdentity)throw new Error('PRESSED_CHOICE_CHANGED');
    if (target.kind && target.kind !== f.kind) throw new Error('FIELD_KIND_CHANGED');
    if (originals.has(key(target)) && originals.get(key(target)) !== f.kind) throw new Error('FIELD_KIND_CHANGED');
    if (!originals.has(key(target)) && !expanded.has(target.group)) return {target, reason: 'UNPLANNED_FIELD'};
    if (!f.supported || f.readOnly) return {target, reason: 'UNSUPPORTED_OR_READONLY_FIELD'};
    let value = target.value;
    if (f.kind === 'select') {
      const options = (f.options ?? []).filter((o) => !o.disabled && (o.value === target.value || o.label === target.value));
      if (options.length !== 1) return {target, reason: options.length ? 'AMBIGUOUS_OPTION' : 'OPTION_NOT_READY'};
      value = options[0].value;
    }
    return {target, field: f, value, reason: f.pending ? 'VALIDATION_PENDING' : f.disabled ? 'FIELD_DISABLED' : undefined};
  };
  let reason, finalized = false, lastProgress = Date.now();
  try {
    for (let round = 0; round < 24; round++) {
      guard();
      const states = fields.map(resolve);
      // A value that was already correct is verified without firing duplicate events.
      const pending = states.filter((s) => !s.field || !valuesEquivalent(s.field.kind,s.field.value,s.value) || s.field.valid === false || s.reason);
      if (!pending.length) {
        // Local postcondition recheck replaces a redundant host inspection, never
        // the separate benchmark's independent application-state oracle.
        await new Promise((r) => setTimeout(r, 120)); await refresh();
        const final = fields.map(resolve);
        if (final.every((s) => !s.reason && s.field && valuesEquivalent(s.field.kind,s.field.value,s.value) && s.field.valid !== false)) { finalized = true; break; }
        throw new Error('FINAL_VERIFICATION_FAILED');
      }
      const actions = [], actionTargets = [];
      for (const s of pending) {
        if (s.reason || !s.field) continue;
        if (valuesEquivalent(s.field.kind,s.field.value,s.value) && s.field.valid === false && writes.has(key(s.target))) throw new Error('VALIDATION_FAILED');
        if ((writes.get(key(s.target)) ?? 0) >= 2) throw new Error('WRITE_RETRY_LIMIT');
        actions.push({ref: s.field.ref, op: 'set', value: s.target.value,...(s.target.query?{query:s.target.query}:{})}); actionTargets.push(s.target);
      }
      if (actions.length) {
        const r = await call({op: 'fill', snapshot: observation.snapshot, url: request.url, deadline, actions});
        observation = r.observation;
        trace.push({round, operation: 'fill', statuses: r.results.map((x) => x.status)});
        const updateBlocked=r.results.find(x=>/^(FORM_UPDATE_|SERVER_FORM_CHANGED)/.test(x.reason??''));
        if(updateBlocked)throw new Error(updateBlocked.reason);
        guard();
        for (let i = 0; i < actionTargets.length; i++) {
          const result = r.results[i];
          if (['verified', 'needs-review', 'pending-validation'].includes(result.status)) {
            const k = key(actionTargets[i]); writes.set(k, (writes.get(k) ?? 0) + 1);
          }
          if (result.status === 'needs-review' || result.status === 'blocked') {
            // Retry only DOM identity drift under the same semantic contract.
            // Rejected/invalid values and new meanings require a host decision.
            if (!['FIELD_REPLACED', 'STALE_OR_MISSING_FIELD', 'FIELD_CHANGED'].includes(result.reason)) throw new Error(result.reason);
          }
        }
        lastProgress = Date.now(); continue;
      }
      const expansion = expansions.find((e) => !attempted.has(e.expectGroup) && pending.some((s) => s.target.group === e.expectGroup) && !observation.fields.some((f) => f.group === e.expectGroup));
      if (expansion) {
        const ref = controls.get(expansion.expectGroup);
        if (!ref) throw new Error('UNOBSERVED_ADD_CONTROL');
        attempted.add(expansion.expectGroup);
        const r = await call({op: 'fill', snapshot: observation.snapshot, url: request.url, deadline, actions: [{ref, op: 'expand'}]});
        observation = r.observation; guard();
        if (r.results[0]?.status !== 'expanded') throw new Error(r.results[0]?.reason || 'EXPANSION_FAILED');
        expanded.add(expansion.expectGroup); trace.push({round, operation: 'expand'});
        lastProgress = Date.now(); continue;
      }
      if (pending.some((s) => ['UNSUPPORTED_OR_READONLY_FIELD', 'UNPLANNED_FIELD', 'AMBIGUOUS_OPTION'].includes(s.reason))) throw new Error('SEMANTIC_REVIEW_REQUIRED');
      if (Date.now() - lastProgress >= 1000) throw new Error('FIELDS_NOT_READY');
      await new Promise((r) => setTimeout(r, 50)); await refresh();
      if (round === 23) throw new Error('ROUND_LIMIT');
    }
  } catch (e) { reason = e.message; }
  if (!finalized && !reason) reason = 'ROUND_LIMIT';
  // Always return checked values as evidence; unresolved targets never disappear.
  let evidence;
  try {
    evidence = fields.map((target) => {
      const s = resolve(target);
      const updateReason=/^(FORM_UPDATE_|SERVER_FORM_CHANGED)/.test(reason??'')?reason:observation.formUpdate?.reason;
      const verified = !updateReason && !s.reason && !!s.field && valuesEquivalent(s.field.kind,s.field.value,s.value) && s.field.valid !== false;
      return {group: target.group, label: target.label, expected: target.value, actual: s.field?.value,
        equivalence:verified&&s.field?.value!==s.value?'telephone-punctuation':undefined,
        status: verified ? 'verified' : 'unresolved', reason: verified ? undefined : updateReason || s.reason || 'VALUE_OR_VALIDITY_MISMATCH'};
    });
  } catch (e) { reason ??= e.message; evidence = fields.map((f) => ({group: f.group, label: f.label, status: 'unresolved', reason})); }
  const complete = !reason && evidence.every((e) => e.status === 'verified');
  return {complete, reason, evidence, observation, trace, primitiveCalls: calls,
    elapsedMs: performance.now() - started,
    verification: 'DOM values/native validity, rechecked after 120 ms; not application/server acceptance'};
}
