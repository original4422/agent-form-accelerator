// Owned, online localhost test application. Independent server draft oracle;
// no applicant traffic, Ashby response emulation, or model-accessible oracle API.
import http from 'node:http';import {build} from 'esbuild';
export const onlineSource=`姓名：Alex Fictional
邮箱：alex.fictional@example.test
居住国家：United Kingdom
意向城市：London, United Kingdom
学历：Master's degree
最早到岗：2027-07-01
英国工作许可：Yes, authorized without sponsorship
个人介绍：I am a fictional graduate who built an accessible campus events directory. I interviewed student volunteers, implemented keyboard navigation, and documented how event owners could correct outdated dates.
项目决策：In a fictional campus project, I proposed a preview screen. Volunteers used it to catch incorrect event dates before publishing, so our team adopted the design.
## 教育经历 1
学校：Northern Example University — London campus
专业：Computer Science
## 教育经历 2
学校：Southern Example College — Bristol campus
专业：Mathematics
`;
export const onlineExpected={name:'Alex Fictional',email:'alex.fictional@example.test',country:'uk',city:'london',degree:'master',available:'2027-07-01',authorization:'authorized',summary:onlineSource.split('个人介绍：')[1].split('\n')[0],decision:onlineSource.split('项目决策：')[1].split('\n')[0],school0:'north-london',major0:'Computer Science',school1:'south-bristol',major1:'Mathematics'};
export function onlineDraftMatches(draft){
 return Object.entries(onlineExpected).every(([key,value])=>draft[key]===value)&&Object.entries(draft).every(([key,value])=>key in onlineExpected||(['challenge','lesson'].includes(key)&&value===''));
}
export async function createOnlineFormServer({delay=90,failKey,branch=true}={}){
 const compiled=await build({entryPoints:['prototype/fixtures/framework-src/online-form.jsx'],bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
 const draft={},events=[];let inFlight=0,revision=0,submissions=0,questions=[],rows=1;
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data));};
  if(req.method==='GET'&&/^\/apply\/(native|radix|search)$/.test(url.pathname)){res.setHeader('content-type','text/html');res.end('<!doctype html><meta charset="utf-8"><title>Fictional application draft</title><style>body{font:16px system-ui;max-width:800px;margin:20px auto}label,.field{display:block;margin:12px 0}input,textarea,select,button[role=combobox]{display:block;min-width:280px;padding:6px}fieldset{margin:16px 0}button{margin:8px;padding:8px}textarea{width:90%;min-height:80px}[role=listbox]{background:white;padding:12px;border:1px solid #777}[role=option]{padding:5px}</style><div id="root"></div><script src="/app.js"></script>');return;}
  if(req.method==='GET'&&url.pathname==='/app.js'){res.setHeader('content-type','text/javascript');res.end(compiled.outputFiles[0].text);return;}
  if(req.method==='GET'&&url.pathname==='/catalog'){
   const all=url.searchParams.get('kind')==='city'?[{value:'london',label:'London, United Kingdom'},{value:'london-ca',label:'London, Canada'}]:[{value:'north-london',label:'Northern Example University — London campus'},{value:'north-york',label:'Northern Example University — York campus'},{value:'south-bristol',label:'Southern Example College — Bristol campus'}];
   await new Promise(r=>setTimeout(r,180));send(200,all.filter(o=>o.label.toLowerCase().includes((url.searchParams.get('q')??'').toLowerCase())));return;
  }
  if(req.method==='POST'&&url.pathname==='/submit'){submissions++;send(400,{error:'Submission forbidden in this test'});return;}
  if(req.method!=='PATCH'||url.pathname!=='/draft'){send(404,{error:'Not found'});return;}
  let body;try{let raw='';for await(const b of req){raw+=b;if(raw.length>20000)throw Error();}body=JSON.parse(raw);}catch{send(400,{error:'Invalid body'});return;}
  const {key,value}=body;events.push({key,receivedAt:Date.now(),overlap:!!inFlight,revision:body.revision});
  if(inFlight||body.revision!==revision){send(409,{error:'Draft changed; wait for the previous save'});return;}
  if(![...Object.keys(onlineExpected),'rows','lesson','challenge'].includes(key)){send(400,{error:'Unknown field'});return;}
  inFlight++;
  try{
   await new Promise(r=>setTimeout(r,key==='country'?500:delay));
   if(key===failKey){send(422,{error:'This value was rejected'});return;}
   if(key==='rows')rows=value;else draft[key]=value;
   if(key==='country'&&branch)questions=value==='uk'?[{key:'authorization',label:'UK work authorization',options:[{value:'authorized',label:'Yes, authorized without sponsorship'},{value:'sponsorship',label:'Sponsorship required'}]}]:[{key:'authorization',label:'Work authorization for this country',options:[{value:'authorized',label:'Authorized'},{value:'sponsorship',label:'Sponsorship required'}]}];
   revision++;send(200,{revision,questions,rows});
  }finally{inFlight--;}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {origin:`http://127.0.0.1:${server.address().port}`,oracle:()=>({draft:structuredClone(draft),questions:structuredClone(questions),rows,revision,events:structuredClone(events),inFlight,submissions}),close:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
