import assert from 'node:assert/strict';
import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createHarness} from './harness.mjs';
import {cases, oracle} from './cases.mjs';
import {projectRoot} from '../src/bridge.mjs';
const h = await createHarness(), results = [], dir = await mkdtemp(path.join(os.tmpdir(), 'afa-source-check-'));
const file = path.join(dir, 'facts.json');
const sourceFor = (task) => ({id: 'candidate', fields: task.fields.map(({group,label,value}) => ({group,label,value})), expansions: task.name === 'repeat' ? [{label:'添加教育经历',expectGroup:'教育经历 2'}] : []});
const withClient = async (task, mode, fn) => {
  const source = sourceFor(task); await writeFile(file, JSON.stringify(source), {mode: 0o600});
  const client = new Client({name: 'source-check', version: '0.0.1'});
  try {
    await client.connect(new StdioClientTransport({command:process.execPath,args:[`${projectRoot}/prototype/src/source-mcp.mjs`],env:{...process.env,AFA_SESSION_FILE:h.sessionFile,AFA_SOURCE_FILE:file,AFA_SOURCE_MODE:mode}}));
    await fn(client, source);
  } finally { await client.close(); }
};
const check = async (name, fn) => { try { await fn(); results.push({name,passed:true}); console.log(`PASS ${name}`); } catch(e) { results.push({name,passed:false,error:e.message}); console.error(`FAIL ${name}: ${e.message}`); }};
try {
  for (const mode of ['inline','reference']) for (const task of cases) await check(`${mode} source MCP: ${task.name}`, async () => {
    await h.reset(task.name);
    await withClient(task, mode, async (client, source) => {
      const args = mode === 'inline' ? {url:h.page.url(),fields:source.fields,expansions:source.expansions} : {url:h.page.url(),source:source.id};
      const result = await client.callTool({name:mode==='inline'?'form_apply_inline':'form_apply_source',arguments:args});
      assert.equal(JSON.parse(result.content[0].text).complete,true); assert.equal((await oracle(h.page,task)).passed,true);
    });
  });
  await check('changed source rejected before page write', async () => {
    await h.reset('plain'); await withClient(cases[0],'reference',async(client,source)=>{
      source.fields[0].value='changed after discovery'; await writeFile(file,JSON.stringify(source));
      const result=await client.callTool({name:'form_apply_source',arguments:{url:h.page.url(),source:'candidate'}});
      assert.equal(result.isError,true); assert.match(result.content[0].text,/SOURCE_CHANGED/);
      assert.equal(await h.page.locator('#name').inputValue(),'');
    });
  });
  await check('unregistered source rejected before page write', async () => {
    await h.reset('plain'); await withClient(cases[0],'reference',async(client)=>{
      const result=await client.callTool({name:'form_apply_source',arguments:{url:h.page.url(),source:'other'}});
      assert.equal(result.isError,true); assert.equal(await h.page.locator('#name').inputValue(),'');
    });
  });
} finally { await h.close(); await rm(dir,{recursive:true,force:true}); await writeFile(`${projectRoot}/prototype/reports/source-checks.json`,JSON.stringify({date:new Date().toISOString(),results},null,2)); }
if(results.some((r)=>!r.passed)) process.exitCode=1;
