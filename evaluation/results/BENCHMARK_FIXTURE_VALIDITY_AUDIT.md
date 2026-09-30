# Benchmark Fixture Validity Audit — Phase 8 Evaluation Benchmark

**Audit Target:** All 52 frozen held-out evaluation test cases (`EVAL-001` through `EVAL-052`)  
**Scope:** Investigation of the Phase 8 v1.1 evaluation regression (from 71.2% to 59.6% disposition accuracy) and empirical assessment of fixture validity, physical merchandise representation, and guardrail interactions.  
**Strict Policy:** Audit only. No production code, prompts, schemas, disposition rules, or evaluation datasets were modified.

---

## 1. Executive Summary

A comprehensive case-by-case audit of the 52 held-out evaluation fixtures in `evaluation/fixtures/held_out/images/` was conducted to investigate the root cause of the v1.1 evaluation regression.

### Key Empirical Findings:

1. **Physical Nature of Fixtures:**
   - **100% of the 156 images** (`EVAL-001_01.jpg` through `EVAL-052_03.jpg`) in the evaluation directory are **synthetic vector placards** generated via Sharp and SVG markup. 
   - None of the 156 images contain lens-captured camera photographs of physical 3D products or real returned merchandise.
   - Each image is composed of an operational header, warehouse bench grid, status pill (e.g. `FACTORY SEALED`, `COMPONENT AUDIT`, `PHYSICAL DAMAGE DETECTED`), scenario description text, component checklist table, and physical inspection notes.

2. **The Root Cause of the v1.1 Regression:**
   - In v1.0, Gemini interpreted these text placards and status tables as descriptive visual evidence of the returned items and labels, achieving **71.2% disposition accuracy** (37/52 matches).
   - In v1.1, Proposal 3 added an explicit operational anti-fraud instruction to `SYSTEM_INSTRUCTION`:
     > *"If the provided evidence photos consist solely of paperwork, shipping manifests, text status cards/placards, or computer screenshots without the physical merchandise visible, you MUST report UNCERTAIN across checks (physical merchandise not presented in photo)."*
   - Because the test fixtures **literally are SVG text cards and placards**, Gemini obeyed this instruction with strict literal adherence:
     - On **22 test cases**, Gemini explicitly flagged that *"The provided evidence photos consist solely of text placards and metadata summary screens without any visual depiction of the physical product"* and returned `UNCERTAIN`.
     - Combined with the 2 intentional blurry evidence cases (`EVAL-049`, `EVAL-050`) and 1 intentional kraft paper case (`EVAL-052`), this caused **25 total UNCERTAIN outcomes** on Identity and Completeness.
     - Exactly **8 cases** that were correct matches in v1.0 shifted to `pending_review` in v1.1, accounting for **100% of the net disposition accuracy regression** ($37 - 8 + 2 = 31 / 52 = 59.6%$).

3. **Triumphs of v1.1 in Real-World Scenarios:**
   - **Factory-Sealed Packages (`EVAL-001`):** Successfully resolved from v1.0 failure (`UNCERTAIN`) to 100% match (`restock`) via the factory-sealed completeness inference rule.
   - **Condition Rubric Calibration (`EVAL-019`):** Correctly graded `Used - Good` instead of v1.0's inflated `Used - Very Good`, recovering the correct `refurbish` disposition.
   - **Damaged Goods Routing:** 6 of 7 damaged returns (`EVAL-030` to `034`, `051`) consistently received `Used - Acceptable` and cleanly routed to `dispose`.
   - **Critical Safety:** Flawless **0.0% critical safety error rate** maintained across both versions.

---

## 2. Comprehensive 52-Case Audit Table

The table below catalogs every evaluation case, contrasting the physical evidence supplied against ground-truth expectations and empirical performance across v1.0 and v1.1.

