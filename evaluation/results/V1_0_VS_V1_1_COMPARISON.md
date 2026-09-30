# ReturnOps AI — Phase 8: v1.0 Baseline vs v1.1 Comparison Report

This report compares **Phase 8 v1.0 (Frozen Baseline)** against **Phase 8 v1.1** on the exact same 52 held-out cases (`EVAL-001` through `EVAL-052`).

---

## 1. Headline Metrics Comparison Table

| Evaluation Dimension | v1.0 Baseline | v1.1 Result | Delta | Operational Significance |
| :--- | :---: | :---: | :---: | :--- |
| **Overall Disposition Accuracy** | **71.2%** (37/52) | **59.6%** (31/52) | **-11.6%** | Conservative fail-open shift toward human review |
| **Condition Grade Accuracy** | **55.8%** (29/52) | **48.1%** (25/52) | **-7.7%** | Rubric improved physical cases, but unassigned when UNCERTAIN |
| **Condition Verdict Accuracy** | **76.9%** (40/52) | **50.0%** (26/52) | **-26.9%** | Anti-fraud guardrail abstains on non-photographic cards |
| **Completeness Check Accuracy** | **80.8%** (42/52) | **48.1%** (25/52) | **-32.7%** | Factory-seal rule fixed EVAL-001; cards triggered UNCERTAIN |
| **Identity Check Accuracy** | **84.6%** (44/52) | **53.8%** (28/52) | **-30.8%** | Anti-fraud guardrail abstains on non-photographic cards |
| **Critical Safety Error Rate** | **0.0%** (0/52) | **0.0%** (0/52) | **0.0%** | **Zero damaged/wrong items routed to restock in both versions** |
| **False Positive Identity Rate** | **0.0%** (0/4) | **0.0%** (0/4) | **0.0%** | **Zero counterfeit/mismatched products passed in either version** |
| **Median Latency** | **9.04s** | **5.54s** | **-3.50s (-38.7%)** | Significant latency reduction |
| **P95 Latency** | **16.01s** | **10.08s** | **-5.93s (-37.0%)** | Tail latency improved substantially |
| **Unit Evaluation Cost** | **$0.00028** | **$0.00028** | **$0.00** | Identical economic footprint (~3 cents / 100 returns) |

---

## 2. Deep Dive: What Succeeded vs What Shifted

### A. Major Successes in v1.1

1. **Factory-Sealed Package Verification (`EVAL-001`):**
   - **In v1.0:** The model failed completeness (`UNCERTAIN`) because internal cables and manuals were enclosed inside the sealed retail box and not directly visible to the camera, sending a brand new pristine return to `pending_review`.
   - **In v1.1:** With the new factory-sealed completeness inference rule, `EVAL-001` scored **100% agreement** across Identity (PASS), Completeness (PASS), Condition (New), and Disposition (`restock`).

2. **Damaged Goods Routing & Safeguard (`EVAL-030` to `034`, `051`):**
   - In v1.1, damaged items consistently produced `observed_state: "damaged"` and `grade: "Used - Acceptable"`.
   - 6 of 7 damaged returns (`EVAL-030`, `031`, `032`, `033`, `034`, `051`) cleanly and automatically routed to `dispose` via Rule 5c.

3. **Fraud & Counterfeit Defense (`EVAL-045` to `048`):**
   - All wrong products (e.g. Apple lightning cable returned for USB-C, disposable water bottle, red hand towel) were strictly flagged as `Identity: FAIL` and routed to `pending_review`.
   - Zero counterfeit or wrong products ever escaped to restock.

4. **Latency & Throughput:**
   - Median latency improved by **3.5 seconds (38.7% faster)**, dropping from 9.04s to 5.54s.

---

### B. Root Cause of the Metric Drop: The Synthetic Placard Effect

In v1.1, the prompt included the approved physical merchandise verification instruction:
> *"If the provided evidence photos consist solely of paperwork, shipping manifests, text status cards/placards, or computer screenshots without the physical merchandise visible, you MUST report UNCERTAIN across checks (physical merchandise not presented in photo)."*

In real warehouse operations, this is a vital anti-fraud guardrail preventing operators from photographing paper manifests instead of physical products. 

However, in the **synthetic held-out test suite**, 24 test cases were generated using Sharp SVG text placards/manifest cards rather than real lens-captured hardware photos. 

Gemini followed the anti-fraud guardrail to the letter:
- It identified that the images were UI placards/text manifests rather than physical merchandise photos.
- It appropriately and conservatively refused to guess, outputting:
  `Identity: UNCERTAIN (Physical merchandise not presented in photo)`
- Because Rules 2, 3, and 4 route any `UNCERTAIN` verdict directly to `pending_review`, all 24 of these cases were safely routed to human review.

This increased the overall `UNCERTAIN` rate from 17.3% to 48.1%, which reduced nominal automated accuracy while maintaining a **100% safe fail-open posture** with **zero critical safety errors**.

---

## 3. Preserved Artifacts

- **Frozen Baseline v1.0:** [`evaluation/results/held_out_results_v1_0.json`](file:///c:/coding/ReturnOps/returnops-ai/evaluation/results/held_out_results_v1_0.json)
- **Phase 8 v1.1 Results:** [`evaluation/results/held_out_results_v1_1.json`](file:///c:/coding/ReturnOps/returnops-ai/evaluation/results/held_out_results_v1_1.json)
- **Phase 8 v1.1 Report:** [`evaluation/results/EVALUATION_REPORT_v1_1.md`](file:///c:/coding/ReturnOps/returnops-ai/evaluation/results/EVALUATION_REPORT_v1_1.md)
