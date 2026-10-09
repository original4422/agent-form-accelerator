// Export existing observations and verdicts only; never inspect or verify again.
const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>value?.[k]!==undefined).map(k=>[k,value[k]]));
const pageIdentity=value=>{const url=new URL(value);return url.origin+url.pathname;};
export function captureLocalReceipt(operation,result,source,asOf=new Date().toISOString()) {
 const page=result.observation??result.page;
 const referenced=new Set();
 const collect=value=>{if(!value||typeof value!=='object')return;if(typeof value.sourceId==='string')referenced.add(value.sourceId);for(const id of value.sourceIds??[])referenced.add(id);for(const child of Object.values(value))if(typeof child==='object')collect(child);};
 for(const key of ['bindings','task','searches','conditionalSelections'])collect(result[key]);
 return {format:'afa-local-receipt-v1',asOf,operation,currentState:'not-revalidated',
  scope:'Historical observation and source-binding verdicts as of asOf. Later edits, navigation, source changes and server acceptance are not verified.',
  source:{...pick(source,['sha256','version','generation','format','extractionCoverage']),entries:source.entries.filter(e=>referenced.has(e.id)).map(e=>pick(e,['id','context','label','value','line','page','bbox']))},
  result:{...pick(result,['sourceVersion','sourceReload','complete','partial','appliedSubsetComplete','reason','completionScope','task','coverage','sourceCoverage','bindings','evidence','searches','conditionalSelections','expanded']),
   page:{url:pageIdentity(page.url),...pick(page,['title','fields','controls','formContext','formStatus','limitations','formUpdate']),...(page.attachments?{attachments:page.attachments.map(attachment=>({...attachment,target:{...attachment.target,url:pageIdentity(attachment.target.url)}}))}:{})}}};
}
const text=value=>value===undefined?'—':typeof value==='string'?value:JSON.stringify(value);
// User/page text remains literal table text, including pipes, HTML and line breaks.
const cell=value=>text(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\\','&#92;').replaceAll('|','&#124;').replaceAll('`','&#96;').replaceAll('*','&#42;').replaceAll('_','&#95;').replaceAll('[','&#91;').replaceAll(']','&#93;').replace(/\r?\n/g,'<br>');
const table=(headers,rows)=>[headers.map(cell).join(' | '),headers.map(()=>'---').join(' | '),...rows.map(row=>row.map(cell).join(' | '))].map(row=>'| '+row+' |').join('\n');
export function renderLocalReceipt(receipt) {
 const r=receipt.result,source=receipt.source;
 const lines=['# Local filling receipt','',`As of: ${cell(receipt.asOf)} (${cell(receipt.operation)})`,'',
  '**Historical snapshot — current state has not been revalidated.** Later manual edits, dynamic questions, navigation and changed source files are not reflected. Exporting does not inspect the page or change the active plan.','',
  `Page: ${cell(r.page.url)}`,'',
  table(['Historical verdict','Value'],[['Last operation requested targets complete',r.complete],['Accumulated requested targets complete',r.task?.complete],['Visible required coverage',r.coverage?.visibleRequiredCovered],['Source extraction coverage',source.extractionCoverage??'text entries; no image coverage reported'],['Server acceptance','not verified; public wording below is page data']]),'',
  '## Observed fields (as of snapshot)','',table(['Ref','Group','Label','Kind','Observed value','Required','Valid','Pending'],r.page.fields.map(f=>[f.ref,f.group,f.label,f.kind,f.value,f.required,f.valid,f.pending])), '',
  ...(r.page.attachments?['## Owner-selected attachment (historical local file verification)','',table(['File','SHA-256','Bytes','Target','Status','Reason','Observed bytes'],r.page.attachments.map(a=>[a.filename,a.sha256,a.bytes,`${a.target.group} / ${a.target.label}`,a.status,a.reason,a.actual])),'']:[]),
  '## Source bindings (last operation)','',table(['Ref','Source IDs','Exact quote','Source label','Target group'],(r.bindings??[]).map(b=>[b.ref,b.sourceIds??b.sourceId,b.sourceQuote,b.sourceLabel,b.targetGroup])), '',
  '## Requested source targets (historical ledger)','',table(['Ref','Group','Label','Source IDs','Exact quote','Status','Reason','Presence'],(r.task?.targets??[]).map(t=>[t.ref,t.group,t.label,t.sourceIds??t.sourceId,t.sourceQuote,t.status,t.reason,t.currentPresence])), '',
  '## Read-back evidence (last operation)','',table(['Group','Label','Expected','Actual','Status','Reason'],(r.evidence??[]).map(e=>[e.group,e.label,e.expected,e.actual,e.status,e.reason])), '',
  '## Unresolved required fields (historical)','',table(['Group','Label','Reason'],(r.coverage?.unresolvedRequired??[]).map(f=>[f.group,f.label,f.reason])), '',
  '## Referenced source entries','',`SHA-256: ${cell(source.sha256)}`, '', `Source version: ${cell(source.version)}; generation: ${cell(source.generation)}`,'',table(['ID','Context / label','Original text','Line / page / bounds'],source.entries.map(e=>[e.id,[e.context,e.label].filter(Boolean).join(' / '),e.value,{line:e.line,page:e.page,bbox:e.bbox}])), '',
  '## Source extraction and unread image regions','',cell(source.extractionCoverage??'No extraction coverage object for this source format.'),'',
  '## Public page save/status wording (historical; not server acceptance)','',cell(r.page.formStatus??'No public status observed.'),'',
  '## Operation outcome / limitations','',cell({reason:r.reason,coverage:r.coverage,formUpdate:r.page.formUpdate,limitations:r.page.limitations}),''];
 return lines.join('\n');
}