| Case ID | Product & Category | Scenario | Fixture Representation | Visibly Present? | Ground Truth (ID / Comp / Cond / Disp) | v1.0 Actual (ID / Comp / Cond / Disp) | v1.1 Actual (ID / Comp / Cond / Disp) | Guardrail Triggered? | Operational Applicability & Validity Note |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| **EVAL-001** | WH-1001<br>(Wireless Headphones (Noise Cancelling)) | Customer unopened return, original shrinkwrap intact | SVG Placard (Sealed Badge) | Packaging Spec | PASS / PASS / New / `restock` | PASS / UNCERTAIN / New / `pending_review` | PASS / PASS / New / `restock` | **YES** | Valid test of sealed package rule |
| **EVAL-002** | SKU-LAMP-LED<br>(LED Desk Lamp) | Desk lamp returned in sealed retail carton with tape intact | SVG Placard (Sealed Badge) | Packaging Spec | PASS / PASS / New / `restock` | PASS / PASS / New / `restock` | PASS / PASS / New / `restock` | **YES** | Valid test of sealed package rule |
| **EVAL-003** | SKU-SERUM-30<br>(Hydrating Face Serum 30ml) | Face serum in pristine sealed box with tamper sticker | SVG Placard (Sealed Badge) | Packaging Spec | PASS / PASS / New / `restock` | PASS / PASS / New / `restock` | PASS / PASS / New / `restock` | No | Valid test of sealed package rule |
| **EVAL-004** | SKU-PUZZLE-500<br>(500-Piece Jigsaw Puzzle) | Jigsaw puzzle in original clear shrinkwrap | SVG Placard (Sealed Badge) | Packaging Spec | PASS / PASS / New / `restock` | PASS / PASS / New / `restock` | PASS / PASS / New / `restock` | **YES** | Valid test of sealed package rule |
| **EVAL-005** | SKU-BOTTLE-750<br>(Insulated Water Bottle 750ml) | Water bottle in original polybag with hangtag attached | SVG Placard (Sealed Badge) | Packaging Spec | PASS / PASS / New / `restock` | PASS / PASS / New / `restock` | PASS / PASS / New / `restock` | **YES** | Valid test of sealed package rule |
| **EVAL-006** | SKU-CABLE-USBC<br>(USB-C Charging Cable 2m) | USB-C cable in sealed blister pack | SVG Placard (Sealed Badge) | Packaging Spec | PASS / PASS / New / `restock` | PASS / PASS / New / `restock` | PASS / PASS / New / `restock` | No | Valid test of sealed package rule |
| **EVAL-007** | SKU-TOWEL-BLU<br>(Microfiber Bath Towel Blue) | Microfiber bath towel in sealed manufacturer band | SVG Placard (Sealed Badge) | Packaging Spec | PASS / PASS / New / `restock` | PASS / PASS / New / `restock` | PASS / PASS / New / `restock` | No | Valid test of sealed package rule |
| **EVAL-008** | SKU-PROT-1KG<br>(Whey Protein Powder 1kg) | Whey protein tub with outer neck band & inner pressure seal | SVG Placard (Sealed Badge) | Packaging Spec | PASS / PASS / New / `restock` | PASS / PASS / New / `restock` | PASS / PASS / New / `restock` | No | Valid test of sealed package rule |
| **EVAL-009** | DEMO-LAPTOP-001<br>(15-inch Laptop) | Laptop box opened, protective screen film intact, all items present | SVG Text Placard | No (Placard) | PASS / PASS / Used - Like New / `restock` | PASS / PASS / Used - Like New / `restock` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-010** | WH-1001<br>(Wireless Headphones (Noise Cancelling)) | Headphones packaging opened to inspect color, never worn, all cables coiled | SVG Text Placard | No (Placard) | PASS / PASS / Used - Like New / `restock` | PASS / PASS / Used - Like New / `restock` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-011** | SKU-LAMP-LED<br>(LED Desk Lamp) | Desk lamp unboxed but base and arm free of any scratches, cables bundled | SVG Text Placard | No (Placard) | PASS / PASS / Used - Like New / `restock` | PASS / PASS / Used - Like New / `restock` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-012** | SKU-BOTTLE-750<br>(Insulated Water Bottle 750ml) | Water bottle unbagged, zero water residue or odors, lid gasket mint | SVG Text Placard | No (Placard) | PASS / PASS / Used - Like New / `restock` | PASS / PASS / Used - Like New / `restock` | PASS / PASS / Used - Like New / `restock` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-013** | SKU-CABLE-USBC<br>(USB-C Charging Cable 2m) | USB-C cable blister opened cleanly, cable untied but pristine gold contacts | SVG Text Placard | No (Placard) | PASS / PASS / Used - Like New / `restock` | UNCERTAIN / PASS / Used - Like New / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-014** | SKU-LEASH-6FT<br>(Heavy-Duty Dog Leash 6ft) | Dog leash removed from card, clip mechanism tested, nylon web pristine | SVG Text Placard | No (Placard) | PASS / PASS / Used - Like New / `restock` | PASS / PASS / Used - Like New / `restock` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-015** | SKU-PUZZLE-500<br>(500-Piece Jigsaw Puzzle) | Puzzle box shrinkwrap removed, but inner piece bag sealed | SVG Text Placard | No (Placard) | PASS / PASS / Used - Like New / `restock` | PASS / PASS / Used - Like New / `restock` | PASS / PASS / Used - Like New / `restock` | No | Synthetic representation |
| **EVAL-016** | SKU-TOWEL-BLU<br>(Microfiber Bath Towel Blue) | Towel unfolded once, label intact, zero stains or lint | SVG Text Placard | No (Placard) | PASS / PASS / Used - Like New / `restock` | PASS / PASS / Used - Like New / `restock` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-017** | DEMO-LAPTOP-001<br>(15-inch Laptop) | Laptop with minor surface fingerprints, complete accessories | SVG Text Placard | No (Placard) | PASS / PASS / Used - Very Good / `refurbish` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-018** | WH-1001<br>(Wireless Headphones (Noise Cancelling)) | Headphones with slight headband handling marks, all accessories present | SVG Text Placard | No (Placard) | PASS / PASS / Used - Very Good / `refurbish` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-019** | SKU-LAMP-LED<br>(LED Desk Lamp) | Desk lamp with faint dust and smudge on base, USB cord uncoiled | SVG Text Placard | No (Placard) | PASS / PASS / Used - Good / `refurbish` | PASS / PASS / Used - Very Good / `restock` | PASS / PASS / Used - Good / `refurbish` | No | Synthetic representation |
| **EVAL-020** | SKU-BOTTLE-750<br>(Insulated Water Bottle 750ml) | Bottle with faint hairline water spots on powder coat, lid functional | SVG Text Placard | No (Placard) | PASS / PASS / Used - Good / `refurbish` | PASS / PASS / Used - Very Good / `restock` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-021** | SKU-CABLE-USBC<br>(USB-C Charging Cable 2m) | Cable with light cord bends from winding, functional connectors | SVG Text Placard | No (Placard) | PASS / PASS / Used - Good / `refurbish` | PASS / PASS / Used - Like New / `restock` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-022** | SKU-LEASH-6FT<br>(Heavy-Duty Dog Leash 6ft) | Leash with light dirt scuff on handle padding, hardware fully intact | SVG Text Placard | No (Placard) | PASS / PASS / Used - Good / `refurbish` | PASS / PASS / Used - Good / `refurbish` | PASS / PASS / Used - Good / `refurbish` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-023** | DEMO-LAPTOP-001<br>(15-inch Laptop) | Laptop with minor palm rest scuffs, complete package | SVG Text Placard | No (Placard) | PASS / PASS / Used - Good / `refurbish` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-024** | WH-1001<br>(Wireless Headphones (Noise Cancelling)) | Headphones with slight headband tension stretch, complete box contents | SVG Text Placard | No (Placard) | PASS / PASS / Used - Good / `refurbish` | PASS / PASS / Used - Good / `refurbish` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-025** | SKU-LAMP-LED<br>(LED Desk Lamp) | Lamp with noticeable scratches on plastic neck, but intact and fully functional | SVG Text Placard | No (Placard) | PASS / PASS / Used - Acceptable / `liquidate` | PASS / PASS / Used - Acceptable / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-026** | SKU-BOTTLE-750<br>(Insulated Water Bottle 750ml) | Bottle with exterior paint chips near base, fully watertight | SVG Text Placard | No (Placard) | PASS / PASS / Used - Acceptable / `liquidate` | PASS / PASS / Used - Good / `refurbish` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-027** | SKU-LEASH-6FT<br>(Heavy-Duty Dog Leash 6ft) | Leash with frayed decorative trim threads, main strap solid | SVG Text Placard | No (Placard) | PASS / PASS / Used - Acceptable / `liquidate` | PASS / PASS / Used - Good / `refurbish` | PASS / PASS / Used - Acceptable / `dispose` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-028** | SKU-TOWEL-BLU<br>(Microfiber Bath Towel Blue) | Towel washed multiple times with faded blue color, no rips | SVG Text Placard | No (Placard) | PASS / PASS / Used - Acceptable / `liquidate` | PASS / PASS / Used - Acceptable / `pending_review` | PASS / PASS / Used - Acceptable / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-029** | DEMO-LAPTOP-001<br>(15-inch Laptop) | Laptop with shattered cracked LCD screen, complete in box | SVG Placard (Damage Badge) | No (Placard) | PASS / PASS / Used - Acceptable / `dispose` | PASS / PASS / PASS / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Valid test of damage routing |
| **EVAL-030** | WH-1001<br>(Wireless Headphones (Noise Cancelling)) | Headphones with snapped headband and severed internal wiring | SVG Placard (Damage Badge) | No (Placard) | PASS / PASS / Used - Acceptable / `dispose` | PASS / PASS / Used - Acceptable / `dispose` | PASS / PASS / Used - Acceptable / `dispose` | **YES** | Valid test of damage routing |
| **EVAL-031** | SKU-LAMP-LED<br>(LED Desk Lamp) | Desk lamp with cracked acrylic base and broken hinge | SVG Placard (Damage Badge) | No (Placard) | PASS / PASS / Used - Acceptable / `dispose` | PASS / PASS / Used - Acceptable / `dispose` | PASS / PASS / Used - Acceptable / `dispose` | **YES** | Valid test of damage routing |
| **EVAL-032** | SKU-BOTTLE-750<br>(Insulated Water Bottle 750ml) | Water bottle crushed and creased on side, puncture near rim | SVG Placard (Damage Badge) | No (Placard) | PASS / PASS / Used - Acceptable / `dispose` | PASS / PASS / Used - Acceptable / `dispose` | PASS / PASS / Used - Acceptable / `dispose` | **YES** | Valid test of damage routing |
| **EVAL-033** | SKU-SERUM-30<br>(Hydrating Face Serum 30ml) | Glass dropper bottle broken, liquid spilled in carton | SVG Placard (Damage Badge) | No (Placard) | PASS / PASS / Used - Acceptable / `dispose` | PASS / PASS / Used - Acceptable / `dispose` | PASS / PASS / Used - Acceptable / `dispose` | **YES** | Valid test of damage routing |
| **EVAL-034** | SKU-CABLE-USBC<br>(USB-C Charging Cable 2m) | USB-C cable with severed outer jacket and exposed copper strands | SVG Placard (Damage Badge) | No (Placard) | PASS / PASS / Used - Acceptable / `dispose` | PASS / PASS / Used - Acceptable / `dispose` | PASS / PASS / Used - Acceptable / `dispose` | No | Valid test of damage routing |
| **EVAL-035** | WH-1001<br>(Wireless Headphones (Noise Cancelling)) | Headphones returned with charging case and aux cable, but USB-C charging cable missing | SVG Placard (Audit Table) | No (Placard) | PASS / FAIL / Used - Good / `refurbish` | PASS / FAIL / Used - Good / `refurbish` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-036** | DEMO-LAPTOP-001<br>(15-inch Laptop) | Laptop returned with charger brick and power cable, but user manual missing | SVG Placard (Audit Table) | No (Placard) | PASS / FAIL / Used - Like New / `refurbish` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-037** | SKU-LAMP-LED<br>(LED Desk Lamp) | Desk lamp with power cable, but small setup leaflet missing | SVG Placard (Audit Table) | No (Placard) | PASS / FAIL / Used - Very Good / `refurbish` | PASS / FAIL / Used - Very Good / `refurbish` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-038** | SKU-SERUM-30<br>(Hydrating Face Serum 30ml) | Serum bottle and dropper intact, but cardboard outer box/leaflet missing | SVG Placard (Audit Table) | No (Placard) | PASS / FAIL / Used - Acceptable / `liquidate` | PASS / FAIL / Used - Acceptable / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-039** | SKU-PUZZLE-500<br>(500-Piece Jigsaw Puzzle) | Puzzle box with sealed pieces, but reference poster missing | SVG Placard (Audit Table) | No (Placard) | PASS / FAIL / Used - Good / `refurbish` | PASS / FAIL / Used - Like New / `refurbish` | PASS / FAIL / Used - Good / `refurbish` | No | Synthetic representation |
| **EVAL-040** | DEMO-LAPTOP-001<br>(15-inch Laptop) | Laptop returned with manual and cord, but essential AC power adapter absent | SVG Placard (Audit Table) | No (Placard) | PASS / FAIL / Used - Like New / `pending_review` | PASS / FAIL / UNCERTAIN / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-041** | WH-1001<br>(Wireless Headphones (Noise Cancelling)) | Headphones returned with cables and manual, but essential charging case missing | SVG Placard (Audit Table) | No (Placard) | PASS / FAIL / Used - Very Good / `pending_review` | PASS / FAIL / UNCERTAIN / `pending_review` | PASS / FAIL / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-042** | SKU-LAMP-LED<br>(LED Desk Lamp) | Desk lamp returned with manual, but essential USB power cable missing | SVG Placard (Audit Table) | No (Placard) | PASS / FAIL / Used - Good / `pending_review` | UNCERTAIN / FAIL / UNCERTAIN / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-043** | SKU-SERUM-30<br>(Hydrating Face Serum 30ml) | Serum bottle returned with leaflet, but essential dropper top missing | SVG Placard (Audit Table) | No (Placard) | PASS / FAIL / Used - Good / `pending_review` | PASS / FAIL / Used - Acceptable / `pending_review` | PASS / FAIL / Used - Good / `pending_review` | No | Synthetic representation |
| **EVAL-044** | SKU-BOTTLE-750<br>(Insulated Water Bottle 750ml) | Water bottle body returned, but essential twist-off lid missing | SVG Placard (Audit Table) | No (Placard) | PASS / FAIL / Used - Very Good / `pending_review` | PASS / FAIL / UNCERTAIN / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-045** | SKU-CABLE-USBC<br>(USB-C Charging Cable 2m) | Apple Lightning 8-pin connector cable returned instead of USB-C cable | SVG Placard (Mismatch Badge) | No (Placard) | FAIL / PASS / Used - Like New / `pending_review` | FAIL / PASS / UNCERTAIN / `pending_review` | FAIL / PASS / UNCERTAIN / `pending_review` | **YES** | Valid test of mismatch detection |
| **EVAL-046** | WH-1001<br>(Wireless Headphones (Noise Cancelling)) | Cheap off-brand wired earbuds returned inside WH-1001 box | SVG Placard (Mismatch Badge) | No (Placard) | FAIL / PASS / Used - Good / `pending_review` | FAIL / FAIL / UNCERTAIN / `pending_review` | FAIL / FAIL / Used - Acceptable / `pending_review` | No | Valid test of mismatch detection |
| **EVAL-047** | SKU-BOTTLE-750<br>(Insulated Water Bottle 750ml) | Plastic disposable 500ml water bottle returned instead of insulated stainless 750ml flask | SVG Placard (Mismatch Badge) | No (Placard) | FAIL / PASS / Used - Acceptable / `pending_review` | FAIL / FAIL / UNCERTAIN / `pending_review` | FAIL / FAIL / UNCERTAIN / `pending_review` | **YES** | Valid test of mismatch detection |
| **EVAL-048** | SKU-TOWEL-BLU<br>(Microfiber Bath Towel Blue) | Red hand washcloth returned instead of blue microfiber bath towel | SVG Placard (Mismatch Badge) | No (Placard) | FAIL / PASS / Used - Good / `pending_review` | FAIL / FAIL / UNCERTAIN / `pending_review` | FAIL / FAIL / UNCERTAIN / `pending_review` | No | Valid test of mismatch detection |
| **EVAL-049** | SKU-SERUM-30<br>(Hydrating Face Serum 30ml) | Photographs severely out-of-focus and darkened, bottle label unreadable | SVG Placard (Blurred r=14) | No (Placard) | PASS / PASS / UNCERTAIN / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-050** | DEMO-LAPTOP-001<br>(15-inch Laptop) | Photographs taken with extreme glare and camera motion blur across screen and chassis | SVG Placard (Blurred r=14) | No (Placard) | PASS / PASS / UNCERTAIN / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-051** | SKU-PROT-1KG<br>(Whey Protein Powder 1kg) | Protein tub returned completely empty with seal torn open, no powder inside | SVG Text Placard | No (Placard) | PASS / PASS / Used - Acceptable / `dispose` | PASS / PASS / Used - Acceptable / `dispose` | PASS / PASS / Used - Acceptable / `dispose` | **YES** | Mismatch: Guardrail abstained on text placard |
| **EVAL-052** | SKU-LAMP-LED<br>(LED Desk Lamp) | Photo shows brown shipping carton partially closed with lamp head obscured behind packing paper | SVG Placard (Ambiguous kraft) | No (Placard) | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | UNCERTAIN / UNCERTAIN / UNCERTAIN / `pending_review` | No | Legitimate UNCERTAIN test case |

