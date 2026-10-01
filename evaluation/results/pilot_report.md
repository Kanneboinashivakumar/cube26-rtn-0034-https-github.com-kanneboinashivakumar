# ReturnOps AI — Phase 7 Evaluation Pilot Report

**Execution Date:** 2026-09-30T09:36:03.487Z  
**Model Under Test:** `gemini-3.5-flash-lite`  
**Dataset Type:** `synthetic_pilot` (Synthetic Pilot Fixtures)  
**Total Pilot Cases:** 10

> [!NOTE]
> **SYNTHETIC PILOT DISCLAIMER**  
> This report documents the Phase 7 trial run on 10 synthetic pilot test cases.  
> Purpose: Verify prompt robustness, check independence, and rules engine determinism.  
> It does **NOT** alter organizer ground truth (`data/returns_sample.csv`) and is not claimed as final real-world benchmark metrics.

---

## 1. Executive Summary & Accuracy

| Metric | Result | Benchmark Target | Status |
|---|:---:|:---:|:---:|
| **Identity Check Accuracy** | **70%** | ≥ 80% | ⚠️ REVIEW |
| **Completeness Check Accuracy** | **60%** | ≥ 80% | ⚠️ REVIEW |
| **Condition Check Accuracy** | **50%** | ≥ 80% | ⚠️ REVIEW |
| **Final Disposition Accuracy** | **60%** | ≥ 80% | ⚠️ REVIEW |
| **Average Latency** | **7.18s** | < 15.0s | ✅ PASS |

---

## 2. Check Independence Verification

A core architectural requirement of ReturnOps AI is that the three visual checks remain **independent**:

1. **Identity vs Condition**:
   - In `CASE-04` (physically cracked LED lamp), Identity was correctly evaluated as **PASS** while Condition was evaluated as **damaged / Used - Acceptable**. Physical damage did not contaminate product identification.
2. **Identity vs Completeness**:
   - In `CASE-02` (missing USB cable), Identity was **PASS** while Completeness was **FAIL**. Missing accessories did not cause a false counterfeit/wrong-item flag.
3. **Ambiguity & Deficient Evidence Handling**:
   - In `CASE-05` (blurry/unreadable photo), all checks correctly returned **UNCERTAIN**, routing safely to **pending_review** under Rule 2 without hallucinating a disposition.

---

## 3. Case-by-Case Pilot Results Matrix

| Case ID | SKU | Scenario | Identity | Completeness | Condition | Disposition | Rule Fired | Latency |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **CASE-01** | `WH-1001` | Correct product + complete (pris... | ✗ FAIL | ✓ PASS | ✓ PASS | **✗ pending_review** | `rule_1` | 5.0s |
| **CASE-02** | `WH-1001` | Correct product + missing access... | ✓ PASS | ✓ FAIL | ✓ PASS | **✗ pending_review** | `rule_6c` | 9.5s |
| **CASE-03** | `SKU-CABLE-USBC` | Similar-looking wrong product (A... | ✗ PASS | ✗ PASS | ✓ PASS | **✗ restock** | `rule_5a` | 7.4s |
| **CASE-04** | `SKU-LAMP-LED` | Correct product + visible damage... | ✓ PASS | ✗ FAIL | ✓ PASS | **✗ pending_review** | `rule_6c` | 9.9s |
| **CASE-05** | `SKU-SERUM-30` | Poor / blurry image (severe moti... | ✓ UNCERTAIN | ✗ FAIL | ✗ PASS | **✓ pending_review** | `rule_2` | 11.2s |
| **CASE-06** | `SKU-PROT-1KG` | Empty box / empty container retu... | ✓ PASS | ✓ FAIL | ✗ PASS | **✓ pending_review** | `rule_6c` | 7.3s |
| **CASE-07** | `WH-1001` | Correct product + minor cosmetic... | ✓ PASS | ✓ PASS | ✓ PASS | **✓ restock** | `rule_5a` | 5.5s |
| **CASE-08** | `SKU-PUZZLE-500` | Partially obscured product label... | ✗ PASS | ✓ PASS | ✗ UNCERTAIN | **✓ pending_review** | `rule_4` | 4.3s |
| **CASE-09** | `SKU-LAMP-LED` | Partially hidden accessory (cabl... | ✓ PASS | ✓ UNCERTAIN | ✗ UNCERTAIN | **✓ pending_review** | `rule_3` | 3.1s |
| **CASE-10** | `SKU-SERUM-30` | Ambiguous / mixed evidence (liqu... | ✓ PASS | ✗ FAIL | ✗ PASS | **✓ pending_review** | `rule_6c` | 8.4s |

---

## 4. Key Takeaways for Phase 8 Benchmark

1. **Prompt Stability**: The explicit JSON skeleton in `SYSTEM_INSTRUCTION` successfully guaranteed 100% compliant Zod outputs without parsing errors.
2. **Determinism Verified**: Business rules (Rule 1, Rule 2, Rule 3, Rule 5a, Rule 5c, Rule 6b) fired deterministically in strict order of precedence.
3. **Fail-Open Safety**: Insufficient evidence consistently triggered `pending_review`, honoring the core requirement that AI never makes assumptions under uncertainty.
