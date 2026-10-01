# ReturnOps AI — Build Log

**Track:** Returns Manager (RTN)  
**Agent:** ReturnOps AI — Evidence-First Returns Inspection & Disposition Agent  
**Author:** Kanneboina Shiva Kumar  
**Project Repository:** `cube26-rtn-0034-https-github.com-kanneboinashivakumar`  

---

## Overview

This build log documents the chronological engineering journey of ReturnOps AI, from initial reverse logistics domain analysis through prototype implementation, rigorous benchmark evaluation, and production hardening.

---

## Phase 1 — RTN Problem Understanding

Returns triage is one of the highest friction nodes in modern e-commerce. When a return package arrives at a third-party logistics (3PL) or retail fulfillment center, a human triage operator has roughly 60 seconds to open the outer polymailer, inspect the item, and assign an inventory disposition.

Through analysis of the Returns Manager (RTN) track brief, four fundamental operational questions became clear:
1. **Identity:** Is the item in the box what the customer ordered, or is it a wrong item / fraudulent return?
2. **Completeness:** Are the essential accessories, power supplies, and manuals inside?
3. **Condition:** Is the item pristine (`Grade A`), lightly used (`Grade B`), worn (`Grade C`), or physically damaged (`Damaged`)?
4. **Disposition:** What downstream recovery path should be chosen (`restock`, `refurbish`, `liquidate`, `dispose`, or `pending_review`)?

The core failure in existing operations is not that operators cannot see damage; it is that triage decisions are subjective, undocumented, and disconnected from seller catalogue standards. If an item is routed to restock incorrectly, the next customer receives an open-box or damaged product. If it is routed to liquidation prematurely, the merchant loses 40–70% of product recovery value.

---

## Phase 2 — Architectural Design

To solve this sustainably, I established three core architectural decisions:

1. **Separation of Multimodal Observation and Business Logic:**
   - LLMs should **never** directly assign financial or operational dispositions. LLMs can hallucinate policy leniency, drift under varying temperature, or misunderstand business-critical component rules.
   - **Gemini's role:** Act as a visual observation sensor. Inspect images, check item identity, verify accessory presence against a bill of materials, and report visible defects.
   - **Application code's role:** A deterministic TypeScript disposition engine (`src/lib/disposition-engine.ts`) takes the structured observations and evaluates exact business rules with zero non-deterministic variance.

2. **Tri-State Semantics (`PASS` / `FAIL` / `UNCERTAIN`):**
   - Binary PASS/FAIL systems fail dangerously in real-world triage. When photos are blurry, lighting is poor, or serial numbers are partially hidden, a binary classifier is forced to guess.
   - Forcing a guess causes false restocks (passing damaged items) or false fraud disputes (failing innocent customers).
   - In ReturnOps AI, insufficient visual evidence yields `UNCERTAIN`. The disposition engine treats any `UNCERTAIN` on identity or condition as a routing to `pending_review` (fail-open safety).

3. **Immutable Evidence Record (`EvidenceRecord`):**
   - Every single inspection must produce a canonical, structured JSON record containing captured image URIs, model metadata, confidence scores, observation text, rule execution traces, and SHA-256 content hashes.
   - This record serves as the bridge to downstream pods (such as the Recovery Manager).

---

## Phase 3 — Prototype Development (Screens 1 & 2)

With the architecture defined, I developed the primary operator workstation in Next.js 15 (App Router) and TypeScript:

### Screen 1: Inspection Workstation (`/`)
- Built the return intake interface allowing operators to input Return ID, Customer Order ID, and SKU/ASIN.
- Integrated a mock/catalogue retrieval service (`src/lib/catalogue-service.ts`) that fetches official product title, category, MSRP, component checklists (with essentiality levels: `critical`, `major`, `minor`), and pristine catalogue reference images.
- Implemented multi-file image upload supporting 1 to 5 customer return photos with client-side validation for MIME types and file sizes.
- Structured the Gemini multimodal prompt to explicitly differentiate between **Catalogue Reference Images** (ground truth standard) and **Customer Return Evidence** (item under test).

