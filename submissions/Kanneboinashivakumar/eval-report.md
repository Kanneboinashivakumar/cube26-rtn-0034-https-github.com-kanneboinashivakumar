# ReturnOps AI — Evaluation Report

**Track:** Returns Manager (RTN)  
**Agent:** ReturnOps AI — Evidence-First Returns Inspection & Disposition Agent  
**Author:** Kanneboina Shiva Kumar  
**Evaluation Scope:** Phase 8 Held-Out Benchmark (52 Test Cases)  
**Baseline Status:** Frozen (`EVAL-001` through `EVAL-052`)  

---

## 1. Executive Summary

This report presents the empirical evaluation of ReturnOps AI on a frozen benchmark of **52 held-out returns inspection cases**.

The primary operational mandate for an automated returns inspection system is **restock safety**: ensuring that damaged, counterfeit, box-swapped, or incomplete products are never inadvertently routed back into active inventory. In both baseline (v1.0) and hardened (v1.1) evaluations, ReturnOps AI achieved:

- **0.0% Critical Restock Safety Errors (0 / 52):** Not a single damaged item, wrong product, or missing essential accessory was cleared for restock.
- **71.2% Overall Disposition Accuracy (37 / 52 in v1.0):** Correctly assigning the exact operational path (`restock`, `refurbish`, `liquidate`, `dispose`, or `pending_review`).
- **9.04s Median Latency:** Comfortably below the 60-second operational ceiling for warehouse triage workstations.
- **\$0.00028 Cost per Unit:** Negligible marginal inspection cost.

---

## 2. Evaluation Setup & Methodology

### Test Set Composition
The benchmark comprises **52 held-out cases** (`EVAL-001` to `EVAL-052`) catalogued in `evaluation/fixtures/held_out/cases.json`:
- **9 Product Categories:** Consumer Electronics (12), Audio (8), Wearables (6), Computer Accessories (6), Mobile Devices (5), Small Appliances (5), Cameras & Optics (4), Power & Cables (3), Gaming Gear (3).
- **10 Scenario Groups:** Pristine unopened restocks, minor cosmetic wear, missing essential accessories, box swaps, counterfeit returns, transit packaging damage, blurred / unreadable evidence, missing non-critical items, defective components, and empty/packaging-only returns.

### Dual Human Annotation
To establish authoritative ground truth labels, two independent evaluators labeled all 52 cases across four dimensions:
1. **Identity:** `PASS`, `FAIL`, or `UNCERTAIN`
2. **Completeness:** `PASS`, `FAIL`, or `UNCERTAIN`
3. **Condition:** `PASS`, `FAIL`, or `UNCERTAIN`, plus cosmetic grade (`A`, `B`, `C`, or `DAMAGED`)
4. **Disposition:** `restock`, `refurbish`, `liquidate`, `dispose`, or `pending_review`

**Inter-Annotator Agreement:** Evaluators achieved complete consensus across all 52 cases, yielding a **Cohen's Kappa $\kappa = 1.000$**.

---

## 3. Evaluation Results: v1.0 Baseline vs. v1.1 Hardened

Evaluation was executed headlessly via `scripts/evaluate-phase8.ts` using Gemini 3.5 Flash-Lite (`gemini-2.0-flash-lite`) at temperature `0.0`.

| Metric | v1.0 Baseline | v1.1 Hardened Guardrail | Target |
|---|:---:|:---:|:---:|
| **Overall Disposition Accuracy** | **71.2%** (37/52) | **59.6%** (31/52) | $\ge 70\%$ |
| **Critical Restock Safety Error Rate** | **0.0%** (0/52) | **0.0%** (0/52) | $0.0\%$ |
| **Identity Check Accuracy** | **84.6%** (44/52) | **78.8%** (41/52) | $\ge 80\%$ |
| **Completeness Check Accuracy** | **80.8%** (42/52) | **67.3%** (35/52) | $\ge 80\%$ |
| **Condition Verdict Accuracy** | **76.9%** (40/52) | **67.3%** (35/52) | $\ge 75\%$ |
| **Exact Condition Grade Match** | **55.8%** (29/52) | **48.1%** (25/52) | $\ge 50\%$ |
| **API Call Success Rate** | **100.0%** (52/52) | **100.0%** (52/52) | $100\%$ |
| **Median Response Latency** | **9.04s** | **5.54s** | $< 15\text{s}$ |
| **P95 Response Latency** | **16.01s** | **12.43s** | $< 30\text{s}$ |
| **Estimated API Cost / Return** | **\$0.00028** | **\$0.00028** | $< \$0.01$ |

---

## 4. Why the v1.1 Numbers Changed (The Synthetic Fixture Insight)

Between v1.0 and v1.1, the prompt was augmented with a security guardrail against printed counterfeit placards: *"Report UNCERTAIN if evidence consists solely of text cards, placards, or non-photographic diagrams without physical merchandise."*

This change surfaced a critical finding regarding the benchmark dataset:
- The 156 images in `evaluation/fixtures/held_out/` were synthetically generated using the Sharp SVG rasterization library. They are **graphic metadata cards** displaying return details rather than camera-captured physical photographs.
- Gemini strictly respected the new instruction: when presented with synthetic placards, it correctly identified that no physical merchandise was visible and returned `UNCERTAIN` on 22 cases.
- In 16 of these cases, the ground truth human label had expected a `PASS` or specific disposition based on the placard text. As a result, nominal disposition accuracy dropped from 71.2% to 59.6%.
- **Crucially, restock safety was 100% maintained:** The agent failed open to `pending_review`, preventing any false passes.

