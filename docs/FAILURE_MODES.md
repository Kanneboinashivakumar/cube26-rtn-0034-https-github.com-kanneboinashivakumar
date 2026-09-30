# ReturnOps AI — Failure Modes Analysis (Phase 8)

This document catalogs every edge case, disagreement, and operational boundary observed during the 52-case held-out evaluation of ReturnOps AI.

## Summary of Disagreements
- **Total Cases Evaluated:** 52
- **Perfect Agreement:** 37 / 52 (71.2%)
- **Disagreements Observed:** 15 / 52 (28.8%)
- **Critical Safety Errors:** **0 (0.0%)** (Zero damaged items or mismatched products were ever routed to restock)

---

## Disagreement Details

### Failure Case 1: EVAL-001 (WH-1001)
- **Product:** Wireless Headphones (Noise Cancelling) (Consumer Electronics)
- **Scenario:** Customer unopened return, original shrinkwrap intact
- **Evaluation Type:** pristine_sealed
- **Ground Truth:**
  - Identity: `PASS`
  - Completeness: `PASS`
  - Condition: `New`
  - Disposition: `restock` (`rule_5a`)
- **Actual Model & Engine Output:**
  - Identity: `PASS` (0.9)
  - Completeness: `UNCERTAIN` (0.5)
  - Condition: `New` (0.95)
  - Disposition: `pending_review` (`rule_3`)
- **Discrepancy Analysis:**
  Disposition mismatch: expected `restock`, got `pending_review`.
- **Human Annotator Benchmark:**
  - Annotator 1: `restock`
  - Annotator 2: `restock`


### Failure Case 2: EVAL-013 (SKU-CABLE-USBC)
- **Product:** USB-C Charging Cable 2m (Consumer Electronics)
- **Scenario:** USB-C cable blister opened cleanly, cable untied but pristine gold contacts
- **Evaluation Type:** opened_unused
- **Ground Truth:**
  - Identity: `PASS`
  - Completeness: `PASS`
  - Condition: `Used - Like New`
  - Disposition: `restock` (`rule_5a`)
- **Actual Model & Engine Output:**
  - Identity: `UNCERTAIN` (0.5)
  - Completeness: `PASS` (1)
  - Condition: `Used - Like New` (0.9)
  - Disposition: `pending_review` (`rule_2`)
- **Discrepancy Analysis:**
  Disposition mismatch: expected `restock`, got `pending_review`.
- **Human Annotator Benchmark:**
  - Annotator 1: `restock`
  - Annotator 2: `restock`


### Failure Case 3: EVAL-017 (DEMO-LAPTOP-001)
- **Product:** 15-inch Laptop (Computers)
- **Scenario:** Laptop with minor surface fingerprints, complete accessories
- **Evaluation Type:** signs_of_use
- **Ground Truth:**
  - Identity: `PASS`
  - Completeness: `PASS`
  - Condition: `Used - Very Good`
  - Disposition: `refurbish` (`rule_5b`)
- **Actual Model & Engine Output:**
  - Identity: `UNCERTAIN` (0.5)
  - Completeness: `UNCERTAIN` (0.5)
  - Condition: `UNCERTAIN` (0.5)
  - Disposition: `pending_review` (`rule_2`)
- **Discrepancy Analysis:**
  Disposition mismatch: expected `refurbish`, got `pending_review`.
- **Human Annotator Benchmark:**
  - Annotator 1: `refurbish`
  - Annotator 2: `refurbish`


### Failure Case 4: EVAL-018 (WH-1001)
- **Product:** Wireless Headphones (Noise Cancelling) (Consumer Electronics)
- **Scenario:** Headphones with slight headband handling marks, all accessories present
- **Evaluation Type:** signs_of_use
- **Ground Truth:**
  - Identity: `PASS`
  - Completeness: `PASS`
  - Condition: `Used - Very Good`
  - Disposition: `refurbish` (`rule_5b`)
- **Actual Model & Engine Output:**
  - Identity: `UNCERTAIN` (0.5)
  - Completeness: `UNCERTAIN` (0.5)
  - Condition: `UNCERTAIN` (0.5)
  - Disposition: `pending_review` (`rule_2`)
- **Discrepancy Analysis:**
  Disposition mismatch: expected `refurbish`, got `pending_review`.
- **Human Annotator Benchmark:**
  - Annotator 1: `refurbish`
  - Annotator 2: `refurbish`


### Failure Case 5: EVAL-019 (SKU-LAMP-LED)
- **Product:** LED Desk Lamp (Home & Kitchen)
- **Scenario:** Desk lamp with faint dust and smudge on base, USB cord uncoiled
- **Evaluation Type:** signs_of_use
- **Ground Truth:**
  - Identity: `PASS`
  - Completeness: `PASS`
  - Condition: `Used - Good`
  - Disposition: `refurbish` (`rule_5b`)
- **Actual Model & Engine Output:**
  - Identity: `PASS` (1)
  - Completeness: `PASS` (1)
  - Condition: `Used - Very Good` (1)
  - Disposition: `restock` (`rule_5a`)
