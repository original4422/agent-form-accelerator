export function createCallBudget(limit) {
 if(!Number.isInteger(limit)||limit<1)throw new Error('INVALID_TOOL_LIMIT');
 let attempted=0,forwarded=0;
 return {accept(message){if(message.method!=='tools/call')return true;attempted++;if(forwarded===limit)return false;forwarded++;return true;},get counts(){return {attempted,forwarded,limit};}};
}
export function createAttachmentApproval() {
 let used=false;
 return (message,{threadId,turnId,owner})=>{
  const p=message.params,schema=p?.requestedSchema,meta=p?._meta,args=meta?.tool_params;
  if(used||message.method!=='mcpServer/elicitation/request'||!threadId||!turnId||!owner||
   p?.threadId!==threadId||p.turnId!==turnId||p.serverName!=='afa'||p.mode!=='form'||
   p.message!=='Allow the afa MCP server to run tool "form_attach_file"?'||meta?.codex_approval_kind!=='mcp_tool_call'||
   !schema||Object.keys(schema).sort().join(',')!=='properties,type'||schema.type!=='object'||!schema.properties||typeof schema.properties!=='object'||Array.isArray(schema.properties)||Object.keys(schema.properties).length||
   !args||Object.keys(args).sort().join(',')!=='attachmentId,ref,url'||args.url!==owner.url||args.attachmentId!==owner.attachmentId||args.ref!==owner.ref)throw new Error('OUT_OF_SCOPE_ATTACHMENT_APPROVAL');
  used=true;return {action:'accept',content:{}};
 };
}
