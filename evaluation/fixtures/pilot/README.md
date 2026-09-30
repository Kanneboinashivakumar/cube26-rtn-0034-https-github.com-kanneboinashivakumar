# Synthetic Pilot Fixture Set (Phase 7)

**Dataset Type:** `synthetic_pilot`  
**Scope:** 10 curated test fixtures covering all required pilot scenarios.  
**Storage Path:** `evaluation/fixtures/pilot/`

> [!IMPORTANT]
> **SYNTHETIC PILOT DISCLAIMER**  
> These fixtures are synthetic test cases created solely for developer verification of prompt structure, check independence, and rules engine execution.  
> They are **NOT** real customer return data, do **NOT** modify the official organizer sample (`data/returns_sample.csv`), and are **NOT** claimed as real-world benchmark metrics.

---

## 1. Scenario Coverage Matrix

| Case ID | SKU | Product | Scenario | Expected Identity | Expected Completeness | Expected Condition | Expected Disposition | Documented Rule |
|---|---|---|---|---|---|---|---|---|
| **CASE-01** | `WH-1001` | Wireless Headphones | Correct product + complete (pristine) | PASS | PASS | PASS (New) | **restock** | Rule 5a |
| **CASE-02** | `WH-1001` | Wireless Headphones | Correct product + missing USB-C cable | PASS | FAIL | PASS (Used - Very Good) | **refurbish** | Rule 6b |
| **CASE-03** | `SKU-CABLE-USBC` | USB-C Cable 2m | Similar-looking wrong product (Lightning) | FAIL | FAIL | PASS (Used - Like New) | **pending_review** | Rule 1 |
| **CASE-04** | `SKU-LAMP-LED` | LED Desk Lamp | Correct product + cracked hinge / broken base | PASS | PASS | PASS (Used - Acceptable) | **dispose** | Rule 5c |
| **CASE-05** | `SKU-SERUM-30` | Face Serum 30ml | Poor / blurry / unreadable image | UNCERTAIN | UNCERTAIN | UNCERTAIN | **pending_review** | Rule 2 |
| **CASE-06** | `SKU-PROT-1KG` | Whey Protein 1kg | Empty container (contents missing) | PASS | FAIL | UNCERTAIN (empty_box) | **pending_review** | Rule 3 |
| **CASE-07** | `WH-1001` | Wireless Headphones | Correct product + minor cosmetic scuffs | PASS | PASS | PASS (Used - Very Good) | **restock** | Rule 5a |
| **CASE-08** | `SKU-PUZZLE-500` | 500-Piece Puzzle | Partially obscured label (carrier sticker) | UNCERTAIN | PASS | PASS (Used - Good) | **pending_review** | Rule 2 |
| **CASE-09** | `SKU-LAMP-LED` | LED Desk Lamp | Partially hidden cable under divider | PASS | UNCERTAIN | PASS (Used - Like New) | **pending_review** | Rule 2 |
| **CASE-10** | `SKU-SERUM-30` | Face Serum 30ml | Ambiguous / cloudy liquid / residue | PASS | PASS | UNCERTAIN | **pending_review** | Rule 2 |

---

## 2. Directory Structure

```
evaluation/fixtures/pilot/
├── README.md
├── cases.json
└── images/
    ├── CASE-01_complete_pristine.jpg
    ├── CASE-02_missing_accessory.jpg
    ├── CASE-03_wrong_product.jpg
    ├── CASE-04_visible_damage.jpg
    ├── CASE-05_blurry_unclear.jpg
    ├── CASE-06_empty_box.jpg
    ├── CASE-07_minor_cosmetic_wear.jpg
    ├── CASE-08_obscured_label.jpg
    ├── CASE-09_hidden_accessory.jpg
    └── CASE-10_ambiguous_evidence.jpg
```
