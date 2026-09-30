# Dependencies and attribution

Project code is MIT licensed; dependency packages keep their own licenses.
Dependencies are installed from their package registries, not vendored here.

| Direct JavaScript dependency | License |
|---|---|
| @modelcontextprotocol/sdk | MIT |
| ws | MIT |
| zod | MIT |
| @playwright/mcp | Apache-2.0 |
| playwright | Apache-2.0 |
| @radix-ui/react-select | MIT |
| esbuild | MIT |
| react / react-dom | MIT |
| react-select | MIT |

Versions and transitive dependencies are recorded in `package-lock.json`.
The optional PDF reader installs `pdfplumber` using
`prototype/requirements-pdf.txt`; its package and dependencies retain their
upstream license files. Chromium is downloaded by Playwright and is not
included in this repository.

`prototype/reports/source-snapshots/` contains measured versions of this
project's code. Public-page reports record observations for engineering
experiments. The PDF fixtures and demo screenshot use fictional source facts;
PDF generation is in `prototype/bench/pdf/build.py`.
