# Headless Agent & Implementation Reference

**Track:** Returns Manager (RTN)  
**Agent:** ReturnOps AI — Evidence-First Returns Inspection & Disposition Agent  
**Deliverable:** Face 3 (Headless agent on fixtures)  

---

## Authoritative Implementation Location

To maintain single-source-of-truth software engineering practices and prevent code drift across duplicate directories, the production code is maintained directly in the root repository:

- **Source Code:** [`../../../src/`](../../../src/)
- **Test Suites:** [`../../../tests/`](../../../tests/) (104/104 passing tests)
- **Held-Out Fixtures:** [`../../../evaluation/fixtures/held_out/`](../../../evaluation/fixtures/held_out/) (52 test cases)
- **Evaluation Runner:** [`../../../scripts/run-held-out-eval.js`](../../../scripts/run-held-out-eval.js)

---

## Core Headless Components

The headless agent is built on a strict separation of multimodal vision and deterministic business rules:

1. **Multimodal Inspection Engine:** [`../../../src/lib/providers/gemini-provider.ts`](../../../src/lib/providers/gemini-provider.ts)
   - Executes structured observation calls using Gemini 3.5 Flash-Lite (`gemini-2.0-flash-lite`).
   - Ingests catalogue reference images and customer return photos.
   - Enforces tri-state observation schemas (`PASS` / `FAIL` / `UNCERTAIN`) for Identity, Completeness, and Condition.

2. **Deterministic Disposition Engine:** [`../../../src/lib/disposition-engine.ts`](../../../src/lib/disposition-engine.ts)
   - Pure TypeScript business rule evaluator with zero LLM non-determinism.
   - Evaluates independent check verdicts against catalogue essentiality rules.
   - Generates complete audit rule traces and assigns final dispositions (`restock`, `refurbish`, `liquidate`, `dispose`, `pending_review`).

3. **Official Data Contracts:** [`../../../src/lib/schemas.ts`](../../../src/lib/schemas.ts)
   - Authoritative Zod schemas for `InspectionObservation`, `InspectionInput`, and `EvidenceRecord`.

4. **Catalogue Standards Service:** [`../../../src/lib/catalogue.ts`](../../../src/lib/catalogue.ts)
   - Fetches product specs, expected component bills of materials, essentiality flags, and reference photography.

---

## How to Run Headless on Fixtures

### 1. Run Full Unit & Integration Test Suite
```bash
npm test
```
Executes all 12 test suites verifying check independence, disposition rules, condition grading, and API contracts.

### 2. Run Headless Evaluation on 52 Held-Out Benchmark Cases
```bash
node scripts/run-held-out-eval.js
```
Runs the headless agent across the 52 frozen held-out fixtures (`EVAL-001` to `EVAL-052`) and produces performance, latency, and restock safety metrics.

### 3. Headless API Endpoint
The agent exposes a headless REST endpoint at `/api/inspect`:
```bash
curl -X POST http://localhost:3000/api/inspect \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORD-2026-98124",
    "sku": "LAPTOP-PRO-16",
    "product_name": "ProBook 16-inch Laptop",
    "expected_components": [
      { "name": "Laptop Unit", "essential": true },
      { "name": "140W USB-C Power Adapter", "essential": true }
    ],
    "images": ["<base64_encoded_jpeg>"],
    "image_mime_types": ["image/jpeg"]
  }'
```
Returns a fully resolved `EvidenceRecord` JSON payload with independent check results, deterministic rule trace, and SHA-256 content hash.
