import {createAttachmentBinding} from './attachment.mjs';
import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {createPlaywrightBackend} from '../bench/playwright-backend.mjs';

// One explicitly selected Page, no CDP listener, arbitrary JS or navigation API.
export async function createBrowserController(page,{attachment}={}) {
  const token=randomBytes(32).toString('hex'),backend=createPlaywrightBackend(page);
  const attachmentBinding=attachment?await createAttachmentBinding(page,backend,attachment):undefined;
  let pending=Promise.resolve(),closing=false,receipt=null;
  const authenticated=value=>{
    const candidate=Buffer.from(value??''),expected=Buffer.from(`Bearer ${token}`);
    return candidate.length===expected.length&&timingSafeEqual(candidate,expected);
  };
  const server=http.createServer(async(req,res)=>{
    const send=(status,data)=>{if(!res.destroyed&&!res.writableEnded){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));}};
    if(req.headers.host!==`127.0.0.1:${server.address()?.port}`||Object.hasOwn(req.headers,'origin')||!authenticated(req.headers.authorization))return send(403,{error:'FORBIDDEN'});
    if(req.method!=='POST'||!['/request','/receipt'].includes(req.url))return send(404,{error:'NOT_FOUND'});
    if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']??''))return send(415,{error:'JSON_REQUIRED'});
    try {
      const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>(req.url==='/receipt'?2_000_000:262144))return send(413,{error:'REQUEST_TOO_LARGE'});chunks.push(chunk);}
      const request=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
      if(req.url==='/receipt'){
        if(request?.op==='store'&&request.receipt?.format==='afa-local-receipt-v1'){receipt=request.receipt;return send(200,{stored:true});}
        if(request?.op==='export')return receipt?send(200,receipt):send(409,{error:'NO_CAPTURED_RECEIPT: connect Codex and request form_context first'});
        return send(400,{error:'UNSUPPORTED_RECEIPT_OPERATION'});
      }
      if(!request||!['inspect','validate','fill','goal','discover',...(attachmentBinding?['attach']:[])].includes(request.op))return send(400,{error:'UNSUPPORTED_OPERATION'});
      const run=async()=>{
        if(closing||page.isClosed())throw new Error('BROWSER_CLOSED');
        if(!/^https?:\/\//.test(page.url()))throw new Error('HTTP_PAGE_REQUIRED');
        if(request.url&&request.url!==page.url())throw new Error('WRONG_PAGE: refresh form_context after navigation');
        if(request.op==='attach')return attachmentBinding.attach(request);
        const result=await backend.request(request);
        if(!attachmentBinding)return result;
        return result.observation?{...result,observation:await attachmentBinding.decorate(result.observation)}:attachmentBinding.decorate(result);
      };
      // Covers the whole goal/discovery operation, across all local clients.
      const result=pending.then(run);pending=result.catch(()=>{});
      send(200,await result);
    }catch(e){send(400,{error:e.message});}
  });
  server.requestTimeout=30000;server.headersTimeout=10000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  return {endpoint:`http://127.0.0.1:${server.address().port}/request`,token,
    async close(){if(closing)return;closing=true;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));backend.dispose();await attachmentBinding?.dispose();}};
}
