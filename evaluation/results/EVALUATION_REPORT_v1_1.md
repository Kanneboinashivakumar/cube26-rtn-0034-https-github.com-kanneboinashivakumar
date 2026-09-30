# ReturnOps AI — Phase 8 v1.1 Held-Out Evaluation Report

## 1. Executive Summary

The Phase 8 v1.1 evaluation was executed across the identical frozen held-out benchmark of **52 distinct test cases** (`EVAL-001` through `EVAL-052`) against the live ReturnOps AI inspection service (`http://localhost:3030/api/inspect`).

### Key Headline Metrics (v1.1)
- **Overall Disposition Accuracy:** **59.6%** (31/52 cases matched exact business rule disposition)
- **Identity Check Accuracy:** **53.8%** (28/52)
- **Completeness Check Accuracy:** **48.1%** (25/52)
- **Condition Verdict Accuracy:** **50.0%** (26/52)
- **Condition Grade Accuracy:** **48.1%** (25/52)
- **Critical Safety Error Rate:** **0.0%** (Zero damaged items, missing essential components, or counterfeit items were ever routed to `restock`)
- **Median Latency:** **5.54s** (P95: 10.08s)
- **Estimated Total Evaluation Cost:** **$0.0146 USD** (~$0.00028 per return)

---

## 2. Confusion Matrices & Per-Check Analysis

### A. Identity Check
- **3-Class Accuracy:** **53.8%** (28/52)
- **Matches:** 23 Expected PASS & Actual PASS + 4 Expected FAIL & Actual FAIL + 1 Expected UNCERTAIN & Actual UNCERTAIN
- **False Positives (Fake/Wrong item passed):** **0 (0.0%)**
- **False Negatives (Genuine item failed):** **0 (0.0%)**
- **Uncertainty Rate:** 48.1% (25 cases routed to human review due to strict physical merchandise verification)

| Ground Truth \ Predicted | Predicted PASS | Predicted FAIL | Predicted UNCERTAIN |
| :--- | :---: | :---: | :---: |
| **Expected PASS** | **23** | 0 | 24 |
| **Expected FAIL** | 0 | **4** | 0 |
| **Expected UNCERTAIN** | 0 | 0 | **1** |

### B. Completeness Check
- **3-Class Accuracy:** **48.1%** (25/52)
- **Matches:** 21 Expected PASS & Actual PASS + 3 Expected FAIL & Actual FAIL + 1 Expected UNCERTAIN & Actual UNCERTAIN
- **False Positives (Incomplete item passed):** **0 (0.0%)**
- **Uncertainty Rate:** 48.1% (25 cases)

| Ground Truth \ Predicted | Predicted PASS | Predicted FAIL | Predicted UNCERTAIN |
| :--- | :---: | :---: | :---: |
| **Expected PASS** | **21** | 3 | 17 |
| **Expected FAIL** | 0 | **3** | 7 |
| **Expected UNCERTAIN** | 0 | 0 | **1** |

### C. Condition Assessment
- **Verdict Accuracy:** **50.0%** (26/52)
- **Exact Grade Match:** **48.1%** (25/52)
- **Uncertainty Rate:** 55.8% (29 cases)

| Ground Truth \ Predicted | Predicted PASS | Predicted UNCERTAIN |
| :--- | :---: | :---: |
| **Expected PASS** | **23** | 26 |
| **Expected UNCERTAIN** | 0 | **3** |

---

## 3. Disposition Action Distribution (v1.1)

| Ground Truth \ Predicted | restock | pending_review | refurbish | dispose | Total |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **restock** | **10** | 6 | 0 | 0 | 16 |
| **refurbish** | 0 | 9 | **3** | 0 | 12 |
| **liquidate** | 0 | 4 | 0 | 1 | 5 |
| **dispose** | 0 | 1 | 0 | **6** | 7 |
| **pending_review** | 0 | **12** | 0 | 0 | 12 |
| **Total** | 10 | 32 | 3 | 7 | **52** |

- **Critical Safety Errors:** **0.0%** (Zero damaged, counterfeit, or incomplete items routed to restock).

---

## 4. Key Operational Insights from v1.1

1. **Factory-Sealed Completeness Verified:** `EVAL-001` (factory sealed headphones) previously failed completeness in v1.0 because components could not be seen inside the opaque box. In v1.1, the sealed package inference rule successfully verified completeness via packaging seal integrity, achieving a 100% perfect match on Identity, Completeness, Condition (New), and Disposition (restock).
2. **Damaged Goods Safeguard Verified:** 6 of 7 damaged returns (`EVAL-030`, `031`, `032`, `033`, `034`, `051`) consistently output `grade: "Used - Acceptable"` with `observed_state: "damaged"` and correctly routed to `dispose`.
3. **Placard / Synthetic Rejection:** The physical merchandise verification instruction caused Gemini to strictly reject synthetic Sharp/SVG text cards in the test suite as non-photographic evidence, triggering safe fail-open abstention (`UNCERTAIN` $\rightarrow$ `pending_review`) on 24 synthetic cases.
