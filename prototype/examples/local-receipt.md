# Local filling receipt

As of: 2026-09-29T22:46:39.279Z (apply)

**Historical snapshot — current state has not been revalidated.** Later manual edits, dynamic questions, navigation and changed source files are not reflected. Exporting does not inspect the page or change the active plan.

Page: http://127.0.0.1:51368/form

| Historical verdict | Value |
| --- | --- |
| Last operation requested targets complete | true |
| Accumulated requested targets complete | — |
| Visible required coverage | false |
| Source extraction coverage | text entries; no image coverage reported |
| Server acceptance | not verified; public wording below is page data |

## Observed fields (as of snapshot)

| Ref | Group | Label | Kind | Observed value | Required | Valid | Pending |
| --- | --- | --- | --- | --- | --- | --- | --- |
| f1 |  | Name | text | Alex &#124; &lt;script&gt; &amp; &#42;&#42;Example&#42;&#42; | true | true | false |
| f2 |  | Email | email | alex@example.test | true | true | false |
| f3 |  | Start date | date |  | true | false | false |

## Source bindings (last operation)

| Ref | Source IDs | Exact quote | Source label | Target group |
| --- | --- | --- | --- | --- |
| f1 | s1 | — | Name |  |
| f2 | s2 | — | Email |  |

## Requested source targets (historical ledger)

| Ref | Group | Label | Source IDs | Exact quote | Status | Reason | Presence |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Read-back evidence (last operation)

| Group | Label | Expected | Actual | Status | Reason |
| --- | --- | --- | --- | --- | --- |
|  | Name | Alex &#124; &lt;script&gt; &amp; &#42;&#42;Example&#42;&#42; | Alex &#124; &lt;script&gt; &amp; &#42;&#42;Example&#42;&#42; | verified | — |
|  | Email | alex@example.test | alex@example.test | verified | — |

## Unresolved required fields (historical)

| Group | Label | Reason |
| --- | --- | --- |
|  | Start date | not-bound-to-source |

## Referenced source entries

SHA-256: 613823d8b3cec7d9fc00fa2d7c5dc995c669badd55361130d1265017467c86e8

| ID | Context / label | Original text | Line / page / bounds |
| --- | --- | --- | --- |
| s1 | Name | Alex &#124; &lt;script&gt; &amp; &#42;&#42;Example&#42;&#42; | {"line":1} |
| s2 | Email | alex@example.test | {"line":2} |

## Source extraction and unread image regions

No extraction coverage object for this source format.

## Public page save/status wording (historical; not server acceptance)

{"messages":&#91;{"role":"status","text":"Unsaved &#124; draft &lt;example&gt;","fieldRefs":&#91;"f1","f2","f3"&#93;}&#93;,"busy":&#91;&#93;,"truncated":false}

## Operation outcome / limitations

{"coverage":{"scope":"Visible enabled required fields only; hidden steps and server acceptance are not covered.","limitations":{"requiredness":"Native required and aria-required only; visual-only markers may be missed.","iframes":0,"shadowRoots":false},"requiredUnits":3,"verifiedRequiredUnits":2,"unresolvedRequired":&#91;{"ref":"f3","group":"","label":"Start date","kind":"date","reason":"not-bound-to-source"}&#93;,"visibleRequiredCovered":false,"unsupported":&#91;&#93;},"limitations":{"requiredness":"Native required and aria-required only; visual-only markers may be missed.","iframes":0,"shadowRoots":false}}