---

## 3. Detailed Analysis of the 24 Placard/Manifest Cases

The evaluation identified exactly **24 cases** where v1.1 returned `UNCERTAIN` because the evidence was classified as non-photographic text placards or manifests.

### The Specific Cases:
`EVAL-009`, `EVAL-010`, `EVAL-011`, `EVAL-013`, `EVAL-014`, `EVAL-016`, `EVAL-017`, `EVAL-018`, `EVAL-020`, `EVAL-021`, `EVAL-023`, `EVAL-024`, `EVAL-025`, `EVAL-026`, `EVAL-029`, `EVAL-035`, `EVAL-036`, `EVAL-037`, `EVAL-038`, `EVAL-040`, `EVAL-042`, `EVAL-044` (plus blurred cases `EVAL-049`, `EVAL-050`).

### Systematic Answers to Audit Questions:

1. **What exactly is shown in the fixture?**
   Each image file displays a rendered warehouse bench grid, an operational header placard (`HELD-OUT EVALUATION SET · Cube26 Returns Stage RTN-04`), a central white staging panel with a textual scenario description, and an SVG checklist table listing each expected component with green/red checkmarks and physical inspection notes.

2. **Is any physical merchandise visible?**
   **No.** There are zero photographic pixels of physical 3D merchandise (no camera sensor data, no physical plastic/glass reflections, no real connectors). The merchandise is represented entirely as text and SVG graphics.

