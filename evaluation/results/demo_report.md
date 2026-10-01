# ReturnOps AI — Realistic Demo Fixtures Execution Report

**Dataset Type**: `synthetic_demo`  
**Execution Date**: 2026-09-30T15:04:03.452Z  
**Model**: `gemini-3.5-flash-lite` (via `GEMINI_MODEL`)  
**Pipeline**: Full Production Pipeline (HTTP POST `/api/inspect` -> Gemini -> Zod -> Deterministic Rules -> Supabase Persistence)  

> **CRITICAL DISCLAIMER**: These results reflect a 3-case synthetic demonstration fixture set designed to test visual discrimination without text placards. They are NOT real-customer return data, NOT organizer ground truth, and must NOT be cited as held-out evaluation benchmarks.

## Summary Table

| Case ID | Product | Expected (Id / Comp / Cond / Disp) | Actual (Id / Comp / Cond / Disp) | Agreement | Rule Matched | Latency |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| **CASE-01** | 15-inch Laptop | `PASS/FAIL/PASS/pending_review` | `PASS/FAIL/PASS/pending_review` | ✅ FULL | `rule_6c` | 10572ms |
| **RTN-002** | Wireless Headphones (Noise Cancelling) | `PASS/PASS/PASS/dispose` | `PASS/PASS/PASS/dispose` | ✅ FULL | `rule_5c` | 14036ms |
| **CASE-03** | USB-C Charging Cable 2m | `FAIL/PASS/PASS/pending_review` | `FAIL/PASS/PASS/pending_review` | ✅ FULL | `rule_1` | 5424ms |

## Case-by-Case Breakdown

### CASE-01 — 15-inch Laptop (`DEMO-LAPTOP-001`)

- **Record ID**: `RTN-1790764895346-7WT5E`
- **Latency**: 10572 ms
- **Identity Check**: Actual: **PASS** (conf: 1) vs Expected: **PASS** [AGREE]
  - *Detail*: The product is a 15-inch laptop matching the expected item.; Dell branding is visible on the laptop lid in image_2.
- **Completeness Check**: Actual: **FAIL** (conf: 1) vs Expected: **FAIL** [AGREE]
  - *Detail*: Laptop is present.; Power cable is present, but the power adapter/charger brick is missing.; User guide documentation is present.
  - *Observed Components*:
    - Laptop: `true`
    - Power adapter / charger: `false`
    - Power cable: `true`
    - User documentation: `true`
- **Condition Check**: Actual: **PASS** (Grade: `Used - Good`, State: `signs_of_use`, conf: 0.9) vs Expected: **PASS** (`Used - Like New`) [AGREE]
  - *Detail*: The laptop and user manual show minor wear and smudges consistent with light use.; The power adapter/charger brick is missing from the return.
- **Disposition**: Actual: **`pending_review`** vs Expected: **`pending_review`** [AGREE]
- **Rule Triggered**: `rule_6c` — *Identity PASS, Completeness FAIL, essential missing or Used-Acceptable → pending_review*

### RTN-002 — Wireless Headphones (Noise Cancelling) (`WH-1001`)

- **Record ID**: `RTN-1790780641292-XNAC7`
- **Latency**: 14036 ms
- **Identity Check**: Actual: **PASS** (conf: 0.95) vs Expected: **PASS** [AGREE]
  - *Detail*: The returned item is a pair of black over-ear wireless headphones matching the expected product type.; Visible branding matches the expected configuration.
- **Completeness Check**: Actual: **PASS** (conf: 1) vs Expected: **PASS** [AGREE]
  - *Detail*: All five expected components are clearly visible and present in the return photos.
  - *Observed Components*:
    - Headphones: `true`
    - Charging case: `true`
    - USB-C cable: `true`
    - 3.5mm audio cable: `true`
    - User manual: `true`
- **Condition Check**: Actual: **PASS** (Grade: `Used - Acceptable`, State: `damaged`, conf: 0.95) vs Expected: **PASS** (`Used - Acceptable`) [AGREE]
  - *Detail*: The headphones show severe physical damage including a large crack and broken structural housing near the right earcup hinge.; Numerous surface scratches and wear marks are visible across the headphones.
- **Disposition**: Actual: **`dispose`** vs Expected: **`dispose`** [AGREE]
- **Rule Triggered**: `rule_5c` — *Identity PASS, Completeness PASS, Used-Acceptable + damaged → dispose*

### CASE-03 — USB-C Charging Cable 2m (`SKU-CABLE-USBC`)

- **Record ID**: `RTN-1790764913357-7GHDQ`
- **Latency**: 5424 ms
- **Identity Check**: Actual: **FAIL** (conf: 0.95) vs Expected: **FAIL** [AGREE]
  - *Detail*: The returned item connector clearly shows a proprietary multi-pin flat design (such as a Lightning connector), which does not match an expected USB-C charging cable.
- **Completeness Check**: Actual: **PASS** (conf: 0.9) vs Expected: **PASS** [AGREE]
  - *Detail*: A cable component is visible in the photographs.
  - *Observed Components*:
    - Cable: `true`
- **Condition Check**: Actual: **PASS** (Grade: `Used - Good`, State: `signs_of_use`, conf: 0.85) vs Expected: **PASS** (`Used - Like New`) [AGREE]
  - *Detail*: The connector contacts and surrounding plastic show minor scuff marks and light wear indicating prior use, but no major structural damage or breaks.
- **Disposition**: Actual: **`pending_review`** vs Expected: **`pending_review`** [AGREE]
- **Rule Triggered**: `rule_1` — *Identity FAIL → pending_review*

