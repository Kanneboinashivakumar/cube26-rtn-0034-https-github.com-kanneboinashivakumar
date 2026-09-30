# ReturnOps AI — Demo Data Directory

**Dataset Type**: `synthetic_demo`  
**Purpose**: Authoritative storage of realistic product catalog references and customer return evidence packages for interactive workstation demonstrations.

---

## Structure

```
demo-data/
├── products/
│   ├── WH-1001/
│   │   ├── product.json
│   │   └── reference/
│   │       ├── 01.jpg   (Product View)
│   │       ├── 02.jpg   (Accessories & Cables)
│   │       └── 03.jpg   (Complete Package)
│   ├── DEMO-LAPTOP-001/
│   │   ├── product.json
│   │   └── reference/
│   │       ├── 01.jpg   (Laptop Open)
│   │       ├── 02.jpg   (Charger & Cable)
│   │       └── 03.jpg   (Complete Set)
│   └── SKU-CABLE-USBC/
│       ├── product.json
│       └── reference/
│           ├── 01.jpg   (USB-C Cable)
│           ├── 02.jpg   (Reversible USB-C Connector Macro)
│           └── 03.jpg   (Retail Package)
│
└── return-evidence/
    ├── RTN-001/
    │   ├── 01.jpg       (Returned Laptop)
    │   ├── 02.jpg       (Return Contents — Charger Absent)
    │   └── 03.jpg       (Power Cord & Manual)
    ├── RTN-002/
    │   ├── 01.jpg       (Damaged Headphones)
    │   ├── 02.jpg       (Hinge Fracture Macro)
    │   └── 03.jpg       (All Returned Contents Including Case & Cables)
    └── RTN-003/
        ├── 01.jpg       (Returned Cable)
        ├── 02.jpg       (Wrong Lightning 8-Pin Connector Macro)
        └── 03.jpg       (Opened Return Bag)
```

---

## Usage in Live Demonstrations

1. **Catalogue References** (`demo-data/products/`):
   - Automatically loaded by the workstation upon typing a valid SKU (e.g., `WH-1001`, `DEMO-LAPTOP-001`, or `SKU-CABLE-USBC`) or ASIN.
   - Displayed as the official catalogue standard.
2. **Customer Return Evidence** (`demo-data/return-evidence/`):
   - Available on the operator's computer to upload into the Return Evidence dropzone during live inspections.