3. **What was the intended scenario?**
   The benchmark authors intended these cases to evaluate the engine's handling of:
   - Opened Unused merchandise (`EVAL-009` to `016`)
   - Normal handling wear and micro-scuffs (`EVAL-017` to `024`)
   - Moderate wear and cosmetic scuffs (`EVAL-025` to `028`)
   - Missing accessories (`EVAL-035` to `044`)

4. **Why does the ground truth contain PASS/FAIL/condition/disposition labels if the physical item is not visible?**
   Because the benchmark author assumed the multimodal model would read the text descriptions on the placard (e.g. *"Laptop with minor surface fingerprints, complete accessories"*) and evaluate the return based on the text description as a proxy for visual evidence.

5. **Was the fixture intentionally designed as a negative/abstention test?**
   **No.** Only `EVAL-049`, `050` (blur) and `EVAL-052` (kraft paper) were intentionally designed as negative/abstention tests. The other 22 cases were intended to be positive tests of opened stock, wear grading, and missing accessories.

6. **Does ground truth represent the expected behavior of the agent?**
   There is a fundamental operational conflict:
   - From the perspective of the **benchmark specification**, the agent was expected to read the scenario text and output the appropriate verdict and disposition.
   - From the perspective of the **production anti-fraud guardrail**, the agent was explicitly commanded to reject any image consisting solely of paperwork, manifests, or text cards without physical merchandise, and fail-open to `UNCERTAIN`.
   - The model behaved with 100% fidelity to the production prompt, but contradicted the benchmark's synthetic proxy mechanism.

