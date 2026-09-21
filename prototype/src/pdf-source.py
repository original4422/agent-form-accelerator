# Experimental text-only PDF extraction. No inferred labels or field mapping.
import hashlib, io, json, sys
import pdfplumber
raw=open(sys.argv[1],'rb').read(5_000_001)
if len(raw)>5_000_000: raise ValueError('PDF_TOO_LARGE')
entries=[]
with pdfplumber.open(io.BytesIO(raw)) as pdf:
 if not 1<=len(pdf.pages)<=10: raise ValueError('PDF_PAGE_LIMIT')
 for number,page in enumerate(pdf.pages,1):
  if page.images: raise ValueError('PDF_IMAGES_REQUIRE_REVIEW: image-containing PDFs are not supported by text-only extraction')
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
print(json.dumps(dict(sha256=hashlib.sha256(raw).hexdigest(),format='pdf-text-runs-v1',entries=entries,warning='Text extraction is not semantic parsing. Page/bbox preserve position; adjacent runs are not necessarily related. No OCR, images, rotated text or inferred facts. Verify source meaning before binding.'),ensure_ascii=False))
