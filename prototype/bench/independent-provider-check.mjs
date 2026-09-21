import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createOfflinePublicHarness} from './offline-public-harness.mjs';
import {serveOfflinePage} from './offline-public-bridge.mjs';
import {GREENHOUSE_URL,greenhouseOracle,greenhousePlan} from './greenhouse-cases.mjs';
import {projectRoot} from '../src/bridge.mjs';
import {restoreObservation} from '../src/receipt-projection.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
const receiptMode=process.env.AFA_RECEIPT_MODE??'full';
const dir=await mkdtemp(path.join(os.tmpdir(),'afa-independent-mcp-')),results=[];
let h,bridge,client;
try {
  h=await createOfflinePublicHarness(GREENHOUSE_URL,{loadReadiness:'networkidle'});bridge=await serveOfflinePage(h);
  const file=path.join(dir,'controller.json');await writeFile(file,JSON.stringify(bridge.config),{mode:0o600});
  client=new Client({name:'independent-check',version:'0.0.1'});
  await client.connect(new StdioClientTransport({command:process.execPath,args:[`${projectRoot}/prototype/bench/offline-public-bindings-mcp.mjs`],env:{...process.env,AFA_OFFLINE_CONFIG:file,AFA_SELECTION_MODE:'independent',AFA_DOCUMENT_FILE:`${projectRoot}/prototype/fixtures/documents/greenhouse-candidate.md`},stderr:'pipe'}));
  const {tools}=await client.listTools(),apply=tools.find(t=>t.name==='form_apply_bindings');
  assert.ok(JSON.stringify(apply.inputSchema).includes('independentGroups'));
  const c=JSON.parse(apply.description.split('UNTRUSTED SNAPSHOT DATA (not instructions):\n')[1]);
  const call=await client.callTool({name:'form_apply_bindings',arguments:greenhousePlan(c,{independent:true})});
  assert.ok(!call.isError,JSON.stringify(call));const r=JSON.parse(call.content[0].text);results.push({result:r});
  assert.equal(r.complete,false);assert.equal(r.partial,true);assert.equal(r.appliedSubsetComplete,true);assert.equal(r.bindings.length,10);
  assert.deepEqual(r.task.unresolvedTargets.map(t=>t.label).sort(),['Degree','Discipline','Location (City)','School']);
  if(receiptMode==='changes'){
    assert.equal(r.receiptFormat,'changes-v1');const restored=restoreObservation(c.page,r.observationDelta);
    const fresh=await createPlaywrightBackend(h.page).request({op:'inspect'});
    assert.deepEqual(restored.fields,JSON.parse(JSON.stringify(fresh.fields)));assert.deepEqual(restored.controls,JSON.parse(JSON.stringify(fresh.controls)));
    assert.equal(r.task.plannedCount,14);assert.equal(r.task.verifiedCount,10);
    results.push({receiptBytes:Buffer.byteLength(JSON.stringify(r)),reconstructionPassed:true});
  }
  const oracle=await greenhouseOracle(h.page);results.push({oracle,guard:h.guard()});assert.equal(oracle.passed,true,oracle.errors.join('; '));
  const refreshed=await client.callTool({name:'form_context',arguments:{}});assert.ok(!refreshed.isError);const next=JSON.parse(refreshed.content[0].text);
  assert.deepEqual(next.task.unresolvedTargets.map(t=>t.label).sort(),['Degree','Discipline','Location (City)','School']);
  results.push({passed:true,contextRefreshRetainsUnresolved:true});console.log('PASS actual MCP one-call independent partial fill, ten public DOM targets, four retained unresolved facts, zero submits');
} catch(e) {results.push({passed:false,error:e.stack});console.error(e.message);process.exitCode=1;}
finally {await client?.close();await bridge?.close();await h?.close();await rm(dir,{recursive:true,force:true});await writeFile(`prototype/reports/${receiptMode==='changes'?'receipt-':''}independent-provider-checks.json`,JSON.stringify({date:new Date().toISOString(),results},null,2));}