Rather than discarding or hiding this result, both versions are documented transparently. This demonstrates the model's sensitivity to anti-spoofing instructions and clarifies why synthetic benchmarks must not be conflated with real photographic accuracy.

---

## 5. Restock Safety Analysis

In warehouse returns, errors are asymmetric:
- **Type I Error (False Fail / Over-escalation):** An item eligible for restock is flagged as `pending_review` or `refurbish`. Cost: a brief manual re-inspection by a senior operator (~$0.50).
- **Type II Error (False Restock / Critical Safety Error):** A damaged laptop, swapped counterfeit phone, or box missing its charging cable is returned to inventory and shipped to a new customer. Cost: customer churn, return shipping penalty, and reputational damage (~$50–$300).

```
                      GROUND TRUTH RESTOCK ELIGIBLE?
                         YES                   NO
                +---------------------+---------------------+
          PASS  | True Restock (14)   | CRITICAL ERROR (0)  |
AGENT           +---------------------+---------------------+
VERDICT  OTHER  | Safe Escalate (4)   | Safe Reject (34)    |
                +---------------------+---------------------+
```

Across all 52 cases in v1.0, ReturnOps AI produced **0 critical safety errors**. When the model experienced uncertainty regarding cosmetic grade or component presence, it conservatively downgraded the recommendation to `refurbish` or escalated to `pending_review`.

---

## 6. The Role of `UNCERTAIN`

ReturnOps AI treats `UNCERTAIN` as an active, first-class semantic state rather than an error condition:
- When photos are underexposed, serial barcodes are out of focus, or packaging obscures the contents, the agent outputs `UNCERTAIN`.
- In `src/lib/disposition-engine.ts`, any `UNCERTAIN` verdict on Identity or Condition automatically overrides the disposition to `pending_review`.
- This fail-open policy prevents the multimodal model from making high-stakes guesses under poor operational capture conditions.

---

## 7. Failure Mode Analysis (The 15 Disagreements in v1.0)

In the v1.0 baseline, 15 out of 52 cases disagreed with the dual-annotator ground truth disposition. These fall into three distinct failure modes:

| Failure Mode | Count | Example Cases | Root Cause & Operational Impact |
|---|:---:|---|---|
| **FM-1: Subtle Accessory Detection** | 5 | `EVAL-014`, `EVAL-023` | Small accessories (e.g., audio adapter dongle, replacement ear tips) packed inside compartments were missed in wide-angle photos, causing false `Completeness: FAIL`. Handled safely by routing to review. |
| **FM-2: Cosmetic Grade Boundary Ambiguity** | 6 | `EVAL-008`, `EVAL-029` | Ambiguity along the Grade A vs. Grade B boundary (micro-scratches on bezel). Model graded as B (`refurbish`) when annotators marked A (`restock`). Zero safety risk; minor recovery variance. |
| **FM-3: Conservative Over-Escalation** | 4 | `EVAL-041`, `EVAL-047` | When only a single angle was provided, the model reported `Condition: UNCERTAIN`, routing to `pending_review` instead of `restock`. Operator can quickly confirm restock on Screen 2. |

Full case-by-case analysis is detailed in [`docs/FAILURE_MODES.md`](../../docs/FAILURE_MODES.md).

---

## 8. Benchmark Validity Limitations

To maintain absolute scientific integrity, the following limitations must be noted:

1. **Synthetic Fixtures vs. Real Photography:**
   The 156 images in `evaluation/fixtures/held_out/` are synthetic vector placards generated with Sharp, not lens-captured photos from warehouse cameras. The 71.2% (v1.0) and 59.6% (v1.1) accuracy figures reflect performance on this synthetic held-out benchmark and **must not be claimed as real-world photographic accuracy**.
2. **Real Multi-Image Fixtures in Demo:**
   Photographic multi-image fixtures were created separately for the interactive prototype (`demo-data/` Laptop, Headphones, USB-C Cable). These demonstrate real photographic capability but are separate from the frozen 52-case benchmark.
3. **Phase 9 Unexecuted:**
   A prospective "Phase 9" initiative to collect 250+ warehouse captures was scoped as future work and **was not executed**. All submission claims rest strictly on Phase 8 data.

---

## 9. References to Detailed Reports

For complete granular data, per-case logs, and visual audits:
- **Full Phase 8 Evaluation Report:** [`../../docs/EVALUATION.md`](../../docs/EVALUATION.md)
- **Detailed Failure Modes Catalog:** [`../../docs/FAILURE_MODES.md`](../../docs/FAILURE_MODES.md)
- **Fixture Validity Audit:** [`../../evaluation/results/BENCHMARK_FIXTURE_VALIDITY_AUDIT.md`](../../evaluation/results/BENCHMARK_FIXTURE_VALIDITY_AUDIT.md)
- **v1.0 vs. v1.1 Comparison Report:** [`../../evaluation/results/V1_0_VS_V1_1_COMPARISON.md`](../../evaluation/results/V1_0_VS_V1_1_COMPARISON.md)
- **Frozen Test Cases Dataset:** [`../../evaluation/fixtures/held_out/cases.json`](../../evaluation/fixtures/held_out/cases.json)
