# ReturnOps AI — Evidence Record Contract

**Track:** Returns Manager (RTN)  
**Contract Name:** `EvidenceRecord`  
**Schema Version:** `1.0`  
**TypeScript Reference:** [`src/lib/schemas.ts`](../../../src/lib/schemas.ts)  
**Status:** Frozen  

---

## 1. Overview & Purpose

The `EvidenceRecord` is the authoritative, immutable data contract produced by ReturnOps AI for every completed returns inspection. It serves as:
1. **The Operational Audit Trail:** A permanent record of the visual observations, model confidence scores, operator interactions, and rule execution trace for internal QA and audit compliance.
2. **The Cross-Pod Integration Bridge:** The structured payload handed off to downstream agents in the CUBE returns ecosystem, notably the **Recovery Manager (REC)** pod, vendor RMA processing systems, and customer dispute resolution pipelines.

The contract enforces the core design philosophy: **Multimodal AI observes visual facts, deterministic application logic determines the business outcome, and the Evidence Record cryptographically binds the evidence to the decision.**

---

## 2. Canonical JSON Schema

Below is an annotated example of a complete `EvidenceRecord` payload:

```json
{
  "record_id": "rec_01HQ7Z9A1B2C3D4E5F6G7H8J9K",
  "schema_version": "1.0",
  "organization_id": "org_apex_logistics",
  "client_id": "client_nordic_retail",
  "agent": {
    "name": "ReturnOps AI",
    "version": "1.0.0"
  },
  "subject": {
    "order_id": "ORD-2026-98124",
    "sku": "LAPTOP-PRO-16",
    "asin": "B09X4K1M98",
    "product_name": "ProBook 16-inch Laptop (32GB, 1TB SSD)"
  },
  "captured_at": "2026-10-01T14:15:30.412Z",
  "operator_label": "Operator-Station-04",
  "images": [
    "image_1",
    "image_2",
    "image_3"
  ],
  "checks": [
    {
      "check_key": "identity",
      "verdict": "PASS",
      "confidence": 0.96,
      "detail": "Device matches ProBook 16-inch chassis in Space Gray. Barcode serial matches order metadata.",
      "model_version": "gemini-2.0-flash-lite",
      "latency_ms": 1840,
      "evidence_refs": ["image_1", "image_3"]
    },
    {
      "check_key": "completeness",
      "verdict": "PASS",
      "confidence": 0.94,
      "detail": "All 3 required components verified present against catalogue bill of materials.",
      "model_version": "gemini-2.0-flash-lite",
      "latency_ms": 2110,
      "components": [
        { "name": "Laptop Unit", "observed": true },
        { "name": "140W USB-C Power Adapter", "observed": true },
        { "name": "2m Braided USB-C Cable", "observed": true }
      ],
      "evidence_refs": ["image_2"]
    },
    {
      "check_key": "condition",
      "verdict": "PASS",
      "confidence": 0.91,
      "detail": "Chassis and display exhibit no scratches, dents, or signs of wear. Protective film intact.",
      "model_version": "gemini-2.0-flash-lite",
      "latency_ms": 2350,
      "grade": "Like New",
      "observed_state": "opened_like_new",
      "evidence_refs": ["image_1", "image_2"]
    }
  ],
  "outcome": {
    "disposition": "restock",
    "policy_version": "1.0",
    "rule_trace": [
      {
        "rule_id": "RULE_IDENTITY_SAFETY",
        "description": "Block restock if identity is FAIL or UNCERTAIN",
        "matched": false,
        "inputs": { "identity_verdict": "PASS" }
      },
      {
        "rule_id": "RULE_CRITICAL_COMPONENTS",
        "description": "Block restock if any essential/critical component is missing",
        "matched": false,
        "inputs": { "missing_critical_count": 0 }
      },
      {
        "rule_id": "RULE_PRISTINE_RESTOCK",
        "description": "Route to restock if all checks PASS, condition is Like New or Brand New, and complete",
        "matched": true,
        "inputs": {
          "identity": "PASS",
          "completeness": "PASS",
          "condition": "PASS",
          "grade": "Like New"
        },
        "outcome": "restock"
      }
    ]
  },
  "overrides": [],
  "status": "resolved",
  "content_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

---

## 3. Field Specifications

| Field Path | Type | Required | Description |
|---|---|:---:|---|
| `record_id` | `string` | Yes | Unique identifier (e.g. ULID / UUID) for this inspection event. |
| `schema_version` | `"1.0"` | Yes | Fixed semantic version of this contract schema. |
| `organization_id` | `string` | Yes | Identifier of the warehouse / 3PL operating entity. |
| `client_id` | `string` | Yes | Identifier of the merchant / retailer owning the inventory. |
| `agent` | `object` | Yes | Metadata identifying the inspecting system: `name` ("ReturnOps AI") and `version` ("1.0.0"). |
| `subject` | `object` | Yes | Product identifiers: `order_id`, `sku`, optional `asin`, and `product_name`. |
| `captured_at` | `ISO 8601` | Yes | UTC timestamp when inspection was executed. |
| `operator_label` | `string` | Yes | Human operator identifier or workstation tag (e.g., `Station-04`). |
| `images` | `string[]` | Yes | Positional labels referencing captured evidence photos (`["image_1", "image_2", ...]`). Image binaries reside in secure storage. |
| `checks` | `CheckRecord[]` | Yes | Exactly 3 independent check records (`identity`, `completeness`, `condition`). |
| `outcome` | `object` | Yes | Computed disposition, policy version, and full deterministic rule execution trace. |
| `overrides` | `OverrideRecord[]` | Yes | Array of human operator overrides (empty if confirmed without alteration). |
| `status` | `enum` | Yes | Inspection state: `"resolved"`, `"pending_review"`, or `"failed"`. |
| `content_hash` | `string` | Yes | SHA-256 cryptographic digest of the record contents (excluding the hash itself). |

---

## 4. Check Structure & Tri-State Verdict Semantics

The `checks` array contains exactly three entries corresponding to the independent verification stages:

### Verdict Semantics
- **`PASS`**: Observable visual evidence positively confirms the condition is satisfied.
- **`FAIL`**: Observable visual evidence positively confirms a violation (e.g., wrong item returned, shattered screen).
- **`UNCERTAIN`**: Visual evidence is insufficient, blurry, obstructed, or ambiguous to make a reliable determination.

### Independent Check Definitions

#### 1. Identity Check (`check_key: "identity"`)
- **Verdicts:** `PASS` | `FAIL` | `UNCERTAIN`
- **Fields:** `confidence` (0.0–1.0), `detail` (textual observation), `evidence_refs` (array of image IDs).
- **Semantics:** Verifies physical make, model, chassis, and markings against catalogue standards. If `FAIL` or `UNCERTAIN`, restock is unconditionally blocked.

#### 2. Completeness Check (`check_key: "completeness"`)
- **Verdicts:** `PASS` | `FAIL` | `UNCERTAIN`
- **Fields:** `confidence`, `detail`, `evidence_refs`, and `components[]`:
  - `name`: Name matching the catalogue bill of materials.
  - `observed`: `true` | `false` | `"uncertain"`.
- **Note:** The `essential` flag is injected by the catalogue logic during rule evaluation; it is **never** generated or modified by the vision model.

#### 3. Condition Check (`check_key: "condition"`)
- **Verdicts:** `PASS` | `UNCERTAIN`
- **Fields:** `confidence`, `detail`, `evidence_refs`, `grade` (optional), and `observed_state`:
  - `grade`: Published Amazon condition enum (`"Like New"`, `"Very Good"`, `"Good"`, `"Acceptable"`).
  - `observed_state`: Standardized visual state (`"brand_new_sealed"`, `"opened_like_new"`, `"signs_of_use"`, `"cosmetic_blemish"`, `"packaging_damaged"`, `"heavily_worn"`).
- **Design Rule:** Condition does not issue `FAIL` in this build; severe structural damage or heavy wear issues `UNCERTAIN` or low cosmetic grade, routing safely to review or secondary recovery.

---

## 5. Human Override Tracking (`overrides`)

When an operator disagrees with the recommended disposition, the change is recorded as an immutable entry in `overrides`:

```json
{
  "override_id": "ovr_998241",
  "operator_id": "operator_ksk",
  "reason": "Customer returned unopened unit; factory seal intact on underside not visible in primary camera view.",
  "previous_disposition": "pending_review",
  "new_disposition": "restock",
  "overridden_at": "2026-10-01T14:16:02.180Z"
}
```

- **Mandatory Justification:** Minimum 10 characters explaining why the automated recommendation was changed.
- **Audit Preservation:** The original `outcome.disposition` and automated `rule_trace` remain completely preserved; the override is appended, not overwritten.

---

## 6. Cross-Pod Integration (Downstream Consumers)

The `EvidenceRecord` contract directly feeds three downstream operational pods:

### 1. Recovery Manager (REC Pod)
- **Wholesale / Liquidation Routing:** If `outcome.disposition === "liquidate"`, the REC agent parses `checks[condition].grade` and `checks[completeness].components` to generate automated lot manifests and calculate minimum reserve pricing for B2B auctions.
- **Refurbishment Intake:** If `outcome.disposition === "refurbish"`, the REC agent extracts the exact missing components list to automatically order replacement power bricks or packaging supplies.
- **Supplier Warranty / RMA:** If an item is classified as defective or damaged upon unboxing, the REC agent bundles the `EvidenceRecord` and SHA-256 hash into an automated supplier credit debit-memo.

### 2. Fraud & Dispute Resolution Pod
- If `checks[identity].verdict === "FAIL"`, the item is flagged as a suspected box-swap.
- The `EvidenceRecord`—linking the catalogue reference image side-by-side with the customer return evidence photo—provides tamper-evident proof to reject the customer's refund or submit evidence to the payment gateway to defend against a chargeback.

### 3. Warehouse Management System (WMS)
- WMS inventory services consume the record to update SKU quantity ledgers, print destination routing tote barcodes (`RESTOCK-BIN-A4`, `REFURB-TOTE-12`, `RMA-HOLD-99`), and track operator throughput metrics.
