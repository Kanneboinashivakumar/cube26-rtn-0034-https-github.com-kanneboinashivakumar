# CLAUDE.md — Durable Project Constraints & Engineering Rules

This document establishes the permanent, non-negotiable architectural rules, operational constraints, and code standards for **ReturnOps AI (Returns Manager Track, RTN)**.

---

## 1. Core Architectural Separation

1. **AI Observes; Application Rules Decide:**
   - The multimodal AI model (Google Gemini `gemini-3.5-flash-lite`) is strictly limited to reporting visual observations.
   - The model must **NEVER** output a business disposition (`restock`, `refurbish`, `liquidate`, `dispose`).
   - The model must **NEVER** decide whether a missing component is "essential" or "optional".
   - Dispositions are determined exclusively by the deterministic TypeScript rules engine ([`src/lib/disposition-engine.ts`](../../src/lib/disposition-engine.ts)).

2. **Essentiality Flag Origin:**
   - The `essential: boolean` flag originates solely from the application catalogue bill of materials ([`src/data/demo-catalog.json`](../../src/data/demo-catalog.json)).
   - The `essential` flag is intentionally stripped before sending expected components to Gemini so the model cannot bias its completeness observations.

---

## 2. Check Independence & Tri-State Verdicts

3. **Strict Check Independence (Zero Cross-Contamination):**
   - The three checks—**Identity**, **Completeness**, and **Condition**—must be evaluated independently.
   - A damaged item does not fail Identity if it is genuine.
   - An incomplete bundle does not fail Condition if the main unit is pristine.
   - A wrong item does not fail Condition if the returned cable is clean.

4. **`UNCERTAIN` is a First-Class Citizen:**
   - When evidence photos are blurry, obscured, low-resolution, or missing, the system must report `UNCERTAIN`.
   - Never write heuristic fallback code that guesses or forces ambiguous evidence into `PASS` or `FAIL`.
   - Any check outputting `UNCERTAIN` deterministically routes the package to `pending_review` via Rules 2, 3, or 4.

5. **Condition Verdict Semantics:**
   - Condition only produces `PASS` or `UNCERTAIN` verdicts (no `FAIL`).
   - A heavily damaged product receives `verdict: "PASS"`, `observed_state: "damaged"`, and `grade: "Used - Acceptable"`.
   - The deterministic engine translates `damaged` state to the `dispose` disposition via Rule 5c.

---

## 3. Human Oversight & Auditability

6. **Human Override Preservation:**
   - The warehouse operator can confirm or override any AI recommendation on Screen 2.
   - Overrides never overwrite or erase the original AI outcome.
   - Every override must record:
     - `override_id`
     - `operator_id`
     - `previous_disposition`
     - `new_disposition`
     - `reason` (minimum 10 characters required)
     - `overridden_at` (ISO timestamp)
   - All overrides are immutably stored in the `overrides` array of the `EvidenceRecord`.

7. **Evidence Traceability:**
   - Customer return evidence photos are strictly labeled positionally (`image_1`, `image_2`, `image_3`).
   - Every observation and component finding must reference its source evidence photos via `evidence_refs`.
   - Every completed record calculates a canonical SHA-256 `content_hash`.

8. **Fail-Open Contract:**
   - If Gemini is unreachable, times out, or returns invalid JSON, the system must **NEVER** discard the input or crash.
   - It constructs a valid `EvidenceRecord` with `status: "failed"` and routes to `pending_review` with an alert.

---

## 4. Evaluation & Benchmark Integrity

9. **Benchmark Immutability:**
   - The 52 held-out evaluation cases (`EVAL-001` through `EVAL-052`) in [`evaluation/fixtures/held_out/`](../../evaluation/fixtures/held_out/) are frozen.
   - Never alter, re-annotate, or adjust benchmark cases, ground truth labels, or historical metrics.

10. **Honest Evaluation Representation:**
    - The Phase 8 benchmark was executed on synthetic SVG/vector placards generated via Sharp.
    - These results must **NEVER** be represented as "real-world photographic accuracy".
    - Photographic verification is preserved separately in the 3 demonstration fixtures (`demo-data/`).
    - Phase 9 (large-scale photographic dataset collection) is planned future work and was **NOT** executed.

---

## 5. Security & Repository Hygiene

11. **Zero Secret Leaks:**
    - Never commit, push, or stage `.env`, `.env.local`, API keys, or Supabase service-role keys.
    - The only tracked environment file is [`.env.example`](../../.env.example) containing sanitized dummy placeholders.

12. **Scope Boundaries:**
    - Do not invent admin portals, user authentication flows, or WMS inventory synchronizers.
    - The Returns Manager track ends at generating the verified, auditable `EvidenceRecord` for the downstream Recovery Manager.