### Screen 2: Inspection Review & Decision (`/results/[record_id]`)
- Built the review workstation presenting the independent check results:
  - Identity verdict card (model match, brand, color, confidence).
  - Completeness card (component-by-component checklist showing found vs missing items and essentiality).
  - Condition verdict card (cosmetic grade, surface wear, visible defects).
- Displayed the deterministic rule trace step-by-step so the operator understands exactly why `restock`, `refurbish`, `liquidate`, or `pending_review` was recommended.
- Built the human-in-the-loop controls: **Confirm Decision** and **Override Decision**. Overrides require a mandatory explanation and are permanently recorded in the audit trail.

---

## Phase 4 — Evidence & Audit Implementation (Screen 3)

The third user-facing stage was created to satisfy operational auditability requirements:

### Screen 3: Evidence & Audit Record (`/results/[record_id]/evidence`)
- Created a read-only audit viewer designed for senior QA managers, recovery specialists, and customer dispute resolution.
- Added a **Component Evidence Mapping Table** that directly links each expected component in the catalogue bill of materials to its specific photographic evidence.
- Displayed the full deterministic rule trace, complete model runtime metadata (model version, latency in seconds), operator ID, and SHA-256 payload hash.
- Implemented **JSON Export** (downloading the canonical `EvidenceRecord`) and **Print / PDF Sheet** formatting for warehouse physical documentation.

---

## Phase 5 — Realistic Demo Fixtures

To enable immediate, dependable demonstration of the system without manual photo capturing during presentations, I authored three comprehensive demo fixtures under `demo-data/`:

1. **Laptop (SKU: `LAPTOP-PRO-16`, Return: `RTN-001`):**
   - High-value electronics return.
   - Authentic catalogue reference images of the laptop chassis and 140W USB-C charger.
   - Customer return evidence: complete laptop and power adapter in like-new condition.
   - Expected outcome: `PASS` across all checks $\rightarrow$ `restock`.

2. **Headphones (SKU: `AUDIO-HD-900`, Return: `RTN-002`):**
   - Over-ear audio equipment return.
   - Catalogue reference images of headphones, 3.5mm audio cable, and carrying case.
   - Customer return evidence: headphones returned with cracked headband and missing audio cable.
   - Expected outcome: Condition `UNCERTAIN` / Grade B-C, Completeness missing non-critical accessory $\rightarrow$ `refurbish` or `liquidate`.

3. **USB-C Cable (SKU: `CABLE-USBC-2M`, Return: `RTN-003`):**
   - Accessory return with packaging issues.
   - Customer return evidence: opened packaging, minor cable wear.
   - Expected outcome: Identity `PASS`, packaging open $\rightarrow$ `liquidate` / `repackage`.

*Note: These demo fixtures are maintained separately in `demo-data/` and `public/demo-data/` for interactive walkthroughs and do not constitute benchmark ground truth.*

---

## Phase 6 — Phase 8 Evaluation (52 Held-Out Benchmark)

To quantitatively evaluate ReturnOps AI against the RTN challenge requirements, I conducted the Phase 8 evaluation on a frozen set of 52 held-out test cases (`EVAL-001` through `EVAL-052`):

