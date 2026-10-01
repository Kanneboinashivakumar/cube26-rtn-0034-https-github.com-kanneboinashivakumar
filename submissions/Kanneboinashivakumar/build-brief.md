# ReturnOps AI — Build Brief

**Track:** Returns Manager (RTN)  
**Agent:** ReturnOps AI — Evidence-First Returns Inspection & Disposition Agent  
**Author:** Kanneboina Shiva Kumar  
**Target Submission:** CUBE Buildathon Round 2  

---

## 1. Objective

The objective of ReturnOps AI is to build an **evidence-first returns inspection and disposition agent** for reverse logistics triage operators.

In high-volume e-commerce return hubs, unboxing stations handle hundreds of items per shift. Operators face relentless throughput pressure (~60 seconds per package) to decide whether a returned item should be returned to inventory, refurbished, liquidated, recycled, or flagged for customer fraud.

Current operational workflows suffer from three structural flaws:
1. **Subjective triage:** Different operators assign different condition grades and dispositions to identical returns.
2. **Disjointed standards:** Operators rarely have catalogue reference specs and accessory checklists immediately visible while inspecting physical items.
3. **No audit trail:** When a damaged or wrong item erroneously reaches restock—or when a legitimate customer's refund is rejected—there is no tamper-proof record showing the photos inspected, the checks evaluated, or the rule path that triggered the decision.

ReturnOps AI solves this by introducing a structured, evidence-grounded workflow: **Multimodal AI observes visual facts, deterministic application logic evaluates business rules, and an immutable Evidence Record preserves the audit trail.**

---

## 2. The Four Core Operational Questions

Every returns triage decision boils down to answering four foundational questions in sequence:

### Question 1: Identity
*Is the returned item actually what the customer bought?*
- Verifies make, model, form-factor, branding, and color against authentic seller catalogue standards.
- Detects box-swaps, counterfeit substitutions, and erroneous product returns.
- Output: `PASS` (verified match), `FAIL` (wrong product / swap), or `UNCERTAIN` (insufficient evidence / obscured identifiers).

### Question 2: Completeness
*Are all required components, cables, and accessories present in the package?*
- Compares package contents against the product's catalogue bill of materials.
- Categorizes missing items by business essentiality (`critical`, `major`, `minor`).
- Output: `PASS` (all required parts present), `FAIL` (essential components missing), or `UNCERTAIN` (contents obscured / unboxed).

### Question 3: Condition
*What is the physical and cosmetic condition of the primary item and its packaging?*
- Detects surface scratches, cracks, dents, liquid residue, signs of heavy use, and packaging seal status.
- Assigns a standardized cosmetic grade (`Grade A` / Like New, `Grade B` / Light Wear, `Grade C` / Heavy Wear, `Damaged` / Broken).
- Output: `PASS` (pristine / minor cosmetic wear within restock tolerance), `UNCERTAIN` (visible cosmetic wear or partial view), or `FAIL` (severe structural damage / shattered).

### Question 4: Disposition
*What should happen to this return next?*
- Evaluates the three independent check results against deterministic business disposition rules.
- Assigns one of five operational paths:
  - `restock` — Return to active inventory (all checks PASS, Grade A, complete).
  - `refurbish` — Route to secondary grading / repackaging (minor cosmetic wear or repackageable).
  - `liquidate` — Route to wholesale auction / bulk clearance (functional but Grade C or missing non-critical accessory).
  - `dispose` — Recycle / scrap (shattered, unsalvageable, or bio-hazard).
  - `pending_review` — Escalate to senior specialist (wrong item, missing essential parts, or UNCERTAIN evidence).

---

## 3. MVP Scope

The ReturnOps AI MVP delivers a complete, cohesive three-screen operator workflow backed by structured multimodal intelligence:

### 1. Intake & Catalogue Standards Retrieval (Screen 1)
- Operator enters Return ID, Customer Order ID, and SKU/ASIN.
- System fetches verified seller catalogue standards: title, brand, category, MSRP, component checklists, and pristine catalogue reference images.
- System surfaces component essentiality rules so the operator knows which missing items block restock.

