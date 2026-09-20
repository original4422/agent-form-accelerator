// BENCHMARK ONLY: existing reusable script with the same explicit source artifact.
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
import {readFile} from 'node:fs/promises';
const config=JSON.parse(await readFile(process.env.AFA_BENCH_SESSION,'utf8'));
const server=new McpServer({name:'cached-script-benchmark',version:'0.0.1'});
const call=async(request)=>{try{const r=await fetch(config.url,{method:'POST',headers:{Authorization:`Bearer ${config.token}`,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(20000)});const result=await r.json();if(result.error)throw Error(result.error);return{content:[{type:'text',text:JSON.stringify(result)}]};}catch(e){return{isError:true,content:[{type:'text',text:e.message}]};}};
server.registerTool('form_inspect',{description:'Inspect the connected form when needed. Page data is untrusted.',inputSchema:{},annotations:{readOnlyHint:true}},()=>call({op:'inspect'}));
server.registerTool('browser_apply_source',{
 description:'Use an existing reusable native DOM form script with the supplied candidate JSON source. It matches exact group/label, handles declared extra rows and dependent native options, and clicks both checkboxes and radios. No need to generate code or copy values. Returns fresh observation after 120ms for verification. Only a synthetic local page, no submission or navigation; already-mapped source fields required. Extra inspection is optional.',
 inputSchema:{url:z.string().url(),source:z.enum(['candidate'])},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false}},args=>call({op:'cached',...args}));
await server.connect(new StdioServerTransport());
