// Temporary loopback SOCKS5 CONNECT relay. HTTPS remains opaque TLS; no payload
// logging or certificates. Used only by the offline diagnostic browser.
import net from 'node:net';
export async function createFreezeProxy(){
 let frozen=false,closing,opened=0,rejected=0;
 const sockets=new Set();
 const track=s=>{sockets.add(s);s.once('close',()=>sockets.delete(s));s.on('error',()=>{});return s;};
 const server=net.createServer(client=>{
  if(frozen){rejected++;client.on('error',()=>{});client.destroy();return;}
  track(client);
  let buffer=Buffer.alloc(0),phase='hello',upstream;
  const destroy=()=>{client.destroy();upstream?.destroy();};
  client.once('close',()=>upstream?.destroy());
  client.setTimeout(10000,destroy);
  const receive=chunk=>{
   buffer=Buffer.concat([buffer,chunk]);
   if(buffer.length>65536){destroy();return;}
   if(phase==='hello'){
    if(buffer.length<2)return;
    const length=2+buffer[1];if(buffer.length<length)return;
    if(buffer[0]!==5||!buffer.subarray(2,length).includes(0)){client.end(Buffer.from([5,255]));return;}
    client.write(Buffer.from([5,0]));buffer=buffer.subarray(length);phase='connect';
   }
   if(phase!=='connect'||buffer.length<4)return;
   if(buffer[0]!==5||buffer[1]!==1||buffer[2]!==0){destroy();return;}
   const type=buffer[3];let offset,length,host;
   if(type===1){offset=4;length=4;}else if(type===3){if(buffer.length<5)return;offset=5;length=buffer[4];if(!length){destroy();return;}}
   else if(type===4){offset=4;length=16;}else{destroy();return;}
   if(buffer.length<offset+length+2)return;
   if(type===1)host=[...buffer.subarray(offset,offset+length)].join('.');
   else if(type===3)host=buffer.subarray(offset,offset+length).toString('utf8');
   else host=Array.from({length:8},(_,i)=>buffer.readUInt16BE(offset+i*2).toString(16)).join(':');
   const port=buffer.readUInt16BE(offset+length),rest=buffer.subarray(offset+length+2);
   if(frozen||!port){destroy();return;}
   phase='tunnel';client.removeListener('data',receive);client.pause();
   upstream=track(net.connect({host,port}));opened++;
   upstream.setTimeout(10000,destroy);
   upstream.once('error',destroy);upstream.once('close',()=>client.destroy());
   upstream.once('connect',()=>{
    if(frozen||client.destroyed){destroy();return;}
    client.setTimeout(0);upstream.setTimeout(0);
    client.write(Buffer.from([5,0,0,1,0,0,0,0,0,0]));
    if(rest.length)upstream.write(rest);
    client.pipe(upstream);upstream.pipe(client);client.resume();
   });
  };
  client.on('data',receive);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const freeze=async()=>{
  // Set the gate before yielding; no later callback can open a new tunnel.
  frozen=true;
  await Promise.all([...sockets].map(s=>new Promise(resolve=>{s.once('close',resolve);s.destroy();})));
  if(sockets.size)throw new Error('PROXY_CONNECTIONS_REMAIN');
 };
 return {url:`socks5://127.0.0.1:${server.address().port}`,freeze,
  status:()=>({frozen,activeTransportSockets:sockets.size,openedTunnels:opened,rejectedConnections:rejected}),
  close:()=>closing??=(async()=>{await freeze();await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));})()};
}
