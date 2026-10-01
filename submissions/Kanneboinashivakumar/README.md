# Kanneboinashivakumar · Returns Manager

**Agent:** ReturnOps AI — Evidence-First Returns Inspection & Disposition Agent  
**Author:** Kanneboina Shiva Kumar  
**Track:** Returns Manager (RTN)  
**Live Deployment:** [https://returnops-ai.vercel.app](https://returnops-ai.vercel.app)  
**GitHub Repository:** [https://github.com/Kanneboinashivakumar/cube26-rtn-0034-https-github.com-kanneboinashivakumar](https://github.com/Kanneboinashivakumar/cube26-rtn-0034-https-github.com-kanneboinashivakumar)  
**Demo Video:** _[Placeholder — Record 3-minute walkthrough demonstrating Screen 1 intake, Screen 2 disposition review, and Screen 3 evidence audit record]_  

---

## Expected layout

```
submissions/Kanneboinashivakumar/
├── README.md            ← this file: who you are, links to everything below
├── 01-customer-letter.md
├── 02-prfaq.md          ← include the questions you'd rather not answer
├── 03-one-pager.md      ← metrics table + at least one kill condition
├── CLAUDE.md            ← durable constraints, hard rules, forbidden language
├── build-brief.md
├── build-log.md         ← keep it current; organisers read it
├── eval-report.md       ← method, two-labeller agreement, per-check FP / FN, failure modes
├── contract/            ← your evidence-record shape, as agreed with the other pods
└── agent/               ← your code (headless first)
```

---

## Status

| Face | Deliverable | Status | Location / Reference |
|---|---|:---:|---|
| **1** | Customer letter, PR/FAQ, one-pager | ☑ Complete | [`./01-customer-letter.md`](./01-customer-letter.md), [`./02-prfaq.md`](./02-prfaq.md), [`./03-one-pager.md`](./03-one-pager.md) |
| **2** | CLAUDE.md | ☑ Complete | [`./CLAUDE.md`](./CLAUDE.md) |
| **3** | Headless agent on fixtures | ☑ Complete | [`./agent/README.md`](./agent/README.md) & root [`../../src/`](../../src/) |
| **4** | Eval report | ☑ Complete | [`./eval-report.md`](./eval-report.md) & [`../../docs/EVALUATION.md`](../../docs/EVALUATION.md) |
| **5** | Evidence record page | ☑ Complete | Production UI at [`../../src/app/results/[record_id]/evidence/`](../../src/app/results/[record_id]/evidence/) |
| **6** | Cross-pod contract | ☑ Complete | [`./contract/evidence-record.md`](./contract/evidence-record.md) |

---

## Kill condition

_If an automated returns inspection system cannot traceably prove why a disposition was assigned from observable evidence, or if it ever routes physically damaged or wrong-item merchandise to restock without human review, the system must not be deployed to production._

---

## Executive Overview

ReturnOps AI is an evidence-first returns inspection and disposition agent built for warehouse returns workstations. It addresses the four foundational operational questions every returns handler must answer when a package is unboxed:

1. **Identity:** Is the returned item what was actually sold, or is it a wrong product / counterfeit?
2. **Completeness:** Are all required accessories and essential components present?
3. **Condition:** What physical condition is the item in, and what cosmetic wear or damage is visible?
4. **Disposition:** What business action should be taken next (`restock`, `refurbish`, `liquidate`, `dispose`, or `pending_review`)?

Rather than letting a generative AI model guess business dispositions or decide whether missing accessories matter, ReturnOps AI enforces a strict architectural boundary: **multimodal AI observes visual facts; deterministic application rules decide business outcomes.** Every inspection produces an immutable, SHA-256 hashed `EvidenceRecord` that flows downstream into recovery and dispute workflows.

---

## Submission Workspace Index

### Core Deliverables
- [`01-customer-letter.md`](./01-customer-letter.md) — Operational problem statement from warehouse returns triage.
- [`02-prfaq.md`](./02-prfaq.md) — Product PR/FAQ addressing operational design and hard edge-case questions.
- [`03-one-pager.md`](./03-one-pager.md) — High-density product, architecture, and frozen benchmark summary.
- [`CLAUDE.md`](./CLAUDE.md) — Project hard constraints, check independence rules, and forbidden patterns.
- [`build-brief.md`](./build-brief.md) — Product scope, four operational questions, MVP boundaries, and non-goals.
- [`build-log.md`](./build-log.md) — Chronological engineering milestones from intake architecture to evaluation audits.
- [`eval-report.md`](./eval-report.md) — 52-case frozen benchmark metrics, v1.0 vs v1.1 findings, and synthetic placard limitations.
- [`contract/evidence-record.md`](./contract/evidence-record.md) — Official JSON evidence contract, schema definitions, and cross-pod integration specification.
- [`agent/README.md`](./agent/README.md) — Headless agent reference, test suite runners, and CLI usage.

### Canonical Technical Documentation
- [`../../README.md`](../../README.md) — Full repository overview, setup instructions, and quickstart commands.
- [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) — Complete 5-stage returns chain, data flow diagrams, and schema specifications.
- [`../../docs/EVALUATION.md`](../../docs/EVALUATION.md) — Detailed Phase 8 held-out evaluation methodology and dual-annotator metrics.
- [`../../docs/FAILURE_MODES.md`](../../docs/FAILURE_MODES.md) — Complete 15-case disagreement catalog and operational mitigations.
- [`../../evaluation/results/BENCHMARK_FIXTURE_VALIDITY_AUDIT.md`](../../evaluation/results/BENCHMARK_FIXTURE_VALIDITY_AUDIT.md) — Empirical audit of the 156 synthetic evaluation images and guardrail interactions.
- [`../../evaluation/results/V1_0_VS_V1_1_COMPARISON.md`](../../evaluation/results/V1_0_VS_V1_1_COMPARISON.md) — Comparative report analyzing the v1.0 baseline against the v1.1 physical-evidence guardrail.

---

## Architectural & Prototype Flow

The ReturnOps AI prototype is structured into three connected operational screens:

```
Screen 1: Inspection Workstation
  (Intake Return ID / Order ID / SKU → Fetch Catalogue Standards → Operator Uploads Return Evidence)
       ↓
  Run Multimodal Inspection (Gemini 3.5 Flash-Lite)
       ↓
Screen 2: Inspection Review & Decision
  (Identity / Completeness / Condition Checks → Deterministic Disposition → Confirm or Override)
       ↓
  View Evidence & Audit
       ↓
Screen 3: Evidence & Audit Record
  (Read-only comprehensive audit: Metadata, Component Evidence Mapping, Rule Trace, JSON Contract, Timeline)
```

1. **Screen 1 (`/`):** Operator enters Return ID, Customer Order ID, and SKU/ASIN. Clicking **Fetch Standards** retrieves authentic catalogue metadata, expected components checklists, and pristine catalogue reference photos. The operator captures or uploads 1–5 customer return evidence photos and triggers inspection.
2. **Screen 2 (`/results/[record_id]`):** Displays independent check verdicts (Identity, Completeness, Condition) with confidence scores, detailed observations, side-by-side evidence images, deterministic rule trace, and final disposition. The operator can **Confirm Disposition** or enter a required reason to **Override Disposition**.
3. **Screen 3 (`/results/[record_id]/evidence`):** Read-only operational audit record showing the component-to-evidence checklist table, full rule execution logic, formatted PDF printable report, JSON download, and complete audit trail.

---

## Codebase Structure Note

To preserve clean repository architecture and prevent code duplication, the authoritative implementation resides directly in the root [`src/`](../../src/) directory. The [`agent/`](./agent/) directory contains the execution instructions and component pointers for running the headless agent against the 52 frozen fixtures. Full test suites are located in [`tests/`](../../tests/) and runnable via `npm test`.
