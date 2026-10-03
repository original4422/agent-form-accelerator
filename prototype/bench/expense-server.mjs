import http from 'node:http';
import {build} from 'esbuild';
export const expenseCases={
 rail:{source:'员工：Alex Fictional\n事由：Review the fictional community library accessibility plan.\n出行日期：2027-06-10\n交通方式：Rail\n火车票金额（英镑）：42.75\n补充说明：The fictional visit included a review of the step-free entrance.\n',expected:{employee:'Alex Fictional',purpose:'Review the fictional community library accessibility plan.',date:'2027-06-10',mode:'rail',fare:42.75,note:'The fictional visit included a review of the step-free entrance.'},totalPence:4275},
 car:{source:'员工：Morgan Fictional\n事由：Visit the fictional campus archive for an accessibility review.\n出行日期：2027-06-12\n交通方式：Personal car\n里程（公里）：86.5\n车牌：EXAMPLE-42\n停车费（英镑）：7.20\n补充说明：The fictional archive visit required transporting a portable scanner.\n',expected:{employee:'Morgan Fictional',purpose:'Visit the fictional campus archive for an accessibility review.',date:'2027-06-12',mode:'car',kilometres:86.5,registration:'EXAMPLE-42',parking:7.2,note:'The fictional archive visit required transporting a portable scanner.'},totalPence:5045}
};
export async function createExpenseServer(){
 const compiled=await build({entryPoints:['prototype/fixtures/framework-src/expense-form.jsx'],bundle:true,write:false,outdir:'out',format:'esm',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
 let draft={},totalPence=null,saves=0,inFlight=0,submissions=0;const events=[];
 const server=http.createServer(async(req,res)=>{
  const send=(code,data)=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data));};
  if(req.method==='GET'&&req.url==='/expense'){res.setHeader('content-type','text/html');res.end('<!doctype html><meta charset="utf-8"><title>Travel reimbursement draft</title><link rel="stylesheet" href="/app.css"><main id="root"><div id="survey"></div></main><script type="module" src="/app.js"></script>');return;}
  if(req.method==='GET'&&['/app.js','/app.css'].includes(req.url)){res.setHeader('content-type',req.url.endsWith('.js')?'text/javascript':'text/css');res.end(compiled.outputFiles.find(f=>f.path.endsWith(req.url.endsWith('.js')?'.js':'.css')).text);return;}
  if(req.method==='GET'&&req.url==='/draft'){send(200,{draft,totalPence});return;}
  if(req.method==='POST'&&req.url==='/submit'){submissions++;send(400,{error:'This application only prepares drafts'});return;}
  if(req.method!=='PUT'||req.url!=='/draft'){send(404,{error:'Not found'});return;}
  let raw='';for await(const b of req)raw+=b;const next=JSON.parse(raw);inFlight++;events.push({mode:next.mode,keys:Object.keys(next)});
  await new Promise(r=>setTimeout(r,100));
  const money=['fare','parking','kilometres'];if(money.some(k=>k in next&&(!Number.isFinite(next[k])||next[k]<0))){inFlight--;send(422,{error:'Travel costs must be non-negative numbers'});return;}
  draft=next;
  // Inactive branch data cannot affect reimbursement, even after changing mode.
  if(draft.mode==='rail'){delete draft.kilometres;delete draft.registration;delete draft.parking;totalPence=Number.isFinite(draft.fare)?Math.round(draft.fare*100):null;}
  else if(draft.mode==='car'){delete draft.fare;totalPence=Number.isFinite(draft.kilometres)&&Number.isFinite(draft.parking)?Math.round(draft.kilometres*50)+Math.round(draft.parking*100):null;}
  else totalPence=null;
  saves++;inFlight--;send(200,{draft,totalPence});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {origin:`http://127.0.0.1:${server.address().port}`,oracle:()=>({draft:structuredClone(draft),totalPence,saves,inFlight,submissions,events:structuredClone(events)}),close:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
