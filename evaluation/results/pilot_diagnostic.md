# ReturnOps AI — Phase 7 Evaluation Pilot Diagnostic Report

**Date:** 2026-09-30  
**Dataset:** `synthetic_pilot` (10 curated pilot cases, CASE-01 to CASE-10)  
**Model Tested:** `gemini-3.5-flash-lite`  
**Execution Context:** Real live Gemini multimodal API + deterministic rules engine + Supabase persistence  
**Status:** Diagnostic Review (Pre-Phase 8)

---

## 1. Executive Summary

The Phase 7 pilot successfully validated all technical and architectural pipelines:
- **10/10 cases executed** end-to-end without unhandled crashes.
- **100% strict Zod schema compliance** across all model outputs.
- **Fail-open resilience demonstrated**: rate-limit handling and temporary 503 retries prevented pipeline drops.
- **Zero client-side leakage**; all records securely persisted with full rule traces to Supabase.

However, a detailed comparison between actual model observations and expected pilot metadata reveals **significant visual reasoning disagreements**. This diagnostic analyzes the root causes of each discrepancy across the 9 standardized classification categories.

---

## 2. Case-by-Case Deep Diagnostic

### CASE-01: Correct Product + Complete (Pristine)
- **SKU:** `WH-1001` (Wireless Headphones)
- **Expected:** Identity: **PASS** | Completeness: **PASS** | Condition: **PASS** (`New` / `factory_sealed`) | Disposition: **restock** (`rule_5a`)
- **Actual Model Observation:**
  - Identity: **FAIL** (conf: 0.95) — *"The product packaging clearly indicates Sony WH-1000XM5, which does not match the expected SKU WH-1001."*
  - Completeness: **PASS** (conf: 0.95) — All 5 components observed.
  - Condition: **PASS** (`Used - Like New`, `opened_unused`, conf: 0.90).
  - Disposition: **pending_review** (`rule_1` triggered by Identity FAIL).
- **Classification:** **7. Model Limitation (Prior Hallucination)** + **1. Image Fixture Ambiguity**
- **Analysis:** The model recognized the prefix `WH-` and associative knowledge from training data hallucinated Sony's flagship model `WH-1000XM5`. Even though the fixture image labeled the item as `WH-1001`, the model asserted a brand mismatch. The rules engine correctly executed `rule_1` (Identity FAIL → `pending_review`).

---

### CASE-02: Correct Product + Missing Non-Essential Accessory
- **SKU:** `WH-1001` (Wireless Headphones)
- **Expected:** Identity: **PASS** | Completeness: **FAIL** (USB-C cable: false) | Condition: **PASS** (`Used - Very Good`) | Disposition: **refurbish** (`rule_6b`)
- **Actual Model Observation:**
  - Identity: **PASS** (conf: 1.0) — Matches `WH-1001`.
  - Completeness: **FAIL** (conf: 1.0) — Reported Headphones: true, **Charging case: false**, USB-C cable: true.
  - Condition: **PASS** (`Used - Good`, `signs_of_use`, conf: 0.90).
  - Disposition: **pending_review** (`rule_6c`).
- **Classification:** **7. Model Limitation (Spatial Attention Inversion)**
- **Analysis:** The fixture image indicated an empty cable slot and present case, but the vision model inverted the observation, reporting the charging case missing and the cable present. Because `Charging case` is marked `essential: true` in the catalogue, the rules engine evaluated completeness failure on an essential component and routed to `rule_6c` (`pending_review`). The rule engine acted correctly based on the model's reported observation.

---

### CASE-03: Similar-Looking Wrong Product (Lightning vs USB-C)
- **SKU:** `SKU-CABLE-USBC` (USB-C Charging Cable 2m)
- **Expected:** Identity: **FAIL** | Completeness: **FAIL** | Condition: **PASS** | Disposition: **pending_review** (`rule_1`)
- **Actual Model Observation:**
  - Identity: **PASS** (conf: 0.90) — *"The product box indicates an Anker USB-C to USB-C cable. The visible cable matches the expected product type."*
  - Completeness: **PASS** (conf: 1.0) — Cable observed: true.
  - Condition: **PASS** (`Used - Like New`, `opened_unused`, conf: 0.90).
  - Disposition: **restock** (`rule_5a`).
- **Classification:** **7. Model Limitation (Severe Brand & Geometry Hallucination)**
- **Analysis:** **Critical Finding.** The model hallucinated the brand *"Anker PowerLine III USB-C to USB-C Cable"* (which appears nowhere in our prompt or image) and declared Identity PASS. It completely failed to distinguish the 8-pin flat Lightning geometry from the oval USB-C form factor. Because all checks passed, Rule 5a erroneously routed the counterfeit/wrong cable to `restock`. This highlights that **fine-grained connector geometry is a high-risk failure mode for vision models**.

---