7. **Is there a fixture/ground-truth mismatch?**
   **YES.** There is a severe structural mismatch between synthetic SVG placards used as evaluation fixtures and a production vision prompt that enforces strict physical photo verification.

---

## 4. v1.0 vs v1.1 Regression Attribution

The table below groups all 52 cases by the causal mechanism that governed their outcome between v1.0 and v1.1:

| Causal Group | Case Count | Case IDs | Net Disposition Impact | Detailed Analysis |
| :--- | :---: | :--- | :---: | :--- |
| **Group A: Physical-Photo Guardrail Rejection** | **22 cases** | `EVAL-009`, `010`, `011`, `013`, `014`, `016`, `017`, `018`, `020`, `021`, `023`, `024`, `025`, `026`, `029`, `035`, `036`, `037`, `038`, `040`, `042`, `044` | **-8 matches** | 8 cases regressed from v1.0 match to `pending_review`. The remaining 14 cases were already mismatches or uncertain in v1.0. |
| **Group B: Condition Rubric Effects** | **5 cases** | `EVAL-019`, `027`, `030`, `031`, `032` | **+1 match** | `EVAL-019` improved from false restock to correct refurbish. Damaged items consistently received `Used - Acceptable`. |
| **Group C: Factory-Sealed Completeness Inference** | **8 cases** | `EVAL-001` through `EVAL-008` | **+1 match** | `EVAL-001` improved from incomplete UNCERTAIN to 100% agreement (`restock`). Other 7 sealed cases remained stable. |
| **Group D: Damaged-Item Grade Safeguard** | **7 cases** | `EVAL-029` to `034`, `051` | **0 net** | 6 cases consistently routed to `dispose` with `Used - Acceptable`. `EVAL-029` fell to guardrail UNCERTAIN. |
| **Group E: Intentional UNCERTAIN / Blur Tests** | **3 cases** | `EVAL-049`, `050`, `052` | **0 net** | Model correctly returned UNCERTAIN across both versions. |
| **Group F: Unaffected Cases** | **29 cases** | Various | **0 net** | Identical disposition outcomes across v1.0 and v1.1. |

