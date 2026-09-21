// Passive, narrow protocol observation. Never sends a request or exposes bodies,
// variable values, server field definitions, or error text to the planner.
// A recognized response is not proof of full application/server acceptance.
export function trackFormUpdates(page) {
  const records=new Map();let observed=0,finished=0,failure,disposed=false;
  const recognize=request=>{
    try{
      const url=new URL(request.url());
      if(request.frame()!==page.mainFrame()||request.method()!=='POST'||url.origin!==new URL(page.url()).origin||
        url.pathname!=='/api/non-user-graphql'||url.searchParams.get('op')!=='ApiSetFormValue')return false;
      const body=request.postDataJSON();
      return body?.operationName==='ApiSetFormValue'&&/^\s*mutation\s+ApiSetFormValue\b/.test(body.query);
    }catch{return false;}
  };
  const onRequest=request=>{if(recognize(request)){records.set(request,{done:false});observed++;}};
  const finish=(request,reason)=>{const r=records.get(request);if(!r||r.done||disposed)return;r.done=true;finished++;failure??=reason;records.delete(request);};
  const onFailed=request=>finish(request,'FORM_UPDATE_NETWORK_FAILED');
  const onFinished=async request=>{
    if(!records.has(request))return;
    try{
      const response=await request.response();
      if(!response?.ok()){finish(request,'FORM_UPDATE_HTTP_FAILED');return;}
      const bytes=await response.body();
      if(bytes.length>1024*1024){finish(request,'FORM_UPDATE_RESPONSE_UNCONFIRMED');return;}
      const body=JSON.parse(bytes.toString()),render=body?.data?.setFormValue;
      if(Array.isArray(body.errors)&&body.errors.length){finish(request,'FORM_UPDATE_GRAPHQL_FAILED');return;}
      // Shape comes from the observed selection set, not a live success capture.
      // Fail closed on missing/null/unknown envelopes; never infer success from 200.
      if((body.errors!==undefined&&!Array.isArray(body.errors))||render?.__typename!=='FormRender'||
        !Array.isArray(render.sections)||!Array.isArray(render.errorMessages)||!Array.isArray(render.formErrors)){
        finish(request,'FORM_UPDATE_RESPONSE_UNCONFIRMED');return;
      }
      finish(request,render.errorMessages.length||render.formErrors.length?'FORM_UPDATE_REJECTED':undefined);
    }catch{finish(request,'FORM_UPDATE_RESPONSE_UNCONFIRMED');}
  };
  const status=()=>({operation:'ApiSetFormValue',observed,finished,pending:records.size,
    state:failure?'failed':records.size?'pending':observed?'response-observed':'idle',
    ...(failure?{reason:failure}:records.size?{reason:'FORM_UPDATE_PENDING'}:{}),
    scope:'Observed operation only; not full application acceptance'});
  const wait=async(deadline=Date.now()+1500)=>{
    while(records.size&&!failure&&Date.now()<deadline)await new Promise(r=>setTimeout(r,20));
    const s=status();return s.pending&&!failure?{...s,reason:'FORM_UPDATE_TIMEOUT'}:s;
  };
  const reset=frame=>{if(frame===page.mainFrame()){records.clear();observed=0;finished=0;failure=undefined;}};
  const dispose=()=>{disposed=true;page.off('request',onRequest);page.off('requestfailed',onFailed);page.off('requestfinished',onFinished);page.off('framenavigated',reset);page.off('close',dispose);records.clear();};
  page.on('request',onRequest);page.on('requestfailed',onFailed);page.on('requestfinished',onFinished);page.on('framenavigated',reset);page.once('close',dispose);
  return {status,wait,dispose};
}
