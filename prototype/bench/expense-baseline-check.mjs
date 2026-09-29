// Deterministic reachability of both branches through the official script tool.
// The model never receives this script or its mappings.
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {chromium} from 'playwright';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createExpenseServer,expenseCases} from './expense-server.mjs';
import {readExpenseDOM} from './expense-evidence.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'afa-expense-baseline-'));
try{for(const [name,scenario] of Object.entries(expenseCases)){
 const app=await createExpenseServer();let context,client;
 try{
  const profile=path.join(root,name),sourcePath=path.join(root,`${name}.md`);await writeFile(sourcePath,scenario.source);
  context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:['--remote-debugging-port=0','--remote-debugging-address=127.0.0.1']});
  const page=context.pages()[0];await page.goto(app.origin+'/expense');await page.getByRole('radio',{name:'Rail',exact:true}).waitFor();
  const endpoint=`http://127.0.0.1:${(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]}`;
  client=new Client({name:'expense-baseline-check',version:'0.0.1'});await client.connect(new StdioClientTransport({command:process.execPath,args:[path.resolve('prototype/bench/online-playwright-mcp.mjs')],env:{...process.env,AFA_CDP_ENDPOINT:endpoint,AFA_TARGET_URL:page.url(),AFA_DOCUMENT_FILE:sourcePath},stderr:'pipe'}));
  const tools=await client.listTools();assert.ok(tools.tools.find(t=>t.name==='browser_run_code_unsafe').description.includes('Travel mode'));
  const result=await client.callTool({name:'browser_run_code_unsafe',arguments:{code:`async (page,source)=>{
   const value=label=>source.entries.find(e=>e.label===label).value;
   const wait=()=>page.locator('#save-status').filter({hasText:/^Draft saved\\.$/}).waitFor();
   await page.getByText(value('交通方式'),{exact:true}).click();await wait();
   const mapping={'Employee name':'员工','Business purpose':'事由','Travel date':'出行日期','Rail fare (GBP)':'火车票金额（英镑）','Distance (km)':'里程（公里）','Vehicle registration':'车牌','Parking (GBP)':'停车费（英镑）','Additional explanation':'补充说明'};
   for(const [label,key] of Object.entries(mapping)){if(!source.entries.some(e=>e.label===key))continue;const input=label==='Travel date'?page.locator('input[type=date]'):page.getByRole(['Rail fare (GBP)','Distance (km)','Parking (GBP)'].includes(label)?'spinbutton':'textbox',{name:label,exact:true});await input.fill(value(key));await input.blur();await wait();}
   return {status:await page.locator('#save-status').textContent(),total:await page.locator('#total').textContent()};
  }`}});assert.ok(!result.isError,JSON.stringify(result.content));
  assert.deepEqual(app.oracle().draft,scenario.expected);assert.equal(app.oracle().totalPence,scenario.totalPence);assert.equal(app.oracle().submissions,0);assert.equal(app.oracle().inFlight,0);
  await page.reload();await page.getByRole('radio',{name:'Rail',exact:true}).waitFor();assert.deepEqual((await readExpenseDOM(page)).values,scenario.expected);
  console.log('PASS official baseline '+name);
 }finally{await client?.close();await context?.close();await app.close();}
}}finally{await rm(root,{recursive:true,force:true});}
