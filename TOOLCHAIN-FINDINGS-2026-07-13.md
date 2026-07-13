# PBI toolchain findings — 2026-07-13 (Tonkin Daily Tasks build)

Four defects surfaced building + redesigning a real PBIP report (Tonkin `tonkin-st-tasklist`
Daily Tasks v0.5). Each **passed every headless validator** and was caught only by Power BI
Desktop — so they're gaps in the headless layer that matters most. Listed with repro +
proposed fix. Two are in **pbip-tools**, one in **pbivisual-json**, one is a skill-doc fix
(already corrected in `libs/config`).

---

## 1. `pbip_validate_tmdl` has NO circular-dependency rule  [pbip-tools · BPA]

**Severity: high** — it reported **0 errors** on a model Power BI Desktop *refused to load*.

**Repro.** A calculated column sorted (`sortByColumn`) by another calculated column that is
derived FROM it. `sortByColumn` is itself a dependency edge, so:
```
column 'Due Status'        = SWITCH(TRUE(), ... )   sortByColumn: 'Due Status Order'
column 'Due Status Order'  = SWITCH('Due Status', "Overdue",1, ...)   // derives FROM Due Status
```
Desktop: *"A circular dependency was detected: Daily_Tasks[Due Status],
Daily_Tasks[Due Status Order], Daily_Tasks[Due Status]"*. `pbip_validate_tmdl` = 0 errors.

A second cycle class: a **measure referenced inside a calculated column** (implicit CALCULATE
→ context transition → the column depends on every column of the table, incl. ones derived
from it).

**Proposed fix.** Add a BPA rule `error_prevention / circular_dependency` that builds the
column/measure dependency graph and flags cycles. Edges to include: (a) column-formula field
references, (b) **`sortByColumn`** (the one most people miss), (c) measure references inside a
calculated column expand to all columns of the home table (context transition). Report the
cycle path like Desktop does.

**Workaround we used.** Build all derived/sort-key columns in Power Query (M) instead of DAX —
data columns have no formula graph, so no cycle is possible. (Also the better modelling choice.)

---

## 2. Offline DAX parser false-positive on empty-string literal before a grouping `)`  [pbip-tools · pbip_validate_dax]

**Severity: medium** — rejects valid DAX; risks users "fixing" correct code.

**Repro.** `pbip_validate_dax` on this **valid** expression:
```dax
IF ( ( "a" <> "" || "b" <> "" ) && "c" <> "", 1, 0 )
```
→ `{ "valid": false, "issues": [{ "severity":"error",
"message":"Missing operand before closing parenthesis" }] }`

Minimal trigger: an empty-string literal `""` as the right operand immediately before a
**grouping** close-paren (`… <> "" )`). Desktop + the DAX engine accept it. Simplify to a
non-grouping context and it passes, so it's the parser's handling of `""` before `)` in a
parenthesised sub-expression.

**Proposed fix.** In the offline DAX tokenizer/parser, an empty string literal `""` is a
complete operand; it must satisfy the operand-before-`)` check the same as any other literal.
Add the above as a regression fixture.

---

## 3. `lint-instance` + `validate-structural` miss PBIR property PLACEMENT  [pbivisual-json]

**Severity: medium** — a schema-invalid visual.json passes both checks; Desktop flags it.

**Repro.** Emit `filterConfig` INSIDE the `visual` object instead of at the visual.json top
level (it's a sibling of `visual`/`name`/`position` per the visualContainer schema):
```json
{ "name": "...", "position": {...},
  "visual": { "visualType": "pivotTable", ..., "filterConfig": { "filters": [...] } } }  // WRONG
```
`lint-instance` → OK. `validate-structural` → PASS (checks type/box/bindings vs spec, not
placement). Desktop on load → *"An additional property 'filterConfig' was included in the
/visual property."*

**Proposed fix.** Validate emitted `visual.json` against the **visualContainer JSON schema**
(the `$schema` each file already references), or at minimum assert a known set of top-level vs
`visual`-nested keys. This class (right property, wrong nesting level) is invisible to the
current structural + lint checks. Add `filterConfig-in-/visual` as a negative fixture.

---

## 4. `pbi-semantic-model` SKILL.md wrongly claimed Bridge reload re-applies model TMDL  [libs/config skill — FIXED]

**Severity: low (doc), but caused real friction.** The skill said the Desktop Bridge
`file.reload/v1` "re-applies the model definition (TMSL/TMDL) by default." It does **not** —
reload is **report-definition only** (as `bridge-capture.mjs` correctly states). A measure
added to `.tmdl` on disk is not in Desktop's live engine until the file is **reopened**; a
visual bound to it errors and the reload silently keeps the old model. Corrected in the skill
2026-07-13.

---

### Cross-cutting note
All four are **headless-validator gaps**: `pbip_validate_tmdl`, `pbip_validate_dax`,
`lint-instance`, and `validate-structural` were green while Desktop rejected the model / visual.
Worth a "headless checks are necessary, not sufficient — Desktop load + `mcp-engine run_query`
are the authoritative gates" note in the pbip-tools README, and the three code fixes above narrow
the gap. Full context: `tonkin-st-tasklist/docs/2026-07-13-session-learnings-pbi-workflow.md`.