- **Dataset Diversity:** 52 distinct cases covering 9 product categories (Consumer Electronics, Audio, Wearables, Computer Accessories, Mobile Devices, Small Appliances, Cameras & Optics, Power & Cables, Gaming Gear) across 10 operational scenario groups (pristine restock, cosmetic wear, missing essential accessories, box swaps, counterfeit returns, transit damage, blurry evidence, missing minor accessories, defective goods, packaging-only returns).
- **Dual Human Annotation:** Two independent human evaluators labeled all 52 cases across Identity, Completeness, Condition, and Final Disposition. Inter-annotator agreement achieved Cohen's Kappa $\kappa = 1.000$ (complete consensus).
- **Evaluation Engine:** Executed automated headless evaluation using `scripts/evaluate-phase8.ts` against the frozen cases.
- **Phase 8 v1.0 Baseline Results:**
  - Overall Disposition Accuracy: **71.2%** (37 / 52)
  - Identity Check Accuracy: **84.6%** (44 / 52)
  - Completeness Check Accuracy: **80.8%** (42 / 52)
  - Condition Verdict Accuracy: **76.9%** (40 / 52)
  - Exact Condition Grade Match: **55.8%** (29 / 52)
  - **Critical Restock Safety Errors:** **0.0%** (0 / 52 — zero damaged or wrong items routed to restock)
  - Median Processing Latency: **9.04 seconds** (P95: 16.01s)
  - API Success Rate: **100%** (52 / 52 calls succeeded)
  - Estimated API Cost: **$0.00028 per return unit**

---

## Phase 7 — Evaluation Audits & Integrity Checks

Following the initial benchmark run, I performed three targeted integrity audits to verify that the evaluation was technically sound:

1. **Model-Version Integrity Audit:**
   - Verified that all 52 cases were executed against the same model version (`gemini-2.0-flash-lite` via `@google/genai`).
   - Confirmed temperature was pinned to 0.0 to eliminate sampling variance.
2. **Rate-Limit & Latency Audit:**
   - Analyzed the distribution of response times. Verified that zero requests were throttled (HTTP 429) or timed out.
   - Confirmed that P95 latency (16.01s) remained well within the 60-second warehouse operational window.
3. **Fixture Validity Audit:**
   - Audited the physical structure of the 156 images in `evaluation/fixtures/held_out/`.
   - Documented the critical technical finding: the held-out benchmark images were generated as synthetic SVG vector cards (using the Sharp graphics library) containing visual metadata placards, rather than photographs captured by camera sensors in a real warehouse.

---

## Phase 8 — Hardening & The v1.1 Guardrail Insight

To improve anti-fraud resilience against printed placards or photo spoofing, I tested a hardened prompt configuration (v1.1) that included an explicit physical-evidence instruction: *"Report UNCERTAIN if evidence consists solely of text cards, placards, or non-photographic diagrams without physical merchandise."*

When evaluated against the 52 held-out cases, this yielded an unexpected and important finding:
- Gemini strictly obeyed the new instruction and correctly classified 22 of the synthetic test cards as `UNCERTAIN` because they were indeed vector placards rather than physical merchandise.
- Because these 22 synthetic cases were intended by the test author to represent physical items, the nominal benchmark disposition accuracy dropped from 71.2% to **59.6%** (31 / 52).
- Crucially, **safety was completely preserved:** Critical restock safety errors remained at **0.0%** (0 / 52). No damaged or fraudulent item was routed to restock.
- Median latency improved to **5.54 seconds**.

**Engineering Takeaway:** Rather than hiding this result or silently reverting the prompt, both v1.0 and v1.1 were fully documented in `docs/EVALUATION.md` and `evaluation/results/V1_0_VS_V1_1_COMPARISON.md`. It highlights the necessity of using real lens-captured photography for production benchmark validation.

*Note on Phase 9: A subsequent phase proposing 250+ real photographic warehouse captures was scoped as future work and was **not executed** in Round 2.*

---

## Final Verification & Repository State

Prior to submission freeze, the entire codebase was audited and validated:
- **Test Suite:** 12 test suites, **104 / 104 unit and integration tests passing** (`npm test`).
- **Type Checking:** Zero TypeScript compiler errors (`npm run type-check`).
- **Production Build:** Next.js production build succeeds cleanly (`npm run build`).
- **Security Audit:** Zero detected API keys, credentials, or secrets in git tracking.
- **Deployment:** Live on Vercel at `https://returnops-ai.vercel.app`.
