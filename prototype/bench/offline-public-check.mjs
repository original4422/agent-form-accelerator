import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createOfflinePublicHarness} from './offline-public-harness.mjs';
import {createPlaywrightBackend} from './playwright-backend.mjs';
import {createDocumentSession} from '../src/document-session.mjs';
import {projectPage} from '../src/context-projection.mjs';
import {PUBLIC_URL,CASES,BOOL_CASES,publicOracle} from './offline-public-cases.mjs';
const h=await createOfflinePublicHarness(PUBLIC_URL),rows=[];
try{
 assert.equal(h.guard().frozen,true);
 const reads=h.guard().allowedReadRequests;
 const blocked=await h.page.evaluate(async()=>{try{await fetch(location.href,{method:'POST',body:'fictional-offline-probe'});return false;}catch{return true;}});
 assert.equal(blocked,true);assert.equal(h.guard().allowedReadRequests,reads);
 const request=createPlaywrightBackend(h.page).request;
 const session=await createDocumentSession({sourcePath:new URL('../fixtures/documents/public-candidate.md',import.meta.url),request});
 const c=await session.context();
 const refs=await h.page.evaluate(()=>Object.fromEntries([...globalThis.__afaPrototype.nodes].map(([ref,{el}])=>[el.name,ref])));
 const bindings={},choices={};
 for(const [name,label]of CASES){assert.ok(refs[name],`Missing native control ${name}`);bindings[refs[name]]=c.source.entries.find(e=>e.label===label).id;}
 for(const [prefix,label,sourceLabel]of BOOL_CASES){const matches=c.page.fields.filter(f=>f.group.startsWith(prefix)&&f.label===label);assert.equal(matches.length,1,`Missing choice ${prefix}/${label}`);bindings[matches[0].ref]=c.source.entries.find(e=>e.label===sourceLabel).id;choices[matches[0].ref]=true;}
 const projected=projectPage(c.page,c.source,{optionMode:'compact'}),full=projectPage(c.page,c.source);
 const r=await session.apply({url:c.page.url,bindings,choices});
 const oracle=await publicOracle(h.page,c.source);
 const data={date:new Date().toISOString(),url:PUBLIC_URL,guard:h.guard(),fieldCount:c.page.fields.length,contextBytes:{full:Buffer.byteLength(JSON.stringify(full)),compact:Buffer.byteLength(JSON.stringify(projected))},largeLists:projected.fields.filter(f=>f.optionCount).map(f=>({label:f.label,optionCount:f.optionCount,retained:f.options.length})),complete:r.complete,reason:r.reason,executionMs:r.elapsedMs,evidence:r.evidence,coverage:r.coverage,oracle};
 await writeFile('prototype/reports/offline-public-check.json',JSON.stringify(data,null,2));
 console.log(JSON.stringify({...data,evidence:undefined,coverage:{requiredUnits:r.coverage.requiredUnits,unresolved:r.coverage.unresolvedRequired.map(f=>f.label)}},null,2));
 assert.equal(r.complete,true,r.reason);assert.equal(oracle.passed,true,oracle.errors.join(', '));
}finally{await h.close();}
