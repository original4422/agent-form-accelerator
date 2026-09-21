import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {createPlaywrightBackend} from './playwright-backend.mjs';
// This controller remains outside Codex. The model-facing provider can only use
// the form protocol against this already-frozen disposable page.
export async function serveOfflinePage(h,{validationMode='full'}={}) {
 const token=randomUUID(),backend=createPlaywrightBackend(h.page,{validationMode}),url=h.page.url();
 const server=http.createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
  if(req.method!=='POST'||req.url!=='/request'||req.headers.authorization!==`Bearer ${token}`)return send(403,{error:'FORBIDDEN'});
  try{
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1000000)throw new Error('REQUEST_TOO_LARGE');}
   const r=JSON.parse(raw);
   if(!h.guard().frozen||h.page.url()!==url)throw new Error('ISOLATED_PAGE_CHANGED');
   if(!['inspect','validate','fill','goal','discover'].includes(r.op)||(r.url&&r.url!==url))throw new Error('INVALID_REQUEST');
   send(200,await backend.request(r));
  }catch(e){send(400,{error:e.message});}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {config:{endpoint:`http://127.0.0.1:${server.address().port}/request`,token,url},close:()=>new Promise(resolve=>server.close(resolve))};
}
