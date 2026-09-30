# Held-Out Evaluation Dataset (52 Cases)

This directory contains the **52-case held-out evaluation dataset** for ReturnOps AI (Cube Buildathon Phase 8).

## Dataset Composition
- **Total Cases:** 52
- **Images per Case:** 3 photographic evidence angles (156 images total)
- **Product Categories:** 9 distinct consumer goods categories (Consumer Electronics, Computers, Home, Beauty, Toys, Pet, Sports, Textiles, Nutrition)
- **Annotators:** Labeled independently by Human Annotator A and Human Annotator B to compute Inter-Annotator Agreement (Cohen's Kappa).

## Scenario Distribution
1. **Pristine / Factory Sealed** (8 cases): New, unopened factory packaging -> `restock` (`rule_5a`)
2. **Opened Unused / Like New** (8 cases): Opened package, unhandled product -> `restock` (`rule_5a`)
3. **Signs of Normal Use** (8 cases): Clean functional items with light wear -> `refurbish` (`rule_5b`)
4. **Moderate Wear / Acceptable** (4 cases): Intact but heavy cosmetic scratches -> `liquidate` (`rule_5d`)
5. **Severe Physical Damage** (6 cases): Shattered glass, snapped headbands, cut cords -> `dispose` (`rule_5c`)
6. **Missing Non-Essential Accessories** (5 cases): Minor auxiliary cords/leaflets missing -> `refurbish` / `liquidate` (`rule_6a` / `rule_6b`)
7. **Missing Essential Components** (5 cases): AC adapter brick, charger case, power cables missing -> `pending_review` (`rule_6c`)
8. **Wrong Product / SKU Mismatch** (4 cases): Apple Lightning cable returned for USB-C, cheap earbuds, disposable bottle -> `pending_review` (`rule_1`)
9. **Poor / Blurry Evidence** (2 cases): Heavy blur and lens glare -> Condition `UNCERTAIN` -> `pending_review` (`rule_4`)
10. **Ambiguous / Empty Container** (2 cases): Empty powder tub, obscured packing paper -> `dispose` (`rule_5e`) / `pending_review` (`rule_2`)

## File Structure
- `cases.json`: Ground-truth manifests, expected checks, dual-human labels, and scenario details.
- `images/`: 156 JPEG photographic fixtures (`EVAL-001_01.jpg` through `EVAL-052_03.jpg`).
