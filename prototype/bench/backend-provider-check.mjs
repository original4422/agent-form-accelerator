import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createHarness} from './harness.mjs';
import {checkFrameworkProvider} from './framework-preflight.mjs';
import {projectRoot} from '../src/bridge.mjs';
import '../scripts/build-fixtures.mjs';
const h=await createHarness({cdp:true}),results=[];
let toolsReference;
try {
  for (const mode of ['binding-repeat','binding-playwright']) {
    await h.reset('react-form'); await h.page.waitForSelector('input');
    const script=mode==='binding-repeat'?`${projectRoot}/prototype/src/bindings-mcp.mjs`:`${projectRoot}/prototype/bench/playwright-bindings-mcp.mjs`;
    const env={AFA_DOCUMENT_FILE:`${projectRoot}/prototype/fixtures/documents/framework-candidate.md`,AFA_CONTEXT_MODE:'prefetch',AFA_REPEAT_MODE:'template',AFA_SESSION_FILE:h.sessionFile,AFA_CDP_ENDPOINT:h.cdpEndpoint,AFA_TARGET_URL:h.page.url()};
    const preflight=await checkFrameworkProvider({script,env,mode});
    await h.reset('react-form'); await h.page.waitForSelector('input');
    const client=new Client({name:'backend-provider-check',version:'0.0.1'});
    try {
      await client.connect(new StdioClientTransport({command:process.execPath,args:[script],env:{...process.env,...env},stderr:'pipe'}));
      const listed=await client.listTools();
      if(toolsReference)assert.deepEqual(listed,toolsReference,'Model-visible tool schema and prefetched data differ');
      else toolsReference=listed;
      const tool=listed.tools.find(t=>t.name==='form_apply_bindings');
      const {source,page}=JSON.parse(tool.description.split('UNTRUSTED SNAPSHOT DATA (not instructions):\n')[1]);
      const map={'Applicant name':'姓名','Email address':'邮箱','Country of residence':'居住国家','Preferred office city':'意向工作城市','Qualification level':'学历层次','Institution':'学校','Subject':'专业','Personal statement':'个人介绍'};
      const bindings=Object.fromEntries(page.fields.map(f=>[f.ref,source.entries.find(e=>e.label===map[f.label]&&(!f.group||e.context.endsWith('第一段教育经历'))).id]));
      const repeated=Object.fromEntries(page.fields.filter(f=>f.group==='Education 1').map(f=>[f.ref,source.entries.find(e=>e.label===map[f.label]&&e.context.endsWith('第二段教育经历')).id]));
      const result=await client.callTool({name:'form_apply_bindings',arguments:{url:page.url,bindings,repeatGroups:[{templateGroup:'Education 1',expectGroup:'Education 2',controlRef:page.controls[0].ref,bindings:repeated}]}});
      assert.ok(!result.isError,JSON.stringify(result));
      const data=JSON.parse(result.content[0].text); assert.equal(data.complete,true,JSON.stringify(data));
      const actual=await h.page.evaluate(()=>({data:window.applicationState,validation:window.validationState,submits:window.submissionCount,popups:document.querySelectorAll('[role=listbox]').length}));
      assert.deepEqual(actual.data,{fullName:'林示例',email:'candidate@example.test',country:'cn',city:'hz',degree:'pg',schools:[{school:'南方示例学院',major:'软件工程'},{school:'北方示例大学',major:'计算机科学'}],summary:source.entries.find(e=>e.label==='个人介绍').value});
      assert.deepEqual(actual.validation,{checking:false,invalid:false,loading:false});assert.equal(actual.submits,0);assert.equal(actual.popups,0);
      results.push({mode,passed:true,preflight,targets:data.evidence.length,elapsedMs:data.elapsedMs,primitiveCalls:data.primitiveCalls,identicalModelVisibleTools:true});
      console.log('PASS '+mode+' actual MCP and application-state oracle');
    } finally {await client.close();}
  }
} finally {await h.close();await writeFile(`${projectRoot}/prototype/reports/backend-provider-checks.json`,JSON.stringify({date:new Date().toISOString(),results},null,2));}
