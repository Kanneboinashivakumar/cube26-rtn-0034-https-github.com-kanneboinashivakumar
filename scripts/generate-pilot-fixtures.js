/**
 * generate-pilot-fixtures.js
 *
 * Generates the Phase 7 evaluation pilot fixtures:
 *   - 10 synthetic test cases (CASE-01 to CASE-10)
 *   - 10 corresponding visual JPEG images
 *   - cases.json with structured evaluation metadata
 *   - README.md documenting the synthetic pilot dataset
 *
 * NOTE: These are synthetic pilot fixtures for developer verification.
 * They are NOT real-return data and do not modify organizer ground truth.
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const FIXTURES_DIR = path.join(__dirname, "..", "evaluation", "fixtures", "pilot");
const IMAGES_DIR = path.join(FIXTURES_DIR, "images");

// Ensure directories exist
fs.mkdirSync(IMAGES_DIR, { recursive: true });

const CASES = [
  {
    case_id: "CASE-01",
    sku: "WH-1001",
    product_name: "Wireless Headphones (Noise Cancelling)",
    scenario: "Correct product + complete (pristine condition, factory sealed)",
    image_filename: "CASE-01_complete_pristine.jpg",
    expected: {
      identity: { verdict: "PASS", confidence: 0.95 },
      completeness: {
        verdict: "PASS",
        confidence: 0.95,
        observed_components: [
          { name: "Headphones", observed: true },
          { name: "Charging case", observed: true },
          { name: "USB-C cable", observed: true },
          { name: "3.5mm audio cable", observed: true },
          { name: "User manual", observed: true }
        ]
      },
      condition: {
        verdict: "PASS",
        confidence: 0.95,
        grade: "New",
        observed_state: "factory_sealed"
      },
      disposition: "restock",
      rule_id: "rule_5a"
    },
    evidence_notes: "Original packaging intact with uncompromised factory shrink-wrap seal. SKU barcode WH-1001 clearly printed and scanned. All 5 components observed in designated blister slots.",
    visual_theme: {
      bg: "#f8fafc",
      accent: "#16a34a",
      title: "CASE-01: Correct Product + Complete",
      status_label: "FACTORY SEALED · ALL COMPONENTS PRESENT",
      items: [
        "✓ WH-1001 Noise Cancelling Headphones",
        "✓ Hard Protective Charging Case",
        "✓ USB-C Braided Cable (1m)",
        "✓ 3.5mm Auxiliary Cable",
        "✓ Quick Start Manual"
      ],
      details: "Outer shrinkwrap: INTACT | Barcode: WH-1001 VALID | Seals: UNBROKEN"
    }
  },
  {
    case_id: "CASE-02",
    sku: "WH-1001",
    product_name: "Wireless Headphones (Noise Cancelling)",
    scenario: "Correct product + missing accessory (USB-C cable omitted)",
    image_filename: "CASE-02_missing_accessory.jpg",
    expected: {
      identity: { verdict: "PASS", confidence: 0.92 },
      completeness: {
        verdict: "FAIL",
        confidence: 0.90,
        observed_components: [
          { name: "Headphones", observed: true },
          { name: "Charging case", observed: true },
          { name: "USB-C cable", observed: false },
          { name: "3.5mm audio cable", observed: true },
          { name: "User manual", observed: true }
        ]
      },
      condition: {
        verdict: "PASS",
        confidence: 0.88,
        grade: "Used - Very Good",
        observed_state: "signs_of_use"
      },
      disposition: "refurbish",
      rule_id: "rule_6b"
    },
    evidence_notes: "Headphones and charging case present in box. Cable storage tray is visibly empty. USB-C cable is non-essential; condition is resale-suitable (Used - Very Good). Rules route to refurbish for accessory re-kitting.",
    visual_theme: {
      bg: "#fefce8",
      accent: "#ca8a04",
      title: "CASE-02: Correct Product + Missing Cable",
      status_label: "MISSING ACCESSORY · NON-ESSENTIAL CABLE EMPTY",
      items: [
        "✓ WH-1001 Headphones (Present)",
        "✓ Charging Case (Present)",
        "✗ USB-C Cable (COMPARTMENT EMPTY)",
        "✓ 3.5mm Auxiliary Cable (Present)",
        "✓ Quick Start Guide (Present)"
      ],
      details: "Defect: Missing USB-C Cable | Product condition: Light handling | Disposition: Refurbish"
    }
  },
  {
    case_id: "CASE-03",
    sku: "SKU-CABLE-USBC",
    product_name: "USB-C Charging Cable 2m",
    scenario: "Similar-looking wrong product (Apple Lightning 8-pin returned instead of USB-C)",
    image_filename: "CASE-03_wrong_product.jpg",
    expected: {
      identity: { verdict: "FAIL", confidence: 0.94 },
      completeness: {
        verdict: "FAIL",
        confidence: 0.85,
        observed_components: [
          { name: "Cable", observed: false }
        ]
      },
      condition: {
        verdict: "PASS",
        confidence: 0.80,
        grade: "Used - Like New",
        observed_state: "opened_unused"
      },
      disposition: "pending_review",
      rule_id: "rule_1"
    },
    evidence_notes: "Customer returned an Apple 8-pin Lightning cable inside the packaging instead of the sold 2m USB-C cable. Connector geometry is rectangular with exposed gold pins on one side, not the oval reversible USB-C format. Identity fails, triggering Rule 1.",
    visual_theme: {
      bg: "#fef2f2",
      accent: "#dc2626",
      title: "CASE-03: Wrong Product Returned",
      status_label: "IDENTITY MISMATCH · LIGHTNING CABLE INSTEAD OF USB-C",
      items: [
        "Expected: USB-C Oval Reversible 24-pin Connector",
        "Observed: Lightning Flat 8-pin Connector (Wrong Item)",
        "Package Label: SKU-CABLE-USBC (Mismatch with physical item)"
      ],
      details: "Connector mismatch detected | Fraud / Mismatch check: FAILED | Action: Pending Review"
    }
  },
  {
    case_id: "CASE-04",
    sku: "SKU-LAMP-LED",
    product_name: "LED Desk Lamp",
    scenario: "Correct product + visible damage (hinge fracture, cracked base)",
    image_filename: "CASE-04_visible_damage.jpg",
    expected: {
      identity: { verdict: "PASS", confidence: 0.90 },
      completeness: {
        verdict: "PASS",
        confidence: 0.88,
        observed_components: [
          { name: "Lamp", observed: true },
          { name: "USB power cable", observed: true },
          { name: "User manual", observed: true }
        ]
      },
      condition: {
        verdict: "PASS",
        confidence: 0.92,
        grade: "Used - Acceptable",
        observed_state: "damaged"
      },
      disposition: "dispose",
      rule_id: "rule_5c"
    },
    evidence_notes: "Product identity and completeness confirmed (lamp and power cord present). However, structural hinge arm is snapped in half with internal wiring exposed. Base shell has a 4cm stress crack. Condition is damaged / Used - Acceptable. Rules route to dispose.",
    visual_theme: {
      bg: "#fff1f2",
      accent: "#be123c",
      title: "CASE-04: Visible Physical Damage",
      status_label: "STRUCTURAL FAILURE · CRACKED HINGE & EXPOSED WIRE",
      items: [
        "✓ Lamp Unit Present",
        "✓ USB Power Cable Present",
        "✗ Upper Articulation Arm SNAPPED",
        "✗ Base Enclosure CRACKED (4cm fracture)"
      ],
      details: "Damage level: Non-repairable structural failure | Electrical hazard | Disposition: Dispose"
    }
  },
  {
    case_id: "CASE-05",
    sku: "SKU-SERUM-30",
    product_name: "Hydrating Face Serum 30ml",
    scenario: "Poor / blurry image (severe motion blur, out of focus, poor lighting)",
    image_filename: "CASE-05_blurry_unclear.jpg",
    expected: {
      identity: { verdict: "UNCERTAIN", confidence: 0.35 },
      completeness: {
        verdict: "UNCERTAIN",
        confidence: 0.30,
        observed_components: [
          { name: "Serum bottle", observed: "uncertain" },
          { name: "Dropper", observed: "uncertain" }
        ]
      },
      condition: {
        verdict: "UNCERTAIN",
        confidence: 0.25,
        observed_state: "uncertain"
      },
      disposition: "pending_review",
      rule_id: "rule_2"
    },
    evidence_notes: "Image suffers from extreme motion blur, severe lens flare, and low resolution. Product title, ingredients list, fluid level, and dropper seal cannot be verified. Fail-open triggers Rule 2 (any check UNCERTAIN -> pending_review).",
    visual_theme: {
      bg: "#f1f5f9",
      accent: "#64748b",
      title: "CASE-05: Deficient Evidence (Blurry)",
      status_label: "UNREADABLE IMAGE · LOW CONFIDENCE · UNCERTAIN",
      items: [
        "? Text unreadable due to camera shake blur",
        "? Fluid fill line obscured by glare",
        "? Dropper pipette presence ambiguous"
      ],
      details: "Visual quality: INSUFFICIENT | Blur rating: SEVERE | Operator action required: Retake photo"
    }
  },
  {
    case_id: "CASE-06",
    sku: "SKU-PROT-1KG",
    product_name: "Whey Protein Powder 1kg",
    scenario: "Empty box / empty container returned (tub empty with seal torn)",
    image_filename: "CASE-06_empty_box.jpg",
    expected: {
      identity: { verdict: "PASS", confidence: 0.88 },
      completeness: {
        verdict: "FAIL",
        confidence: 0.92,
        observed_components: [
          { name: "Protein tub", observed: false },
          { name: "Scoop", observed: false }
        ]
      },
      condition: {
        verdict: "UNCERTAIN",
        confidence: 0.85,
        observed_state: "empty_box"
      },
      disposition: "pending_review",
      rule_id: "rule_3"
    },
    evidence_notes: "Outer tub packaging matches SKU-PROT-1KG branding. However, tub lid is off and inner chamber is completely empty with no powder residue. Foil induction seal is torn off. Completeness fails for essential component (tub contents missing), triggering Rule 3 (pending_review).",
    visual_theme: {
      bg: "#fef3c7",
      accent: "#d97706",
      title: "CASE-06: Empty Packaging Returned",
      status_label: "EMPTY TUB · ESSENTIAL CONTENTS MISSING",
      items: [
        "✓ Outer Packaging Matches SKU-PROT-1KG",
        "✗ Powder Contents: 0% FILLED (EMPTY TUB)",
        "✗ Factory Foil Seal: TORN / MISSING",
        "✗ Measuring Scoop: MISSING"
      ],
      details: "Weight: ~120g (expected 1000g+) | Defect: Empty container | Disposition: Pending Review"
    }
  },
  {
    case_id: "CASE-07",
    sku: "WH-1001",
    product_name: "Wireless Headphones (Noise Cancelling)",
    scenario: "Correct product + minor cosmetic wear (hairline surface scuffs, complete)",
    image_filename: "CASE-07_minor_cosmetic_wear.jpg",
    expected: {
      identity: { verdict: "PASS", confidence: 0.95 },
      completeness: {
        verdict: "PASS",
        confidence: 0.92,
        observed_components: [
          { name: "Headphones", observed: true },
          { name: "Charging case", observed: true },
          { name: "USB-C cable", observed: true },
          { name: "3.5mm audio cable", observed: true },
          { name: "User manual", observed: true }
        ]
      },
      condition: {
        verdict: "PASS",
        confidence: 0.90,
        grade: "Used - Very Good",
        observed_state: "signs_of_use"
      },
      disposition: "restock",
      rule_id: "rule_5a"
    },
    evidence_notes: "All components present and authentic. Earcups show light handling marks and fine hairline scuff on the right hinge cover. Ear cushions intact and clean. Condition is Used - Very Good (resale suitable). Rule 5a routes to restock (open-box tier).",
    visual_theme: {
      bg: "#f0fdf4",
      accent: "#15803d",
      title: "CASE-07: Minor Cosmetic Wear (Complete)",
      status_label: "USED - VERY GOOD · MINOR COSMETIC MARKS",
      items: [
        "✓ Headphones with light scuff on right yoke",
        "✓ Charging case fully functional",
        "✓ All cables and manual present",
        "✓ Ear pads clean, sanitizable"
      ],
      details: "Wear severity: Light / Surface-level | Resale suitable: YES | Disposition: Restock"
    }
  },
  {
    case_id: "CASE-08",
    sku: "SKU-PUZZLE-500",
    product_name: "500-Piece Jigsaw Puzzle",
    scenario: "Partially obscured product label (carrier sticker pasted over SKU barcode)",
    image_filename: "CASE-08_obscured_label.jpg",
    expected: {
      identity: { verdict: "UNCERTAIN", confidence: 0.50 },
      completeness: {
        verdict: "PASS",
        confidence: 0.85,
        observed_components: [
          { name: "Puzzle pieces", observed: true },
          { name: "Reference poster", observed: true }
        ]
      },
      condition: {
        verdict: "PASS",
        confidence: 0.85,
        grade: "Used - Good",
        observed_state: "opened_unused"
      },
      disposition: "pending_review",
      rule_id: "rule_2"
    },
    evidence_notes: "Puzzle box has a courier return label pasted over the product model number and barcode. Cannot verify whether this is the 500-piece landscape or 1000-piece variant. Identity check cannot reach confidence threshold -> UNCERTAIN -> Rule 2 pending_review.",
    visual_theme: {
      bg: "#faf5ff",
      accent: "#7e22ce",
      title: "CASE-08: Partially Obscured Label",
      status_label: "BARCODE OBSCURED · CARRIER STICKER OVERLAY",
      items: [
        "? Barcode and SKU area covered by sticker",
        "? Piece count unconfirmed from outer box",
        "✓ Puzzle piece bag observed intact",
        "✓ Reference foldout poster present"
      ],
      details: "Identification issue: Barcode unreadable | Manual label peel required | Rule 2: Pending Review"
    }
  },
  {
    case_id: "CASE-09",
    sku: "SKU-LAMP-LED",
    product_name: "LED Desk Lamp",
    scenario: "Partially hidden accessory (cable tucked under cardboard divider)",
    image_filename: "CASE-09_hidden_accessory.jpg",
    expected: {
      identity: { verdict: "PASS", confidence: 0.92 },
      completeness: {
        verdict: "UNCERTAIN",
        confidence: 0.55,
        observed_components: [
          { name: "Lamp", observed: true },
          { name: "USB power cable", observed: "uncertain" },
          { name: "User manual", observed: true }
        ]
      },
      condition: {
        verdict: "PASS",
        confidence: 0.90,
        grade: "Used - Like New",
        observed_state: "opened_unused"
      },
      disposition: "pending_review",
      rule_id: "rule_2"
    },
    evidence_notes: "Desk lamp unit is prominent and in pristine condition. A white cord is partially visible tucked beneath the lower packaging flap, but neither terminal head is exposed. Cannot confirm if power cable is intact or severed. Completeness is UNCERTAIN -> Rule 2 pending_review.",
    visual_theme: {
      bg: "#f8fafc",
      accent: "#0284c7",
      title: "CASE-09: Partially Hidden Cable",
      status_label: "ACCESSORY TUCKED BENEATH CARDBOARD",
      items: [
        "✓ LED Lamp Assembly Visible",
        "? Cord visible under divider flap, plug head hidden",
        "✓ Instruction Manual in Pocket"
      ],
      details: "Ambiguity: Power cord connector obscured | Evidence incomplete | Rule 2: Pending Review"
    }
  },
  {
    case_id: "CASE-10",
    sku: "SKU-SERUM-30",
    product_name: "Hydrating Face Serum 30ml",
    scenario: "Ambiguous / mixed evidence (liquid discoloured, partial fill, suspicious residue)",
    image_filename: "CASE-10_ambiguous_evidence.jpg",
    expected: {
      identity: { verdict: "PASS", confidence: 0.90 },
      completeness: {
        verdict: "PASS",
        confidence: 0.88,
        observed_components: [
          { name: "Serum bottle", observed: true },
          { name: "Dropper", observed: true },
          { name: "Product leaflet", observed: true }
        ]
      },
      condition: {
        verdict: "UNCERTAIN",
        confidence: 0.45,
        observed_state: "uncertain"
      },
      disposition: "pending_review",
      rule_id: "rule_2"
    },
    evidence_notes: "Serum bottle, dropper, and leaflet are all present. However, the cosmetic fluid shows cloudy brown sediment (expected clear/hyaluronic). Bottle is ~60% full with crystal residue around pipette thread. Cannot discern whether product is safe/resaleable without physical lab check. Condition UNCERTAIN -> Rule 2 pending_review.",
    visual_theme: {
      bg: "#fdf4ff",
      accent: "#a21caf",
      title: "CASE-10: Ambiguous Liquid State",
      status_label: "SUSPICIOUS RESIDUE · CLOUDY LIQUID · PARTIAL FILL",
      items: [
        "✓ Authentic Bottle & Dropper Present",
        "? Liquid cloudy with unusual sediment",
        "? Fill line at 18ml / 30ml (40% depleted)",
        "? Residue crust on dropper threads"
      ],
      details: "Hygienic / Safety concern: Liquid alteration suspected | Rule 2: Pending Review"
    }
  }
];

function generateSvgForCase(c) {
  const t = c.visual_theme;
  const itemsList = t.items.map((it, i) => {
    const isPass = it.startsWith("✓");
    const isFail = it.startsWith("✗");
    const color = isPass ? "#16a34a" : isFail ? "#dc2626" : "#475569";
    return `<text x="60" y="${260 + i * 36}" font-family="Arial, sans-serif" font-size="16" font-weight="600" fill="${color}">${escapeXml(it)}</text>`;
  }).join("\n");

  return `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${t.bg}"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
    <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity="0.08"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="800" height="600" fill="url(#bgGrad)"/>
  <rect x="0" y="0" width="800" height="12" fill="${t.accent}"/>

  <!-- Top Metadata Bar -->
  <rect x="40" y="30" width="720" height="70" rx="8" fill="#ffffff" filter="url(#cardShadow)"/>
  <text x="60" y="60" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#64748b" letter-spacing="1">SYNTHETIC PILOT FIXTURE · ${c.case_id}</text>
  <text x="60" y="84" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#0f172a">${escapeXml(c.product_name)}</text>
  <text x="620" y="74" font-family="monospace" font-size="16" font-weight="bold" fill="${t.accent}">${c.sku}</text>

  <!-- Scenario Title & Status Banner -->
  <rect x="40" y="115" width="720" height="50" rx="6" fill="${t.accent}" opacity="0.12"/>
  <text x="60" y="146" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${t.accent}">${escapeXml(t.status_label)}</text>

  <!-- Main Evidence Inspection Card -->
  <rect x="40" y="180" width="720" height="320" rx="10" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" filter="url(#cardShadow)"/>
  
  <text x="60" y="215" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#334155" text-transform="uppercase" letter-spacing="0.5">Physical Inspection Observations:</text>
  <line x1="60" y1="228" x2="740" y2="228" stroke="#f1f5f9" stroke-width="2"/>

  <!-- Items list -->
  ${itemsList}

  <!-- Lower Detail / Expected Disposition Bar -->
  <rect x="60" y="440" width="680" height="42" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
  <text x="75" y="466" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#475569">${escapeXml(t.details)}</text>

  <!-- Expected Outcome Pill in Footer -->
  <rect x="40" y="520" width="720" height="55" rx="8" fill="#0f172a"/>
  <text x="60" y="553" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#94a3b8">Expected Disposition:</text>
  <rect x="220" y="533" width="130" height="28" rx="14" fill="${t.accent}"/>
  <text x="285" y="552" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">${c.expected.disposition.toUpperCase()}</text>

  <text x="370" y="553" font-family="monospace" font-size="13" fill="#cbd5e1">Rule: ${c.expected.rule_id}</text>
  <text x="590" y="553" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Synthetic Fixture</text>
</svg>`;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function main() {
  console.log("Generating 10 synthetic pilot images...");

  for (const c of CASES) {
    const svg = generateSvgForCase(c);
    const destPath = path.join(IMAGES_DIR, c.image_filename);
    await sharp(Buffer.from(svg))
      .jpeg({ quality: 90 })
      .toFile(destPath);
    console.log(`✓ Generated ${c.case_id}: ${c.image_filename}`);
  }

  // Write cases.json metadata
  const metadata = {
    dataset_type: "synthetic_pilot",
    generated_at: new Date().toISOString(),
    version: "1.0",
    disclaimer: "These are synthetic pilot fixtures generated for developer verification of the ReturnOps AI inspection pipeline. They are NOT real-return customer data, do NOT modify organizer ground truth, and must NOT be cited as real-world benchmark metrics.",
    total_cases: CASES.length,
    cases: CASES.map(c => {
      // Omit visual_theme from official metadata to keep schema clean
      const { visual_theme, ...caseData } = c;
      return caseData;
    })
  };

  const metadataPath = path.join(FIXTURES_DIR, "cases.json");
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf8");
  console.log(`✓ Wrote metadata to ${metadataPath}`);

  // Write README.md
  const readmeContent = `# Synthetic Pilot Fixture Set (Phase 7)

**Dataset Type:** \`synthetic_pilot\`  
**Scope:** 10 curated test fixtures covering all required pilot scenarios.  
**Storage Path:** \`evaluation/fixtures/pilot/\`

> [!IMPORTANT]
> **SYNTHETIC PILOT DISCLAIMER**  
> These fixtures are synthetic test cases created solely for developer verification of prompt structure, check independence, and rules engine execution.  
> They are **NOT** real customer return data, do **NOT** modify the official organizer sample (\`data/returns_sample.csv\`), and are **NOT** claimed as real-world benchmark metrics.

---

## 1. Scenario Coverage Matrix

| Case ID | SKU | Product | Scenario | Expected Identity | Expected Completeness | Expected Condition | Expected Disposition | Documented Rule |
|---|---|---|---|---|---|---|---|---|
| **CASE-01** | \`WH-1001\` | Wireless Headphones | Correct product + complete (pristine) | PASS | PASS | PASS (New) | **restock** | Rule 5a |
| **CASE-02** | \`WH-1001\` | Wireless Headphones | Correct product + missing USB-C cable | PASS | FAIL | PASS (Used - Very Good) | **refurbish** | Rule 6b |
| **CASE-03** | \`SKU-CABLE-USBC\` | USB-C Cable 2m | Similar-looking wrong product (Lightning) | FAIL | FAIL | PASS (Used - Like New) | **pending_review** | Rule 1 |
| **CASE-04** | \`SKU-LAMP-LED\` | LED Desk Lamp | Correct product + cracked hinge / broken base | PASS | PASS | PASS (Used - Acceptable) | **dispose** | Rule 5c |
| **CASE-05** | \`SKU-SERUM-30\` | Face Serum 30ml | Poor / blurry / unreadable image | UNCERTAIN | UNCERTAIN | UNCERTAIN | **pending_review** | Rule 2 |
| **CASE-06** | \`SKU-PROT-1KG\` | Whey Protein 1kg | Empty container (contents missing) | PASS | FAIL | UNCERTAIN (empty_box) | **pending_review** | Rule 3 |
| **CASE-07** | \`WH-1001\` | Wireless Headphones | Correct product + minor cosmetic scuffs | PASS | PASS | PASS (Used - Very Good) | **restock** | Rule 5a |
| **CASE-08** | \`SKU-PUZZLE-500\` | 500-Piece Puzzle | Partially obscured label (carrier sticker) | UNCERTAIN | PASS | PASS (Used - Good) | **pending_review** | Rule 2 |
| **CASE-09** | \`SKU-LAMP-LED\` | LED Desk Lamp | Partially hidden cable under divider | PASS | UNCERTAIN | PASS (Used - Like New) | **pending_review** | Rule 2 |
| **CASE-10** | \`SKU-SERUM-30\` | Face Serum 30ml | Ambiguous / cloudy liquid / residue | PASS | PASS | UNCERTAIN | **pending_review** | Rule 2 |

---

## 2. Directory Structure

\`\`\`
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
\`\`\`
`;

  const readmePath = path.join(FIXTURES_DIR, "README.md");
  fs.writeFileSync(readmePath, readmeContent, "utf8");
  console.log(`✓ Wrote documentation to ${readmePath}`);
  console.log("All 10 pilot fixtures successfully generated!");
}

main().catch(err => {
  console.error("Error generating fixtures:", err);
  process.exit(1);
});