### CASE-04: Correct Product + Visible Physical Damage
- **SKU:** `SKU-LAMP-LED` (LED Desk Lamp)
- **Expected:** Identity: **PASS** | Completeness: **PASS** | Condition: **PASS** (`Used - Acceptable` / `damaged`) | Disposition: **dispose** (`rule_5c`)
- **Actual Model Observation:**
  - Identity: **PASS** (conf: 1.0) — Matches expected LED Desk Lamp.
  - Completeness: **FAIL** (conf: 1.0) — *"The lamp features an attached two-prong AC power cord instead of a USB cable. User manual not present."*
  - Condition: **PASS** (`Used - Acceptable`, `damaged`, conf: 1.0) — *"Severe crack/break in upper arm structure exposing internal wires."*
  - Disposition: **pending_review** (`rule_6c`).
- **Classification:** **4. Completeness Evidence Insufficiency** + **8. Deterministic Rule Interaction**
- **Analysis:** Check independence held: the model correctly confirmed Identity PASS while recognizing catastrophic structural damage. However, the model observed an AC cord rather than a USB cable, triggering Completeness FAIL on an essential part. Under Rule 6c, essential completeness failure forces `pending_review` before Rule 5c (`dispose`) can evaluate.

---

### CASE-05: Poor / Blurry / Motion-Degraded Evidence
- **SKU:** `SKU-SERUM-30` (Hydrating Face Serum 30ml)
- **Expected:** Identity: **UNCERTAIN** | Completeness: **UNCERTAIN** | Condition: **UNCERTAIN** | Disposition: **pending_review** (`rule_2`)
- **Actual Model Observation:**
  - Identity: **UNCERTAIN** (conf: 0.50) — *"Product label is out of focus; cannot definitively confirm SKU."*
  - Completeness: **FAIL** (conf: 0.90) — Leaflet marked absent.
  - Condition: **PASS** (`Used - Good`, `signs_of_use`, conf: 0.80) — Overconfident condition grade.
  - Disposition: **pending_review** (`rule_2` triggered by Identity UNCERTAIN).
- **Classification:** **5. Condition Evidence Insufficiency / Model Overconfidence**
- **Analysis:** The model correctly abstained on Identity (**UNCERTAIN**), triggering Rule 2 (`pending_review`). However, it exhibited overconfidence on Condition by assigning `Used - Good` on an image it explicitly acknowledged was out of focus.

---

### CASE-06: Empty Container Returned (Tub Empty)
- **SKU:** `SKU-PROT-1KG` (Whey Protein Powder 1kg)
- **Expected:** Identity: **PASS** | Completeness: **FAIL** | Condition: **UNCERTAIN** / `empty_box` | Disposition: **pending_review** (`rule_3`)
- **Actual Model Observation:**
  - Identity: **PASS** (conf: 1.0) — Outer packaging matches.
  - Completeness: **FAIL** (conf: 1.0) — Powder missing, scoop missing.
  - Condition: **PASS** (`Used - Acceptable`, `empty_box`, conf: 1.0).
  - Disposition: **pending_review** (`rule_6c`).
- **Classification:** **6. Prompt/Schema Nuance on Condition Verdict**
- **Analysis:** The model accurately recognized `state: empty_box`. Under our schema, if a verdict is PASS, a condition grade is mandatory, so the model selected `Used - Acceptable`. Because essential contents were missing, Rule 6c safely routed to `pending_review`.

---

### CASE-07: Minor Cosmetic Wear (Clean Return)
- **SKU:** `WH-1001` (Wireless Headphones)
- **Expected:** Identity: **PASS** | Completeness: **PASS** | Condition: **PASS** (`Used - Very Good`) | Disposition: **restock** (`rule_5a`)
- **Actual Model Observation:**
  - Identity: **PASS** (conf: 1.0)
  - Completeness: **PASS** (conf: 1.0)
  - Condition: **PASS** (`Used - Very Good`, `signs_of_use`, conf: 1.0)
  - Disposition: **restock** (`rule_5a`)
- **Classification:** **None (Full Agreement — 100% Match)**
- **Analysis:** Perfect alignment across all 3 checks, condition grade, rule selection, and final disposition.

---

### CASE-08: Partially Obscured Product Label
- **SKU:** `SKU-PUZZLE-500` (500-Piece Jigsaw Puzzle)
- **Expected:** Identity: **UNCERTAIN** | Completeness: **PASS** | Condition: **PASS** | Disposition: **pending_review** (`rule_2`)
- **Actual Model Observation:**
  - Identity: **PASS** (conf: 0.90) — Read SKU from placard text.
  - Completeness: **PASS** (conf: 0.90)
  - Condition: **UNCERTAIN** (conf: 0.50) — *"The provided image shows a text-based inspection interface rather than a direct photograph of the item's physical condition."*
  - Disposition: **pending_review** (`rule_4`).
- **Classification:** **1. Image Fixture Ambiguity (Placard vs Photo)**
- **Analysis:** Crucial insight: Gemini detected that the fixture was a graphic card rather than a 3D physical object. It read the SKU from the card header (causing an unwarranted Identity PASS), but appropriately set Condition to UNCERTAIN because no physical surface was visible.

---

