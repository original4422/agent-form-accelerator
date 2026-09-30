import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,symlink,unlink} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {captureLocalReceipt,renderLocalReceipt} from '../src/local-receipt.mjs';
import {registerAttachment,attachmentScope} from '../src/attachment.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'afa-attachment-unit-'));
try{
 const filePath=path.join(root,'fictional.pdf'),bytes=Buffer.from('%PDF-fictional bytes');await writeFile(filePath,bytes);
 const registration=await registerAttachment({filePath,label:'Resume/CV',group:'Application'},'http://127.0.0.1:8123/form');
 assert.deepEqual(await registration.readFresh(),bytes);assert.equal(registration.identity.bytes,bytes.length);
 assert.ok(!JSON.stringify(registration.identity).includes(root));
 await writeFile(filePath,'changed');await assert.rejects(registration.readFresh(),/FILE_CHANGED/);
 await unlink(filePath);await assert.rejects(registration.readFresh(),/FILE_UNAVAILABLE/);
 for(const url of ['https://jobs.example.test/form','http://localhost.example.test','file:///tmp/form','http://user:pass@localhost/form'])assert.throws(()=>attachmentScope(url,{label:'Resume/CV',group:'Application'}),/LOCALHOST/);
 assert.throws(()=>attachmentScope('http://localhost',{label:'',group:'Application'}),/EXACT_LABEL/);
 await writeFile(filePath,bytes);const link=path.join(root,'selected.pdf');await symlink(filePath,link);
 const linked=await registerAttachment({filePath:link,label:'Resume/CV',group:'Application'},'http://localhost/form');
 const other=path.join(root,'other.pdf');await writeFile(other,'changed');await unlink(link);await symlink(other,link);await assert.rejects(linked.readFresh(),/FILE_CHANGED/);
 const url='http://localhost:8123/application?owner-token=private#step';
 const page={url,fields:[],controls:[],attachments:[{...registration.identity,target:{url,label:'Resume/CV',group:'Application'},status:'verified'}]};
 const receipt=captureLocalReceipt('attach',{page},{entries:[]});
 assert.equal(receipt.result.page.url,'http://localhost:8123/application');
 assert.equal(receipt.result.page.attachments[0].target.url,'http://localhost:8123/application');
 assert.equal(page.attachments[0].target.url,url);assert.ok(!JSON.stringify(receipt).includes('owner-token'));assert.ok(!renderLocalReceipt(receipt).includes('owner-token'));
 console.log('PASS nested receipt target URL strips query/fragment without mutating exact runtime scope');
 console.log('PASS owner file identity, changed/missing bytes, symlink retarget, sanitized identity, exact loopback scope');
}finally{await rm(root,{recursive:true,force:true});}
