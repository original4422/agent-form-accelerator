# 0014: Experimental PDF source runs and exact excerpts

Status: experimental, opt-in. 2026-09-21.

## Problem

Requiring users to rewrite a resume as key/value Markdown hides preparation work outside the browser timing. Plain PDF text extraction is insufficient: the fictional two-column sample combines left-hand contact details and right-hand school details on one line. Binding the whole line copies unrelated facts. Calling the model once to reformat the resume would add another round trip before filling.

## Decision

Keep the existing model responsible for interpretation. For explicitly enabled text-only PDFs, locally expose spatial text runs with original page and bounding box, without inferring field labels or a reading hierarchy. Large horizontal gaps separate runs; content drawing order is not used as semantic order. These heuristics are not a general layout parser.

The same apply request may select a unique exact excerpt `{sourceId,quote}` for text fields, or list 2–12 distinct whole source-entry IDs to join with newlines. Excerpts return offsets; joins return all IDs. Other controls still use an ordinary source ID with observed options/conditional selections. No transformation, OCR, fuzzy text recovery or arbitrary replacement values. Source byte hashes are checked before operations. This proves textual provenance, not that a selected excerpt preserves meaning; the model must retain qualifiers, negation and logical context.

Expose this schema only for PDF sessions; Markdown tool schema and descriptions keep their simpler binding contract. Selection, group identity and completion tracking include excerpt/join identity so another excerpt from the same entry cannot satisfy a previous target accidentally.

## Dependencies and bounds

Optional Python interpreter (`AFA_PYTHON`, default python3) and pinned pdfplumber 0.11.9; no model API/key. Explicit `AFA_PDF_SOURCE=1`. Limits: 5 MB input, 10 pages, 300 entries, 100,000 extracted characters, 15-second extraction process timeout, 2 MB stdout/stderr buffer limit. Reject image-containing, image-only, rotated/no-text inputs; no DOCX or OCR. This intentionally restricted adapter is not a promise of arbitrary resume compatibility.

## Evidence and next decision

See `reports/PDF-SOURCE.md` for successful/failed model tasks, falsifiable checks, and boundaries. In particular, the first live run exposed a native-choice preflight bug: JavaScript strings have a `.search` method, so truthiness alone misidentified a native choice as a conditional plan. Retain that failure and fix the object type check. Do not count recovery latency as a valid speed baseline.

Proceed only as an optional source adapter. A useful product result still requires complete representative recruiting tasks and stronger end-to-end evidence. Merely accepting a PDF file does not fulfill that goal.