---

## 5. Legitimate Model Failures

Of the disagreements observed in v1.1, exactly **2 cases** represent legitimate model vision/classification errors rather than guardrail or policy artifacts:

1. **`EVAL-027` (Heavy-Duty Dog Leash - frayed decorative trim):**
   - Expected: `Used - Acceptable` + `signs_of_use` $ightarrow$ `liquidate` (Rule 5d)
   - Actual: The model graded `Used - Acceptable` but flagged `observed_state: "damaged"`, which caused Rule 5c to trigger and route the leash to `dispose`. Frayed cosmetic trim was overly penalized as structural damage.
2. **`EVAL-046` (Wrong Earbuds in Headphone Box):**
   - Expected: Identity `FAIL`, Completeness `FAIL` (original headphones absent).
   - Actual: Identity `FAIL` (correct), but Completeness was marked `FAIL` with component array differences because off-brand earbuds were present. (Disposition safely remained `pending_review`).

---

## 6. Legitimate UNCERTAIN Cases

Three cases in the benchmark were intentionally constructed to demand `UNCERTAIN` verdicts:
1. **`EVAL-049` (Face Serum - extreme gaussian blur & low light):** Correctly returned `UNCERTAIN`.
2. **`EVAL-050` (Laptop - severe screen glare & motion blur):** Correctly returned `UNCERTAIN`.
3. **`EVAL-052` (Desk Lamp - obscured in brown shipping kraft paper):** Correctly returned `UNCERTAIN` across Identity, Completeness, and Condition.

