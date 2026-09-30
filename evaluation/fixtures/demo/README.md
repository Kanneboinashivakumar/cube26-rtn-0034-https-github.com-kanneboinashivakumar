# ReturnOps AI — Realistic Demo Fixtures

**Dataset Type**: `synthetic_demo`  
**Total Cases**: 3  
**Total Images**: 18 (3 cases × 3 reference photographs + 3 return photographs)

---

## IMPORTANT DISCLAIMER

> **CRITICAL EVALUATION BOUNDARY**:
> These fixtures are synthetic demonstration and developer verification cases.
> 
> They are **NOT**:
> - Real customer return records
> - Organizer ground truth
> - The final 50+ held-out evaluation dataset (Phase 8)
> - Evidence for real-world accuracy or benchmark claims

---

## Purpose

The Phase 7 diagnostic review proved that text-inscribed SVG placards were unsuitable for realistic multimodal evaluation. The demo fixture set replaces placards with 18 realistic photographic captures representing authentic warehouse return scenarios:

1. **CASE-01 — 15-inch Laptop (`DEMO-LAPTOP-001`)**:
   - **Scenario**: Missing essential AC power adapter / charger.
   - **Controlled Change**: Power adapter omitted from return contents while laptop, power cable, and documentation remain present.
   - **Expected Outcome**: Identity PASS, Completeness FAIL (missing essential charger), Condition PASS ("Used - Like New"), Disposition `pending_review` (Rule 6c).

2. **CASE-02 — Wireless Headphones (`WH-1001`)**:
   - **Scenario**: Visible structural physical damage.
   - **Controlled Change**: Cracked headband and broken hinge on returned unit. All components present.
   - **Expected Outcome**: Identity PASS, Completeness PASS, Condition PASS ("Used - Acceptable", state: "damaged"), Disposition `dispose` (Rule 5c).

3. **CASE-03 — USB-C Charging Cable (`SKU-CABLE-USBC`)**:
   - **Scenario**: Wrong similar-looking item returned (Apple 8-pin Lightning cable).
   - **Controlled Change**: Connector is an Apple 8-pin Lightning plug (flat external pins) instead of hollow oval USB-C receptacle.
   - **Expected Outcome**: Identity FAIL, Completeness PASS, Condition PASS ("Used - Like New"), Disposition `pending_review` (Rule 1).

---

## Directory Structure

```
evaluation/fixtures/demo/
├── CASE-01/
│   ├── case.json
│   ├── reference/
│   │   ├── REF-01_product.jpg
│   │   ├── REF-02_accessories.jpg
│   │   └── REF-03_complete_package.jpg
│   └── return/
│       ├── IMG-01_laptop.jpg
│       ├── IMG-02_return_contents.jpg
│       └── IMG-03_accessories.jpg
├── CASE-02/
│   ├── case.json
│   ├── reference/
│   │   ├── REF-01_product.jpg
│   │   ├── REF-02_accessories.jpg
│   │   └── REF-03_complete_package.jpg
│   └── return/
│       ├── IMG-01_headphones.jpg
│       ├── IMG-02_damage.jpg
│       └── IMG-03_return_contents.jpg
├── CASE-03/
│   ├── case.json
│   ├── reference/
│   │   ├── REF-01_expected_cable.jpg
│   │   ├── REF-02_expected_connector.jpg
│   │   └── REF-03_expected_package.jpg
│   └── return/
│       ├── IMG-01_return_cable.jpg
│       ├── IMG-02_return_connector.jpg
│       └── IMG-03_return_package.jpg
├── demo-cases.json
└── README.md
```

All 18 images are normalized 800×600 JPEGs without any synthetic text, banners, watermarks, or embedded verdicts.
