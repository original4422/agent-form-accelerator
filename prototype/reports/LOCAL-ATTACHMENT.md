# Owner-registered local attachment

2026-09-30. Functional verification with fictional files, localhost, real Chromium and MCP stdio. No model request or speed measurement.

The companion accepts a separate owner attachment path plus an exact URL, label and group. Registration resolves one native single-file input in the original document. The model receives an opaque ID and target ref. Source extraction remains independent. The upload action reads and checks the registered byte identity, then passes that exact Buffer to Playwright rather than reopening a path.

## Verified behavior

`AFA_ATTACHMENT_PDF=1 npm run check:attachment` passed using the existing bundled Python runtime (`AFA_PYTHON`) for PDF extraction:

- Actual file bytes were independently read from the selected input and SHA-256 matched the registered fictional PDF. Name text stayed unchanged. Resume/CV changed once; Autofill from resume and Cover letter changed zero times; submission count remained zero.
- Without explicit registration, the source-only companion had no attachment tool or attachment context. The five existing companion tool input schemas matched the opt-in session exactly; the optional attachment tool was the only addition.
- Changed/missing file bytes and symlink retargeting were rejected by the registration reader. Wrong ID and either other file input ref were rejected before writing.
- Label/group changes, duplicate semantic targets, multiple-file conversion, replaced node and navigation stopped the old binding. Existing shared guards sometimes report `FORM_CONTEXT_CHANGED` before the attachment-specific guard.
- Change handlers that cleared or replaced the File, made native validity false, or retained aria-busy returned `needs-review`. A later manual file replacement changed fresh context to a byte mismatch. Export before that context still returned the original historical receipt unchanged.
- Pure receipt regression checks that both page URL and nested attachment target URL omit query/fragment in JSON/Markdown export while the runtime exact URL is unchanged.
- A separately registered image-containing PDF could have verified attachment bytes while the same document's source extraction remained `partial-text`, including the history receipt. File controls still remain outside text-binding coverage.

`check:receipt` and `check:reload`, both with their real mixed-PDF options, passed. The reload checks also confirmed the legacy four-tool benchmark session still uses its original schema and entry IDs. Existing benchmark reports and the Greenhouse zero-attachment oracle were not modified.

## Initial check failures

The first integration check expected a field error for a changed legend. The shared form-context guard correctly stopped it earlier with `FORM_CONTEXT_CHANGED`; the assertion was updated to accept that specific rejection, with unchanged write counters still required. The next run passed the attachment cases but the optional PDF source case stopped because the default Python lacked pdfplumber. Selecting the already installed bundled Python completed that check; no package installation or parser change was needed.

All checks closed their own MCP client, companion, temporary profile and fixture server in finally blocks. Process inspection after the window found no remaining attachment/receipt/reload test process or their browser session/MCP process. This is a single-file localhost prototype; the result's `verified` scope is local File bytes and observed native/ARIA validity at its timestamp, with public page wording retained separately.
