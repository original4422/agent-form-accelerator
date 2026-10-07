# Experimental text-only PDF extraction. No inferred labels or field mapping.
import hashlib, io, json, os, sys
import pdfplumber
from pdfminer.pdfinterp import PDFContentParser
from pdfminer.pdftypes import PDFStream, resolve1
from pdfminer.psparser import PSEOF, literal_name

class NoInlineImages(PDFContentParser):
 def do_keyword(self,pos,token):
  # Reject before pdfminer reads inline data: some rendered PDFs split an
  # ASCII85 terminator across lines, causing the parser to silently eat EOF.
  if token is self.KEYWORD_BI: raise ValueError('PDF_INLINE_IMAGES_UNSUPPORTED')
  super().do_keyword(pos,token)

def check_content(streams,resources,seen):
 parser=NoInlineImages(streams)
 try:
  while True: parser.nextobject()
 except PSEOF: pass
 for obj in resolve1(resources.get('XObject',{})).values():
  obj=resolve1(obj)
  if not isinstance(obj,PDFStream) or literal_name(obj.get('Subtype'))!='Form' or id(obj) in seen: continue
  seen.add(id(obj))
  check_content([obj],resolve1(obj.get('Resources',resources)),seen)

raw=open(sys.argv[1],'rb').read(5_000_001)
if len(raw)>5_000_000: raise ValueError('PDF_TOO_LARGE')
entries=[]
unparsed_images=[]
allow_images=os.environ.get("AFA_PDF_ALLOW_IMAGES")=="1"
with pdfplumber.open(io.BytesIO(raw)) as pdf:
 if not 1<=len(pdf.pages)<=10: raise ValueError('PDF_PAGE_LIMIT')
 for number,page in enumerate(pdf.pages,1):
  check_content(page.page_obj.contents,page.page_obj.resources,set())
  if page.images and not allow_images: raise ValueError('PDF_IMAGES_REQUIRE_REVIEW: set AFA_PDF_ALLOW_IMAGES=1 to use only the text layer with explicit unparsed-image coverage')
  for image in page.images:
   unparsed_images.append(dict(page=number,bbox=[round(image[k],2) for k in ('x0','top','x1','bottom')]))
  words=page.extract_words(x_tolerance=2,y_tolerance=3,expand_ligatures=False)
  if not words: raise ValueError('PDF_NO_TEXT: OCR is not supported')
  # Keep spatial runs separate. Neither content-stream order nor same-y text
  # across a wide column gap is interpreted as one semantic paragraph.
  rows=[]
  for w in sorted(words,key=lambda w:(w['top'],w['x0'])):
   if not w.get('upright',True): raise ValueError('PDF_ROTATED_TEXT_UNSUPPORTED')
   row=next((r for r in reversed(rows) if abs(r[0]['top']-w['top'])<=3),None)
   if row is None: rows.append([w])
   else: row.append(w)
  for row in rows:
   runs=[]
   for w in sorted(row,key=lambda w:w['x0']):
    if not runs or w['x0']-runs[-1][-1]['x1']>24:runs.append([w])
    else:runs[-1].append(w)
   for run in runs:
    value=' '.join(w['text'] for w in run)
    box=[round(min(w['x0'] for w in run),2),round(min(w['top'] for w in run),2),round(max(w['x1'] for w in run),2),round(max(w['bottom'] for w in run),2)]
    entries.append(dict(id=f's{len(entries)+1}',label='PDF text run',context=f'PDF page {number}',value=value,page=number,bbox=box))
    if len(entries)>300:raise ValueError('PDF_ENTRY_LIMIT')
if sum(len(e['value']) for e in entries)>100000:raise ValueError('PDF_TEXT_LIMIT')
source=dict(sha256=hashlib.sha256(raw).hexdigest(),format='pdf-text-runs-v1',entries=entries,warning='Text extraction is not semantic parsing. Page/bbox preserve position; adjacent runs are not necessarily related. No OCR, image interpretation, rotated text or inferred facts. Verify source meaning before binding.')

if unparsed_images:
 source["extractionCoverage"]=dict(status="partial-text",unparsedImages=unparsed_images,warning="Image content is unparsed on the listed pages and bounding boxes; it may contain additional or conflicting facts. Only extracted text entries are available for binding. Report these unresolved source regions even when requested targets are complete. Do not infer image facts or claim the whole resume was read.")
print(json.dumps(source,ensure_ascii=False))
