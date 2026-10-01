# ReturnOps AI — Executive One-Pager

> **"An evidence-first returns inspection agent that verifies identity, completeness, condition, and next action from catalogue standards and customer return evidence."**

---

## 1. The Operational Problem

Warehouse returns operators face an unforgiving 60-second triage challenge per returned package. They must determine whether the item is genuine, whether essential cables or adapters were stolen, whether physical damage exists, and what financial disposition to assign. 

Subjective triage leads to **catastrophic restock errors** (reselling incomplete laptops or damaged goods), **excessive margin destruction** (liquidating pristine returns for pennies), **inter-shift inconsistency**, and **zero evidentiary auditability** when merchants or customers dispute claims.

---

## 2. The ReturnOps Workflow

```
Catalogue Standards (Specs, Components, Pristine Photos)
                        +
Customer Return Evidence (1–5 Photos Uploaded by Handler)
                        ↓
            Multimodal Inspection (Gemini)
                        ↓
    Three Strictly Independent Visual Checks:
   [Identity]       [Completeness]      [Condition]
         ↓                 ↓                 ↓
      PASS   /   FAIL   /   UNCERTAIN
                        ↓
      Deterministic Application Disposition Rules
  (restock · refurbish · liquidate · dispose · pending_review)
                        ↓
            Operator Confirm or Override
                        ↓
      Cryptographic EvidenceRecord (SHA-256)
                        ↓
       Screen 3: Evidence & Audit Record
```

---

## 3. Product Workstation Screens

1. **Screen 1 — Inspection Workstation (`/`):**  
   Intake terminal where the handler inputs Return ID, Customer Order ID, and SKU. Clicking **Fetch Standards** populates the catalogue bill of materials and pristine reference photos. Handlers upload 1–5 customer return photos and trigger inspection.
2. **Screen 2 — Inspection Review & Decision (`/results/[record_id]`):**  
   Operations review dashboard displaying independent check verdicts, confidence scores, visual findings, side-by-side evidence images, deterministic rule trace, and final disposition. Handlers can **Confirm Disposition** or enter a required reason to **Override Decision**.
3. **Screen 3 — Evidence & Audit Record (`/results/[record_id]/evidence`):**  
   Read-only operational audit viewer containing component-to-evidence checklist tables, full rule execution trace, printable formatted PDF report, and official JSON evidence contract download.

---

## 4. Engineering Architecture

* **Framework:** Next.js 16.3 (App Router with Server Actions & Route Handlers)
* **Language & Typing:** TypeScript (Strict Mode, 100% type-checked, 0 compiler warnings)
* **AI Provider:** Google Gemini (`gemini-3.5-flash-lite` via `@google/generative-ai`)
* **Persistence & Security:** Supabase PostgreSQL with Multi-Tenant Row Level Security (RLS)
* **Validation & Schemas:** Zod (`InspectionInput`, `InspectionObservation`, `EvidenceRecord`)
* **Hashing & Integrity:** SHA-256 canonical cryptographic hash per inspection record
* **Deployment:** Vercel Edge & Serverless Functions with static asset serving

---

## 5. Frozen Evaluation Benchmark (Phase 8)

Evaluated across **52 held-out return cases** (`EVAL-001` to `EVAL-052`) spanning 9 merchandise categories and 10 operational scenario types against dual-annotated human ground truth (Cohen's Kappa $\kappa = 1.000$):

| Metric Dimension | Phase 8 v1.0 (Frozen Baseline) | Phase 8 v1.1 (Stricter Guardrail) | Target / Tolerance |
| :--- | :---: | :---: | :---: |
| **Overall Disposition Accuracy** | **71.2%** (37 / 52) | **59.6%** (31 / 52) | $\ge 70.0\%$ |
| **Identity Check Accuracy** | **84.6%** (44 / 52) | **53.8%** (28 / 52) | $\ge 80.0\%$ |
| **Completeness Check Accuracy** | **80.8%** (42 / 52) | **48.1%** (25 / 52) | $\ge 80.0\%$ |
| **Condition Verdict Accuracy** | **76.9%** (40 / 52) | **50.0%** (26 / 52) | $\ge 75.0\%$ |
| **Exact Condition Grade Match** | **55.8%** (29 / 52) | **48.1%** (25 / 52) | $\ge 50.0\%$ |
| **Critical Safety Error Rate** | **0.0%** (0 / 52) | **0.0%** (0 / 52) | **0.0% (Zero Tolerated)** |
| **False Positive Identity Rate** | **0.0%** (0 / 4) | **0.0%** (0 / 4) | **0.0% (Zero Tolerated)** |
| **Median Processing Latency** | **9.04 seconds** | **5.54 seconds** | $< 15.0\text{s}$ |
| **95th Percentile Latency (P95)** | **16.01 seconds** | **10.08 seconds** | $< 25.0\text{s}$ |
| **Unit Inspection Cost** | **$0.00028 USD** | **$0.00028 USD** | $< \$0.01$ |

> **IMPORTANT BENCHMARK LIMITATION:**  
> The 52 held-out evaluation cases used synthetic SVG/vector placards rather than lens-captured camera photographs. While this verified deterministic rule execution and safety bounds, these figures **must not be characterized as real-world photographic accuracy**. Real photographic verification was conducted separately on 3 multi-image demonstration fixtures (Laptop, Headphones, USB-C Cable). Phase 9 (large-scale photographic dataset collection) is planned future work and was not executed.

---

## 6. Key Engineering Decision

> **"AI observes; deterministic application logic decides disposition; evidence records preserve why."**

By preventing Gemini from generating business dispositions directly and requiring deterministic evaluation of observable facts, ReturnOps AI eliminates AI policy drift, guarantees safety bounds, and preserves auditability.

---

## 7. Kill Condition

> **If an inspection cannot provide cryptographic proof of why a disposition was assigned from observable evidence, or if an automated agent ever routes physically damaged or wrong-item merchandise to restock without human review, the system must not be deployed to production.**

---

## 8. Honest Operational Limitations

1. **No Tactile or Mechanical Sensing:** Computer vision cannot test internal battery health, smell liquid contamination, or test stiff laptop hinges. Tactile inspection remains in human hands.
2. **Lighting & Occlusion Sensitivity:** Dark cables placed against dark retail cartons can trigger conservative `UNCERTAIN` verdicts on Completeness.
3. **Packaging Integrity Dependency:** Internal components inside sealed opaque cartons are verified via factory shrinkwrap integrity rules, not by X-ray vision.