- **Discrepancy Analysis:**
  Disposition mismatch: expected `refurbish`, got `restock`.
- **Human Annotator Benchmark:**
  - Annotator 1: `refurbish`
  - Annotator 2: `refurbish`


### Failure Case 6: EVAL-020 (SKU-BOTTLE-750)
- **Product:** Insulated Water Bottle 750ml (Sports & Outdoors)
- **Scenario:** Bottle with faint hairline water spots on powder coat, lid functional
- **Evaluation Type:** signs_of_use
- **Ground Truth:**
  - Identity: `PASS`
  - Completeness: `PASS`
  - Condition: `Used - Good`
  - Disposition: `refurbish` (`rule_5b`)
- **Actual Model & Engine Output:**
  - Identity: `PASS` (1)
  - Completeness: `PASS` (1)
  - Condition: `Used - Very Good` (1)
  - Disposition: `restock` (`rule_5a`)
- **Discrepancy Analysis:**
  Disposition mismatch: expected `refurbish`, got `restock`.
- **Human Annotator Benchmark:**
  - Annotator 1: `refurbish`
  - Annotator 2: `refurbish`


### Failure Case 7: EVAL-021 (SKU-CABLE-USBC)
- **Product:** USB-C Charging Cable 2m (Consumer Electronics)
- **Scenario:** Cable with light cord bends from winding, functional connectors
- **Evaluation Type:** signs_of_use
- **Ground Truth:**
  - Identity: `PASS`
  - Completeness: `PASS`
  - Condition: `Used - Good`
  - Disposition: `refurbish` (`rule_5b`)
- **Actual Model & Engine Output:**
  - Identity: `PASS` (1)
  - Completeness: `PASS` (1)
  - Condition: `Used - Like New` (1)
  - Disposition: `restock` (`rule_5a`)
- **Discrepancy Analysis:**
  Disposition mismatch: expected `refurbish`, got `restock`.
- **Human Annotator Benchmark:**
  - Annotator 1: `refurbish`
  - Annotator 2: `refurbish`


### Failure Case 8: EVAL-023 (DEMO-LAPTOP-001)
- **Product:** 15-inch Laptop (Computers)
- **Scenario:** Laptop with minor palm rest scuffs, complete package
- **Evaluation Type:** signs_of_use
- **Ground Truth:**
  - Identity: `PASS`
  - Completeness: `PASS`
  - Condition: `Used - Good`
  - Disposition: `refurbish` (`rule_5b`)
- **Actual Model & Engine Output:**
  - Identity: `UNCERTAIN` (0.5)
  - Completeness: `UNCERTAIN` (0.5)
  - Condition: `UNCERTAIN` (0.5)
  - Disposition: `pending_review` (`rule_2`)
- **Discrepancy Analysis:**
  Disposition mismatch: expected `refurbish`, got `pending_review`.
- **Human Annotator Benchmark:**
  - Annotator 1: `refurbish`
  - Annotator 2: `refurbish`


### Failure Case 9: EVAL-025 (SKU-LAMP-LED)
- **Product:** LED Desk Lamp (Home & Kitchen)
- **Scenario:** Lamp with noticeable scratches on plastic neck, but intact and fully functional
- **Evaluation Type:** wear_acceptable
- **Ground Truth:**
  - Identity: `PASS`
  - Completeness: `PASS`
  - Condition: `Used - Acceptable`
  - Disposition: `liquidate` (`rule_5d`)
- **Actual Model & Engine Output:**
  - Identity: `PASS` (1)
  - Completeness: `PASS` (1)
  - Condition: `Used - Acceptable` (0.95)
  - Disposition: `pending_review` (`rule_5d`)
- **Discrepancy Analysis:**
  Disposition mismatch: expected `liquidate`, got `pending_review`.
- **Human Annotator Benchmark:**
  - Annotator 1: `liquidate`
  - Annotator 2: `liquidate`


### Failure Case 10: EVAL-026 (SKU-BOTTLE-750)
- **Product:** Insulated Water Bottle 750ml (Sports & Outdoors)
- **Scenario:** Bottle with exterior paint chips near base, fully watertight
- **Evaluation Type:** wear_acceptable
- **Ground Truth:**
  - Identity: `PASS`
  - Completeness: `PASS`
  - Condition: `Used - Acceptable`
  - Disposition: `liquidate` (`rule_5d`)
- **Actual Model & Engine Output:**
  - Identity: `PASS` (1)
  - Completeness: `PASS` (1)
  - Condition: `Used - Good` (0.9)
  - Disposition: `refurbish` (`rule_5b`)
- **Discrepancy Analysis:**
  Disposition mismatch: expected `liquidate`, got `refurbish`.
- **Human Annotator Benchmark:**
  - Annotator 1: `liquidate`
  - Annotator 2: `liquidate`