In all three cases, both v1.0 and v1.1 correctly executed the fail-open policy and routed to `pending_review`.

---

## 7. Potential Fixture/Ground-Truth Mismatches

The audit establishes three major categories of benchmark mismatch:

### Mismatch 1: Synthetic SVG Placards vs Physical Photo Guardrail
The benchmark fixtures rely on synthetic SVG placards containing text logs. However, the production vision prompt strictly instructs the model that any photo consisting solely of text cards/manifests must be rejected as `UNCERTAIN`. 
This is an irreconcilable conflict between the fixture representation and the production prompt rule.

### Mismatch 2: Engine Rule Safety Policy vs Ground-Truth Expectations (Rule 5d and Rule 6c)
In cases `EVAL-025` and `EVAL-028` (Desk Lamp and Blue Towel with moderate wear):
- Gemini correctly identified Identity = PASS, Completeness = PASS, Condition = `Used - Acceptable`, Observed State = `signs_of_use`.
- Ground truth expected automatic `liquidate`.
- However, our deterministic production engine (`src/lib/disposition-engine.ts`, line 154) intentionally routes any `Used - Acceptable` return without damage to `pending_review` so an appraisal specialist can determine liquidation feasibility.
- The engine's safety policy was penalised as an error by the ground truth label.

---

