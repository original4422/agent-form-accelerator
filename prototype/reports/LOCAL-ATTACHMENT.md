# Owner-registered local attachment

2026-09-30. Fictional files and localhost only. The component checks below use real Chromium/MCP stdio without a model; the separate final section records one actual Codex turn. Neither experiment is a speed comparison.

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


## Codex app-server preflight

`npm run bench:attachment -- --preflight` passed on Codex 0.155.1 with gpt-6-astra/low selected but no model request. The real ephemeral read-only thread exposed exactly six AFA tools. One `form_context` request traversed app-server → observed MCP proxy → companion; all file inputs and change counters stayed empty/zero. One MCP process/proxy and Chromium identity were recorded, config hashes matched before/after, and all owned processes/profile/session configuration were removed. See [raw preflight](local-attachment-preflight-1790730665192.json).

The separate `--model` path permits one turn, 180 seconds and at most 12 forwarded `tools/call` requests. The budget report distinguishes attempted calls from forwarded calls; directory/initialization requests are not task calls. Only one native approval for the owner-registered `form_attach_file` URL/ID/ref is accepted, with empty content and no persisted decision. The pure guard check covers changed tool/scope/arguments, repeated approval and invalid requested-schema shapes. The default observer remains unbounded for unchanged historical scripts.


## One actual Codex turn

Measured code: `949c61a94072e523d8a3e17c39ae3a00e6909fb3`. Codex 0.155.1, gpt-6-astra, low effort. [Raw result](local-attachment-model-1790730751290.json) preserves the source hashes and independent oracle output. The single authorized turn completed in 22.206 seconds; no retry was performed.

The user task named the formal Resume/CV destination and separately registered fictional PDF, without supplying an attachment ID or field ref. The model obtained those from actual `form_context`, then called `form_attach_file`. The wire contained two attempted and two forwarded task calls. One exact native approval was accepted for that thread/turn, owner ID/ref and localhost URL, with no persisted decision.

The independent page oracle read the actual File bytes: 3,863 bytes, SHA-256 `3bed0b9a1f4d358714165ec8ed932e365db6005ceeee2e47fa3c17568b3491a7`. Registration and historical receipt had the same identity/hash. Resume/CV changed once; Autofill from resume and Cover letter each changed zero times. Existing name text was unchanged and submission count was zero. No test helper selected the file for the model.

The actual app-server/MCP/Chromium identities were retained in the result. The app-server configuration file hash was unchanged before/after. Cleanup removed all owned processes, temporary profile, browser session configuration and thread cwd; process inspection found no remaining test/MCP/browser process. Full wire logs and the complete receipt remain in ignored private files (0700 directory/0600 files). The public result contains the fictional inputs, exact tool calls, byte evidence and cleanup verdicts.