### CASE-09: Partially Hidden Accessory
- **SKU:** `SKU-LAMP-LED` (LED Desk Lamp)
- **Expected:** Identity: **PASS** | Completeness: **UNCERTAIN** | Condition: **PASS** | Disposition: **pending_review** (`rule_2`)
- **Actual Model Observation:**
  - Identity: **PASS** (conf: 1.0)
  - Completeness: **UNCERTAIN** (conf: 0.80) — *"Cord is visible under divider flap, but plug head is hidden making the USB power cable status uncertain."*
  - Condition: **UNCERTAIN** (conf: 0.50)
  - Disposition: **pending_review** (`rule_3`).
- **Classification:** **None (Expected Uncertainty Validated)**
- **Analysis:** The model followed the prompt's instruction to report `"uncertain"` when an accessory is partially obscured. Completeness UNCERTAIN routed deterministically to `pending_review`.

---

### CASE-10: Ambiguous / Altered Liquid State
- **SKU:** `SKU-SERUM-30` (Hydrating Face Serum 30ml)
- **Expected:** Identity: **PASS** | Completeness: **PASS** | Condition: **UNCERTAIN** | Disposition: **pending_review** (`rule_2`)
- **Actual Model Observation:**
  - Identity: **PASS** (conf: 1.0)
  - Completeness: **FAIL** (conf: 1.0) — Product leaflet marked absent.
  - Condition: **PASS** (`Used - Acceptable`, `signs_of_use`, conf: 0.90) — Noted cloudy liquid and sediment.
  - Disposition: **pending_review** (`rule_6c`).
- **Classification:** **5. Condition Evidence Insufficiency / Failure to Abstain**
- **Analysis:** The model accurately described the physical anomaly (*"liquid cloudy with unusual sediment"*), but chose `Used - Acceptable` instead of declaring `UNCERTAIN`. Rule 6c nevertheless routed the case to `pending_review`.

---

## 3. Classification Summary Table

| Category | Cases Affected | Description |
|---|---|---|
| **1. Image Fixture Ambiguity** | `CASE-01`, `CASE-08` | Text-based SVG placards trigger optical character reading from headers rather than pure physical object inspection. |
| **2. Reference-vs-Return Mismatch** | `None` | Catalog metadata matches expected test inputs. |
| **3. Product Identity Evidence Insufficiency** | `None` | Identity evidence was present or explicitly tested for absence. |
| **4. Completeness Evidence Insufficiency** | `CASE-04` | Model distinguished AC cord from USB cord based on visual representation. |
| **5. Condition Evidence Insufficiency** | `CASE-05`, `CASE-10` | Vision model forces a grade (`Used - Good`/`Used - Acceptable`) instead of abstaining when visual clarity is compromised. |
| **6. Prompt/Schema Issue** | `CASE-06` | Schema requires grade when verdict=PASS, forcing a grade selection even for `empty_box`. |
| **7. Model Limitation** | `CASE-01`, `CASE-02`, `CASE-03` | Prior brand hallucination ("Sony", "Anker") and connector pin blindness (Lightning vs USB-C). |
| **8. Deterministic Rule Issue** | `None` | Rules engine executed 100% deterministically in exact priority order. |
| **9. Other** | `None` | Pipeline infrastructure is fully intact. |

---

## 4. Key Questions Answered

### Which cases are genuine model failures?
- **`CASE-03` (Wrong product)**: Genuine vision failure. The model hallucinated an "Anker USB-C" cable and completely missed the Apple Lightning 8-pin connector.
- **`CASE-01` (Brand hallucination)**: Genuine vision failure. Model hallucinated "Sony WH-1000XM5" on a generic headphone SKU.
- **`CASE-05` & `CASE-10` (Condition overconfidence)**: Genuine behavioral failure. The model failed to abstain (`UNCERTAIN`) on degraded/ambiguous imagery.

### Which cases are fixture problems?
- **`CASE-01`, `CASE-02`, `CASE-08`**: Synthetic SVG-generated placards with text overlays cause the model to act as a document OCR reader rather than an object inspector. Real photographic images with actual physical backgrounds are essential for real-world benchmark validity.

### Which cases are prompt/schema problems?
- The prompt needs explicit negative instructions against **inventing brand names** not present in the SKU or product name.
- The prompt needs stronger calibration on **abstention**: *"If the image is blurry or liquid condition is ambiguous, you MUST return verdict: UNCERTAIN for condition."*

### Which production changes are justified?
1. **Prompt Refinement** (without changing schema or disposition rules):
   - Add negative constraint: *"Do NOT assume or report unmentioned brand names (e.g. Sony, Anker, Apple) unless clearly printed on the product label."*
   - Add condition abstention calibration: *"If resolution, focus, or lighting prevents seeing surface details, condition verdict MUST be UNCERTAIN."*
2. **Rules Engine**: **No changes.** The rules engine performed flawlessly across all 10 cases.

### Is the pipeline ready for a 50+ held-out evaluation?
**No, not until photographic fixtures replace textual placards.**
Running 50 synthetic SVG placards will test the model's text-reading priors rather than visual inspection capabilities. Phase 8 must use photographic image fixtures representing real physical returns.