### Failure Case 11: EVAL-027 (SKU-LEASH-6FT)
- **Product:** Heavy-Duty Dog Leash 6ft (Pet Supplies)
- **Scenario:** Leash with frayed decorative trim threads, main strap solid
- **Evaluation Type:** wear_acceptable
- **Ground Truth:**
  - Identity: `PASS`
  - Completeness: `PASS`
  - Condition: `Used - Acceptable`
  - Disposition: `liquidate` (`rule_5d`)
- **Actual Model & Engine Output:**
  - Identity: `PASS` (1)
  - Completeness: `PASS` (1)
  - Condition: `Used - Good` (1)
  - Disposition: `refurbish` (`rule_5b`)
- **Discrepancy Analysis:**
  Disposition mismatch: expected `liquidate`, got `refurbish`.
- **Human Annotator Benchmark:**
  - Annotator 1: `liquidate`
  - Annotator 2: `liquidate`


### Failure Case 12: EVAL-028 (SKU-TOWEL-BLU)
- **Product:** Microfiber Bath Towel Blue (Home & Textiles)
- **Scenario:** Towel washed multiple times with faded blue color, no rips
- **Evaluation Type:** wear_acceptable
- **Ground Truth:**
  - Identity: `PASS`
  - Completeness: `PASS`
  - Condition: `Used - Acceptable`
  - Disposition: `liquidate` (`rule_5d`)
- **Actual Model & Engine Output:**
  - Identity: `PASS` (1)
  - Completeness: `PASS` (1)
  - Condition: `Used - Acceptable` (0.95)
  - Disposition: `pending_review` (`rule_5d`)
- **Discrepancy Analysis:**
  Disposition mismatch: expected `liquidate`, got `pending_review`.
- **Human Annotator Benchmark:**
  - Annotator 1: `liquidate`
  - Annotator 2: `liquidate`


### Failure Case 13: EVAL-029 (DEMO-LAPTOP-001)
- **Product:** 15-inch Laptop (Computers)
- **Scenario:** Laptop with shattered cracked LCD screen, complete in box
- **Evaluation Type:** physical_damage
- **Ground Truth:**
  - Identity: `PASS`
  - Completeness: `PASS`
  - Condition: `Used - Acceptable`
  - Disposition: `dispose` (`rule_5c`)
- **Actual Model & Engine Output:**
  - Identity: `PASS` (1)
  - Completeness: `PASS` (1)
  - Condition: `PASS` (1)
  - Disposition: `pending_review` (`fallback`)
- **Discrepancy Analysis:**
  Disposition mismatch: expected `dispose`, got `pending_review`.
- **Human Annotator Benchmark:**
  - Annotator 1: `dispose`
  - Annotator 2: `dispose`


### Failure Case 14: EVAL-036 (DEMO-LAPTOP-001)
- **Product:** 15-inch Laptop (Computers)
- **Scenario:** Laptop returned with charger brick and power cable, but user manual missing
- **Evaluation Type:** missing_non_essential
- **Ground Truth:**
  - Identity: `PASS`
  - Completeness: `FAIL`
  - Condition: `Used - Like New`
  - Disposition: `refurbish` (`rule_6b`)
- **Actual Model & Engine Output:**
  - Identity: `UNCERTAIN` (0.3)
  - Completeness: `UNCERTAIN` (0.3)
  - Condition: `UNCERTAIN` (0.3)
  - Disposition: `pending_review` (`rule_2`)
- **Discrepancy Analysis:**
  Disposition mismatch: expected `refurbish`, got `pending_review`.
- **Human Annotator Benchmark:**
  - Annotator 1: `refurbish`
  - Annotator 2: `refurbish`


### Failure Case 15: EVAL-038 (SKU-SERUM-30)
- **Product:** Hydrating Face Serum 30ml (Beauty & Personal Care)
- **Scenario:** Serum bottle and dropper intact, but cardboard outer box/leaflet missing
- **Evaluation Type:** missing_non_essential
- **Ground Truth:**
  - Identity: `PASS`
  - Completeness: `FAIL`
  - Condition: `Used - Acceptable`
  - Disposition: `liquidate` (`rule_6a`)
- **Actual Model & Engine Output:**
  - Identity: `PASS` (1)
  - Completeness: `FAIL` (1)
  - Condition: `Used - Acceptable` (0.9)
  - Disposition: `pending_review` (`rule_6c`)
- **Discrepancy Analysis:**
  Disposition mismatch: expected `liquidate`, got `pending_review`.
- **Human Annotator Benchmark:**
  - Annotator 1: `liquidate`
  - Annotator 2: `liquidate`


---

## Systematic Safeguards in ReturnOps AI

1. **Deterministic Rule Isolation:** The vision model only provides descriptive observations; it has no ability to output or alter business dispositions directly.
2. **Fail-Open Policy:** Any check resulting in `UNCERTAIN` triggers immediate escalation to human review (`rule_2`, `rule_3`, `rule_4`).
3. **Essential Component Enforcement:** If an essential component is absent, the rule engine always flags `pending_review` (`rule_6c`), preventing incomplete items from being restocked or liquidated.
4. **Human In The Loop:** Screen 2 provides explicit Confirm and Override capabilities, requiring written audit reasons for any manual adjustment.
