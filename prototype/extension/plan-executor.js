// Bounded local orchestration; no model, selectors, arbitrary code, or navigation.
// The host supplies semantic decisions and explicit dependency stages once.
export async function executePlan(request, primitive) {
  const started = performance.now(), deadline = Date.now() + 8000;
  const steps = request.steps;
  if (!Array.isArray(steps) || !steps.length || steps.length > 8) throw new Error('Expected 1–8 plan steps');
  const targets = steps.flatMap((s) => s.op === 'fill' && Array.isArray(s.fields) ? s.fields : []);
  const key = (f) => JSON.stringify([f.group, f.label]);
  if (!targets.length || targets.length > 100 || new Set(targets.map(key)).size !== targets.length) throw new Error('Expected 1–100 unique field targets');
  for (const s of steps) {
    if (s.op === 'fill') {
      if (!Array.isArray(s.fields) || !s.fields.length || s.fields.some((f) => typeof f.label !== 'string' || typeof f.group !== 'string' || !['string', 'boolean'].includes(typeof f.value))) throw new Error('Invalid fill step');
    } else if (s.op !== 'expand' || typeof s.ref !== 'string' || typeof s.expectGroup !== 'string' || !s.expectGroup) throw new Error('Invalid expand step');
  }
  let calls = 0;
  const call = async (r) => { calls++; const result = await primitive(r); if (result.error) throw new Error(result.error); return result; };
  // Validates the actual old snapshot before issuing a new one.
  let observation = await call({op: 'validate', snapshot: request.snapshot, url: request.url});
  const documentId = observation.documentId;
  const initial = new Map();
  for (const f of observation.fields) {
    const k = key(f); initial.set(k, initial.has(k) ? null : f);
  }
  const allowedControls = new Set(observation.controls.filter((c) => !c.disabled).map((c) => c.ref));
  const newGroups = new Set(), trace = [];
  const guard = () => {
    if (observation.url !== request.url || observation.documentId !== documentId) throw new Error('PAGE_CHANGED');
    if (Date.now() >= deadline) throw new Error('PLAN_DEADLINE');
  };
  const refresh = async () => { observation = await call({op: 'inspect'}); guard(); };
  const expectedValue = (field, target) => {
    if (field.kind !== 'select') return target.value;
    const matches = (field.options ?? []).filter((o) => !o.disabled && (o.value === target.value || o.label === target.value));
    return matches.length === 1 ? matches[0].value : undefined;
  };
  const match = (target) => {
    const fields = observation.fields.filter((f) => key(f) === key(target));
    if (fields.length > 1) throw new Error(`AMBIGUOUS_FIELD: ${target.group}/${target.label}`);
    const f = fields[0], prior = initial.get(key(target));
    if (initial.has(key(target)) && !prior) throw new Error('AMBIGUOUS_INITIAL_FIELD');
    if (!prior && !newGroups.has(target.group)) throw new Error(`UNPLANNED_FIELD: ${target.group}/${target.label}`);
    if (f && prior && f.kind !== prior.kind) throw new Error('FIELD_KIND_CHANGED');
    if (f && (!f.supported || f.readOnly)) throw new Error('UNSUPPORTED_OR_READONLY_FIELD');
    return f && !f.disabled && expectedValue(f, target) !== undefined ? f : undefined;
  };
  let reason;
  try {
    for (let index = 0; index < steps.length; index++) {
      guard(); const step = steps[index];
      if (step.op === 'expand') {
        if (!allowedControls.has(step.ref)) throw new Error('UNOBSERVED_ADD_CONTROL');
        if (observation.fields.some((f) => f.group === step.expectGroup)) throw new Error('GROUP_ALREADY_EXISTS');
        const r = await call({op: 'fill', snapshot: observation.snapshot, url: request.url,
          deadline, actions: [{ref: step.ref, op: 'expand'}]});
        observation = r.observation; guard();
        if (r.results[0]?.status !== 'expanded') throw new Error(r.results[0]?.reason || 'EXPANSION_FAILED');
        const until = Math.min(deadline, Date.now() + 1000);
        while (!observation.fields.some((f) => f.group === step.expectGroup)) {
          if (Date.now() >= until) throw new Error('EXPECTED_GROUP_NOT_FOUND');
          await new Promise((r) => setTimeout(r, 25)); await refresh();
        }
        newGroups.add(step.expectGroup); trace.push({step: index, status: 'expanded'});
      } else {
        const until = Math.min(deadline, Date.now() + 1000);
        let fields;
        while (true) {
          fields = step.fields.map(match);
          if (fields.every(Boolean)) break;
          if (Date.now() >= until) throw new Error('FIELDS_NOT_READY');
          await new Promise((r) => setTimeout(r, 25)); await refresh();
        }
        const r = await call({op: 'fill', snapshot: observation.snapshot, url: request.url, deadline,
          actions: fields.map((f, i) => ({ref: f.ref, op: 'set', value: step.fields[i].value}))});
        observation = r.observation; guard();
        trace.push({step: index, status: r.complete ? 'verified' : 'needs-review', results: r.results});
        if (!r.complete) throw new Error('STEP_VERIFICATION_FAILED');
      }
    }
    await refresh();
    for (const target of targets) {
      const f = match(target);
      if (!f || f.value !== expectedValue(f, target) || f.valid === false) throw new Error('FINAL_VERIFICATION_FAILED');
    }
  } catch (e) { reason = e.message; }
  return {complete: !reason, reason, trace, verified: reason ? undefined : targets.length,
    observation, primitiveCalls: calls, elapsedMs: performance.now() - started,
    verification: 'DOM read-back and native validity only; not application/server acceptance'};
}
