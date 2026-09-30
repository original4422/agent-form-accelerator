import assert from 'node:assert/strict';
import {createAttachmentApproval,createCallBudget} from './attachment-smoke-guards.mjs';
const scope={threadId:'thread',turnId:'turn',owner:{url:'http://127.0.0.1:1234/form',attachmentId:'owner-id',ref:'f4'}};
const allowed={id:1,method:'mcpServer/elicitation/request',params:{threadId:'thread',turnId:'turn',serverName:'afa',mode:'form',message:'Allow the afa MCP server to run tool "form_attach_file"?',requestedSchema:{type:'object',properties:{}},_meta:{codex_approval_kind:'mcp_tool_call',tool_params:{...scope.owner}}}};
const approve=createAttachmentApproval();assert.deepEqual(approve(allowed,scope),{action:'accept',content:{}});assert.throws(()=>approve(allowed,scope),/OUT_OF_SCOPE/);
const mutations=[q=>q.params.threadId='other',q=>q.params.turnId='other',q=>q.params.serverName='other',q=>q.params.mode='url',q=>q.params.message='Allow the afa MCP server to run tool "form_apply_bindings"?',q=>q.params._meta.codex_approval_kind='other',q=>q.method='item/commandExecution/requestApproval',q=>q.params._meta.tool_params.url+='?other',q=>q.params._meta.tool_params.url='https://example.test/form',q=>q.params._meta.tool_params.ref='autofill',q=>q.params._meta.tool_params.attachmentId='other',q=>q.params._meta.tool_params.path='/tmp/private.pdf',q=>delete q.params._meta.tool_params.ref,q=>q.params.requestedSchema.required=[],q=>q.params.requestedSchema.type='string'];
for(const value of [true,1,null,[],false,'',{password:{type:'string'}}])mutations.push(q=>q.params.requestedSchema.properties=value);
for(const change of mutations){const q=structuredClone(allowed);change(q);assert.throws(()=>createAttachmentApproval()(q,scope),/OUT_OF_SCOPE/);}
for(const key of ['threadId','turnId','owner'])assert.throws(()=>createAttachmentApproval()(allowed,{...scope,[key]:undefined}),/OUT_OF_SCOPE/);
const budget=createCallBudget(12);for(const method of ['initialize','tools/list','notifications/initialized'])assert.equal(budget.accept({method}),true);
assert.deepEqual(budget.counts,{attempted:0,forwarded:0,limit:12});
for(let i=0;i<12;i++)assert.equal(budget.accept({method:'tools/call'}),true);
assert.equal(budget.accept({method:'tools/call'}),false);assert.deepEqual(budget.counts,{attempted:13,forwarded:12,limit:12});
console.log('PASS attachment approval once, 22 altered requests and 3 missing scope refusals; task-only budget distinguishes 13 attempts from 12 forwarded calls');
