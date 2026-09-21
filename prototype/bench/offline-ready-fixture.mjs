// Controller-owned localhost fixture. Never contacts a recruitment service.
import http from 'node:http';import {WebSocketServer} from 'ws';
export async function createOfflineReadyFixture(){
 const seen=[],messages=[],sockets=new Set(),held=new Set();
 const server=http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  seen.push({method:req.method,path:req.url,body});
  if(req.url==='/held'){held.add(res);res.on('close',()=>held.delete(res));res.writeHead(200,{'content-type':'text/event-stream'});res.write('data: waiting\n\n');return;}
  if(req.url==='/test-login'){res.writeHead(200,{'set-cookie':'fixture-login=yes; Path=/; SameSite=Lax'});res.end('ok');return;}
  if(req.url==='/form'&&!(req.headers.cookie??'').includes('fixture-login=yes')){res.writeHead(302,{location:'/'});res.end();return;}
  if(req.url==='/form'){
   res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end('<!doctype html><title>Local fictional application</title><main><h1>Local application</h1><form><label>Applicant name<input name="name" required></label><label>Email<input name="email" type="email" required></label><label>Earliest available start date<input type="date" required></label><button type="submit">Submit application</button></form></main><script src="/form.js"></script>');return;
  }
  if(req.url==='/form.js'){
   res.writeHead(200,{'content-type':'application/javascript'});res.end(`window.submits=0;window.peer=new WebSocket('ws://'+location.host+'/socket');window.worker=new Worker('/worker.js');window.workerReady=false;worker.onmessage=e=>{if(e.data==='ready')workerReady=true;};document.querySelector('form').onsubmit=e=>{e.preventDefault();window.submits++;};window.attemptNetwork=()=>{fetch('/autosave',{method:'POST',body:'fictional'}).catch(()=>{});navigator.sendBeacon('/beacon','fictional');try{peer.send('fictional');}catch{}const n=new WebSocket('ws://'+location.host+'/new-socket');n.onerror=()=>{};worker.postMessage('attempt');const f=document.createElement('iframe');f.src='/new-frame';document.body.append(f);localStorage.setItem('fictional-draft','must-be-deleted');};document.querySelector('form').oninput=()=>window.attemptNetwork();navigator.serviceWorker.register('/sw.js').catch(()=>{});`);return;
  }
  if(req.url==='/worker.js'){
   res.writeHead(200,{'content-type':'application/javascript'});res.end(`postMessage('ready');self.onmessage=()=>{fetch('/worker-write',{method:'POST',body:'fictional'}).catch(()=>{});const s=new WebSocket('ws://'+location.host+'/worker-socket');s.onopen=()=>s.send('fictional');s.onerror=()=>{};};`);return;
  }
  if(req.url==='/sw.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end("self.addEventListener('fetch',()=>{});");return;}
  res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end('<!doctype html><title>Local test login</title><h1>Fictional login for offline-mode checks</h1><button id="login">模拟登录</button><script>document.querySelector("button").onclick=async()=>{await fetch("/test-login",{method:"POST",body:"fixture-only"});location.href="/form";};</script>');
 });
 const ws=new WebSocketServer({server});ws.on('connection',(socket,req)=>{sockets.add(socket);messages.push({path:req.url,type:'open'});socket.on('message',b=>{messages.push({path:req.url,type:'message',text:b.toString()});socket.send(b);});socket.on('close',()=>sockets.delete(socket));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {url:`http://127.0.0.1:${server.address().port}`,seen,messages,sockets,held,
  async close(){for(const s of sockets)s.terminate();for(const r of held)r.end();await new Promise(r=>ws.close(r));server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
