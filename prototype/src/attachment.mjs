import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const MAX_BYTES=10*1024*1024;
export function attachmentScope(url,{label,group}) {
 const target=new URL(url);
 if(!['http:','https:'].includes(target.protocol)||!['localhost','127.0.0.1','[::1]'].includes(target.hostname)||target.username||target.password)throw new Error('ATTACHMENT_LOCALHOST_REQUIRED');
 if(typeof label!=='string'||!label.trim()||typeof group!=='string')throw new Error('ATTACHMENT_EXACT_LABEL_AND_GROUP_REQUIRED');
 return {url:target.href,label,group};
}
export async function registerAttachment({filePath,label,group},url) {
 const scope=attachmentScope(url,{label,group}),filename=path.basename(filePath);
 if(!/\.pdf$/i.test(filename))throw new Error('ATTACHMENT_PDF_REQUIRED');
 const originalPath=path.resolve(filePath),bytes=await readFile(originalPath);
 if(!bytes.length||bytes.length>MAX_BYTES)throw new Error('ATTACHMENT_SIZE_LIMIT: 1 byte to 10 MiB');
 const identity={attachmentId:randomUUID(),filename,bytes:bytes.length,sha256:hash(bytes),mimeType:'application/pdf'};
 return {identity,scope,async readFresh(){
  let current;try{current=await readFile(originalPath);}catch{throw new Error('ATTACHMENT_FILE_UNAVAILABLE');}
  if(current.length!==identity.bytes||hash(current)!==identity.sha256)throw new Error('ATTACHMENT_FILE_CHANGED');
  return current;
 }};
}

// A single owner-selected input in the original document. No selector or path
// is accepted through MCP, and source extraction is unrelated to this identity.
export async function createAttachmentBinding(page,backend,registration) {
 const {identity,scope}=registration;
 const initial=await backend.request({op:'inspect'});
 const match=observation=>{
  if(observation.url!==scope.url)throw new Error('ATTACHMENT_WRONG_PAGE');
  const matches=observation.fields.filter(f=>f.kind==='file'&&f.label===scope.label&&f.group===scope.group);
  if(matches.length!==1)throw new Error('ATTACHMENT_TARGET_MISSING_OR_AMBIGUOUS');
  return matches[0];
 };
 const target=match(initial),documentId=initial.documentId;
 const element=await page.evaluateHandle(ref=>globalThis.__afaPrototype.nodes.get(ref)?.el,target.ref);
 const handle=element.asElement();if(!handle){await element.dispose();throw new Error('ATTACHMENT_TARGET_MISSING');}
 const inputContract=await handle.evaluate(el=>({tag:el.tagName,type:el.type,multiple:el.multiple,directory:el.webkitdirectory,accept:el.accept}));
 if(inputContract.tag!=='INPUT'||inputContract.type!=='file'||inputContract.multiple||inputContract.directory){await handle.dispose();throw new Error('ATTACHMENT_NATIVE_SINGLE_FILE_REQUIRED');}
 const accepted=inputContract.accept.split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
 if(accepted.length&&!accepted.some(value=>['.pdf','application/pdf','application/*','*/*'].includes(value))){await handle.dispose();throw new Error('ATTACHMENT_ACCEPT_MISMATCH');}
 const contract=JSON.stringify(inputContract);
 const check=async observation=>{
  const current=match(observation);
  if(observation.documentId!==documentId||current.ref!==target.ref)throw new Error('ATTACHMENT_TARGET_CHANGED');
  if(current.disabled||current.readOnly)throw new Error('ATTACHMENT_NOT_EDITABLE');
  const live=await handle.evaluate((el,ref)=>({same:el.isConnected&&globalThis.__afaPrototype.nodes.get(ref)?.el===el,tag:el.tagName,type:el.type,multiple:el.multiple,directory:el.webkitdirectory,accept:el.accept}),target.ref);
  const {same,...attributes}=live;
  if(!same||JSON.stringify(attributes)!==contract)throw new Error('ATTACHMENT_TARGET_CHANGED');
  return current;
 };
 const evidence=async observation=>{
  const result={...identity,target:{url:scope.url,documentId,ref:target.ref,label:scope.label,group:scope.group},asOf:new Date().toISOString(),scope:'Local input.files byte identity and observed native/ARIA validity only',status:'needs-review'};
  try{
   const field=await check(observation);
   const actual=await handle.evaluate(async(el,max)=>{
    const files=[...el.files];if(files.length!==1)return {count:files.length};
    const file=files[0],value={count:1,filename:file.name,bytes:file.size};
    if(file.size>max)return value;
    const bytes=await file.arrayBuffer();value.sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
    value.retained=el.isConnected&&el.files.length===1&&el.files[0]===file;
    value.pending=!!el.closest('[aria-busy="true"]');value.valid=el.validity.valid&&(!el.getAttribute('aria-invalid')||el.getAttribute('aria-invalid')==='false');return value;
   },MAX_BYTES);
   result.actual=actual;
   if(actual.count!==1)result.reason=actual.count?'ATTACHMENT_FILE_COUNT':'ATTACHMENT_NOT_SELECTED';
   else if(actual.filename!==identity.filename||actual.bytes!==identity.bytes||actual.sha256!==identity.sha256)result.reason='ATTACHMENT_BYTES_MISMATCH';
   else if(!actual.retained)result.reason='ATTACHMENT_CHANGED_DURING_READ';
   else if(field.pending||actual.pending)result.reason='ATTACHMENT_PENDING';
   else if(!field.valid||!actual.valid)result.reason='ATTACHMENT_INVALID';
   else result.status='verified';
  }catch(error){result.reason=error.message;}
  return result;
 };
 return {async decorate(observation){return {...observation,attachments:[await evidence(observation)]};},
  async attach(request){
   if(request.attachmentId!==identity.attachmentId)throw new Error('UNKNOWN_ATTACHMENT_ID');
   if(request.ref!==target.ref)throw new Error('ATTACHMENT_TARGET_NOT_AUTHORIZED');
   if(request.url!==scope.url)throw new Error('ATTACHMENT_WRONG_PAGE');
   // Pass these verified bytes, never a path that Playwright could reopen.
   const buffer=await registration.readFresh();
   const before=await backend.request({op:'validate',url:request.url,snapshot:request.snapshot});await check(before);
   if(before.formUpdate?.reason)throw new Error(before.formUpdate.reason);
   await handle.setInputFiles({name:identity.filename,mimeType:identity.mimeType,buffer},{timeout:1500});
   await new Promise(resolve=>setTimeout(resolve,120));
   const observation=await this.decorate(await backend.request({op:'inspect'}));
   return {observation,attachment:observation.attachments[0]};
  },async dispose(){await handle.dispose();}};
}