### 2. Multi-Image Return Evidence Capture (Screen 1)
- Operator uploads 1 to 5 photos of the return: product front/back, opened packaging, serial label, and accessories.
- Client-side validation enforces image count, format (`image/jpeg`, `image/png`, `image/webp`), and size constraints (<10MB).
- Prepared realistic demo fixtures allow instant end-to-end evaluation of common electronics and accessories.

### 3. Multimodal Inspection Execution (Headless API & UI)
- Gemini 3.5 Flash-Lite runs structured visual inspection via strict JSON schema enforcement (`gemini-2.0-flash-lite` provider).
- The prompt explicitly segregates catalogue reference images from customer return evidence images.
- Independent checks: Identity, completeness, and condition are evaluated separately without cross-contamination.

### 4. Tri-State Verdict Semantics (`PASS` / `FAIL` / `UNCERTAIN`)
- Every check evaluates to `PASS`, `FAIL`, or `UNCERTAIN`.
- Ambiguous photos, blurry focus, obscured serials, or partial views yield `UNCERTAIN`—never a forced `PASS` or `FAIL`.

### 5. Deterministic Disposition Engine
- Final disposition is computed exclusively by deterministic TypeScript business rules (`src/lib/disposition-engine.ts`), never by the LLM.
- Rule execution produces a step-by-step `rule_trace` detailing every condition evaluated and the exact threshold that triggered the outcome.
- Restock safety gate: Any `FAIL` on identity, any missing `critical` component, or any condition failure categorically blocks `restock`.

### 6. Review & Human Override (Screen 2)
- Operator reviews independent check verdicts, confidence scores, visual findings, and recommended disposition.
- Operator can click **Confirm Disposition** or execute an **Override Disposition**.
- Overrides strictly require an operator rationale, select a new target disposition, and preserve the original AI recommendation in the audit log.

### 7. Evidence & Audit Record (Screen 3)
- Dedicated read-only view (`/results/[record_id]/evidence`) rendering the official `EvidenceRecord`.
- Visual component-to-evidence checklist table mapping each expected component to physical photos.
- Immutable metadata: capture timestamp, model name, processing latency, operator ID, and SHA-256 content hash.
- Export capabilities: Structured JSON download and print-ready formatted audit sheet.

---

## 4. Explicit Non-Goals

To maintain high architectural focus and operational reliability, the following areas were explicitly placed outside the MVP scope:

1. **Full Warehouse Management System (WMS/ERP):** ReturnOps AI is an inspection and disposition agent, not an inventory ledger, bin allocator, or shipping label broker. It integrates downstream via its `EvidenceRecord` JSON contract.
2. **Custom Computer Vision Model Training:** Rather than maintaining fragile custom object detection / segmentation models (YOLO, Mask R-CNN) that require constant retraining for every new SKU, ReturnOps AI leverages multimodal foundation models (Gemini) guided by catalogue reference images and structured schemas.
3. **Automated End-to-End Restocking Without Human Oversight:** Autonomous unassisted restock is a dangerous failure mode. The system is intentionally designed as an operator copilot; the operator confirms or overrides every disposition.
4. **Multi-Tenant User Management & Billing Portals:** Not building tenant authentication, OAuth role pickers, or Stripe billing wrappers. The focus is purely on the inspection workstation ergonomics and disposition accuracy.
5. **Robotic Sorting Automation:** Physical conveyor actuation, robotic arms, and barcode sorting hardware integrations are left to specialized warehouse automation controllers.
6. **Phase 9 Large-Scale Photographic Dataset Collection:** A planned 250+ real warehouse capture benchmark was scoped as future work and was **not executed** during Round 2. The frozen evaluation benchmark remains Phase 8 (52 held-out test cases).

---

## 5. Architectural Guardrails & Success Criteria

| Guardrail | Enforcement Mechanism |
|---|---|
| **Separation of Concerns** | Gemini observes visual evidence; deterministic code computes dispositions. |
| **Fail-Open on Uncertainty** | Any `UNCERTAIN` verdict routes to `pending_review` (never automated restock). |
| **Check Independence** | Failing identity does not skip completeness or condition analysis. |
| **Tamper-Proof Audit** | Every record includes a SHA-256 payload hash and immutable override history. |
| **Restock Safety Target** | 0.0% critical restock safety errors on the held-out test suite. |
| **Operational Latency** | Median inspection time under 10 seconds per item. |