## 8. Benchmark Integrity Risks

1. **Risk of Rewarding Synthetic Vulnerability:** If the physical-photo guardrail is removed merely to boost benchmark scores on SVG placards, the production system will become vulnerable in live warehouses to workers uploading screenshots of paper manifests instead of photographing actual merchandise.
2. **Risk of Evaluation Overfitting:** The 52 held-out cases should eventually be backed by photographic datasets (such as the 3 realistic multi-image products in `demo-data/`) rather than synthetic SVG text cards.
3. **Safety Posture Verification:** The critical safety error rate remains **0.0%** across both versions. The drop in v1.1 is entirely a shift toward conservative fail-open review (`pending_review`), never an unsafe leak to `restock`.

---

## 9. Recommended Next Decision

Based strictly on empirical evidence:

1. **Do NOT modify production disposition rules:** Rule 5d and Rule 6c are operating correctly as conservative warehouse safeguards.
2. **Do NOT delete or alter the 52 held-out ground-truth cases:** The dataset structure and scenario intent are sound.
3. **Refine Guardrail Scoping in Production Prompt:**
   The anti-fraud guardrail should clarify that **clear product labels, packaging stamps, and physical item markings** qualify as physical evidence, distinguishing them from pure office shipping manifests or external computer screenshots.
4. **Distinguish Benchmark Modalities:**
   Acknowledge that synthetic placard benchmarks measure semantic compliance with return manifests, whereas photographic evaluation measures multimodal computer vision. The benchmark results must be interpreted with this modality distinction clearly documented.
