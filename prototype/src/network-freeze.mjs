// Install before the first navigation in a new, service-worker-disabled context.
// One-way freeze for form diagnostics: page HTTP and routed WebSockets only.
export async function createNetworkFreeze(context, transport) {
 let state='preparing',closed=false,freezing;
 const pending=new Set(),sockets=new Set();
 const counts={blockedRequests:0,blockedSockets:0,openedSockets:0};
 context.on('close',()=>{closed=true;});
 context.on('request',r=>pending.add(r));
 context.on('requestfinished',r=>pending.delete(r));
 context.on('requestfailed',r=>pending.delete(r));
 await context.route('**/*',route=>{
  if(state==='preparing')return route.continue();
  counts.blockedRequests++;return route.abort('internetdisconnected');
 });
 await context.routeWebSocket('**/*',client=>{
  if(state!=='preparing'){counts.blockedSockets++;client.close().catch(()=>{});return;}
  const server=client.connectToServer(),pair={client,server};
  sockets.add(pair);counts.openedSockets++;
  client.onMessage(message=>{if(state==='preparing')server.send(message);});
  server.onMessage(message=>{if(state==='preparing')client.send(message);});
  client.onClose((code,reason)=>{sockets.delete(pair);server.close({code,reason}).catch(()=>{});});
  server.onClose((code,reason)=>{sockets.delete(pair);client.close({code,reason}).catch(()=>{});});
 });
 const status=()=>({state,closed,observedUnfinishedRequests:pending.size,openSockets:sockets.size,...counts,...transport.status()});
 const freeze=()=>freezing??=(async()=>{
  if(closed)throw new Error('BROWSER_CLOSED');
  state='freezing';
  try{
   // Block new traffic and message forwarding before awaiting any operation.
   await Promise.all([transport.freeze(),context.setOffline(true),...Array.from(sockets).flatMap(({client,server})=>[client.close(),server.close()])]);
   sockets.clear();
   if(closed)throw new Error('BROWSER_CLOSED');
   if(transport.status().activeTransportSockets)throw new Error('PROXY_CONNECTIONS_REMAIN');
   state='frozen';return status();
  }catch(e){state='failed';throw e;}
 })();
 return {freeze,status};
}
