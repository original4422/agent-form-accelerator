import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {parseDocument} from './document-source.mjs';
const execute=promisify(execFile),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function sourceBytes(file){
 const info=await stat(file),pdf=/\.pdf$/i.test(file);
 if(!info.isFile()||info.size>(pdf?5_000_000:400_000))throw new Error('SOURCE_SIZE_OR_TYPE');
 const bytes=await readFile(file);if(bytes.length>(pdf?5_000_000:400_000))throw new Error('SOURCE_SIZE_OR_TYPE');return bytes;
}
export async function readDocumentSource(file){
 const bytes=await sourceBytes(file);
 if(!/\.pdf$/i.test(file))return parseDocument(bytes.toString('utf8'));
 if(process.env.AFA_PDF_SOURCE!=='1')throw new Error('PDF_EXPERIMENT_DISABLED: set AFA_PDF_SOURCE=1 and install prototype/requirements-pdf.txt');
 if(!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))throw new Error('INVALID_PDF');
 let stdout;
 try{({stdout}=await execute(process.env.AFA_PYTHON??'python3',[fileURLToPath(new URL('./pdf-source.py',import.meta.url)),file],{timeout:15000,maxBuffer:2_000_000,encoding:'utf8'}));}
 catch(e){const reason=String(e.stderr??'').match(/(?:PDF_[A-Z_]+|ModuleNotFoundError)/)?.[0];throw new Error(reason??'PDF_EXTRACTION_FAILED');}
 const source=JSON.parse(stdout);
 if(source.sha256!==hash(bytes)||source.sha256!==hash(await sourceBytes(file)))throw new Error('SOURCE_CHANGED: reload document session');
 return source;
}
export async function assertSourceFresh(file,source){
 const bytes=await sourceBytes(file);
 const current=source.format==='pdf-text-runs-v1'?hash(bytes):parseDocument(bytes.toString('utf8')).sha256;
 if(current!==source.sha256)throw new Error('SOURCE_CHANGED: reload document session');
}
