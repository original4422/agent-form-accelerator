// Controlled local fixture. Its success envelope has NOT been captured from live Ashby.
import http from 'node:http';
export async function createFormUpdateFixture(mode='success'){
 let accepted=false,requests=0;
const server=http.createServer(async(req,res)=>{
 if(req.method==='GET'){res.setHeader('content-type','text/html');res.end(`<!doctype html><form><p id="rule">Use the supplied details.</p><label>Location<input id="first"></label><label>Name<input id="second"></label><div id="extra"></div></form><script>
 window.updating=false;window.secondBeforeResponse=false;window.firstEvents=0;
 document.querySelector('#second').oninput=()=>{if(window.updating)window.secondBeforeResponse=true};
 document.querySelector('#first').onchange=async()=>{window.firstEvents++;window.updating=true;document.querySelector('form').setAttribute('aria-busy','true');
 try{const r=await fetch('/api/non-user-graphql?op=ApiSetFormValue',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operationName:'ApiSetFormValue',query:'mutation ApiSetFormValue { setFormValue { __typename sections { title } errorMessages formErrors { message } } }',variables:{value:document.querySelector('#first').value}})});const data=await r.json();
 if(r.ok&&!data.errors&&data.data?.setFormValue){await new Promise(r=>setTimeout(r,80));if(data.testChange==='new-field')document.querySelector('#extra').innerHTML='<label>Work authorization<input required></label>';if(data.testChange==='new-rule')document.querySelector('#rule').textContent='New requirement: provide a legal name.';window.rendered=true;}
 }catch{}finally{window.updating=false;document.querySelector('form').setAttribute('aria-busy','false')}};
 </script>`);return;}
 requests++;for await(const _ of req){};
 if(mode==='network-failure'){res.writeHead(200,{'content-type':'application/json','content-length':100});res.flushHeaders();setTimeout(()=>req.socket.destroy(),10);return;}
 await new Promise(r=>setTimeout(r,mode==='timeout'?2400:mode==='delayed'?700:30));
 if(res.destroyed)return;
 res.setHeader('content-type','application/json');
 if(mode==='http-failure'){res.statusCode=503;res.end('{}');return;}
 if(mode==='graphql-failure'){res.end(JSON.stringify({errors:[{message:'fixture rejection'}],data:{setFormValue:null}}));return;}
 if(mode==='unknown-response'){res.end('{}');return;}
 accepted=mode!=='form-error';res.end(JSON.stringify({data:{setFormValue:{__typename:'FormRender',sections:[],errorMessages:[],formErrors:mode==='form-error'?[{message:'fixture validation error'}]:[]}},testChange:mode}));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {url:`http://127.0.0.1:${server.address().port}/`,diagnostic:()=>({accepted,requests}),close:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
