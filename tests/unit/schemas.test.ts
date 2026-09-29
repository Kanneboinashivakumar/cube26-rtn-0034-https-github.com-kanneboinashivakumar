/**
 * schemas.test.ts
 *
 * Tests Zod schema enforcement for InspectionObservation.
 * Validates that invalid model output is rejected before reaching business logic.
 */

import { InspectionObservation, InspectionInput, OverrideRequest } from "@/lib/schemas";

// ─── Valid observation ────────────────────────────────────────────────────────

const validObservation = {
  identity: {
    verdict: "PASS",
    confidence: 0.94,
    observations: ["Product matches expected SKU"],
    evidence_refs: ["image_1"],
  },
  completeness: {
    verdict: "FAIL",
    confidence: 0.89,
    components: [
      { name: "Headphones", observed: true },
      { name: "USB-C cable", observed: false },
    ],
    observations: ["USB-C cable not found"],
    evidence_refs: ["image_2"],
  },
  condition: {
    verdict: "PASS",
    confidence: 0.86,
    grade: "Used - Very Good",
    observed_state: "signs_of_use",
    observations: ["Minor cosmetic marks on earcup"],
    evidence_refs: ["image_1", "image_2"],
  },
  visible_identifiers: [{ type: "model_number", value: "WH-1001", image_ref: "image_1" }],
};

test("Valid observation passes schema", () => {
  expect(() => InspectionObservation.parse(validObservation)).not.toThrow();
});

// ─── Condition FAIL not allowed ───────────────────────────────────────────────

test("Condition verdict=FAIL is rejected (FAIL is not in enum)", () => {
  const obs = {
    ...validObservation,
    condition: { ...validObservation.condition, verdict: "FAIL" },
  };
  expect(() => InspectionObservation.parse(obs)).toThrow();
});

// ─── Invalid condition grade ──────────────────────────────────────────────────

test("Out-of-enum condition grade is rejected", () => {
  const obs = {
    ...validObservation,
    condition: { ...validObservation.condition, grade: "Good" }, // not in enum
  };
  expect(() => InspectionObservation.parse(obs)).toThrow();
});

test("Freeform condition grade is rejected", () => {
  const obs = {
    ...validObservation,
    condition: { ...validObservation.condition, grade: "Very Bad" },
  };
  expect(() => InspectionObservation.parse(obs)).toThrow();
});

// ─── Invalid observed_state ───────────────────────────────────────────────────

test("Out-of-enum observed_state is rejected", () => {
  const obs = {
    ...validObservation,
    condition: { ...validObservation.condition, observed_state: "heavily_worn" },
  };
  expect(() => InspectionObservation.parse(obs)).toThrow();
});

// ─── Confidence out of range ──────────────────────────────────────────────────

test("Confidence > 1.0 is rejected", () => {
  const obs = {
    ...validObservation,
    identity: { ...validObservation.identity, confidence: 1.5 },
  };
  expect(() => InspectionObservation.parse(obs)).toThrow();
});

test("Confidence < 0 is rejected", () => {
  const obs = {
    ...validObservation,
    identity: { ...validObservation.identity, confidence: -0.1 },
  };
  expect(() => InspectionObservation.parse(obs)).toThrow();
});

// ─── UNCERTAIN as component observed value ────────────────────────────────────

test("Component observed='uncertain' (string) is valid", () => {
  const obs = {
    ...validObservation,
    completeness: {
      ...validObservation.completeness,
      verdict: "UNCERTAIN",
      components: [{ name: "USB-C cable", observed: "uncertain" }],
    },
  };
  expect(() => InspectionObservation.parse(obs)).not.toThrow();
});

// ─── InspectionInput validation ───────────────────────────────────────────────

test("InspectionInput rejects 0 images", () => {
  const input = {
    order_id: "ORD-001",
    sku: "WH-1001",
    product_name: "Wireless Headphones",
    expected_components: [{ name: "Headphones", essential: true }],
    images: [],
    image_mime_types: [],
  };
  expect(() => InspectionInput.parse(input)).toThrow();
});

test("InspectionInput rejects 6 images (over limit)", () => {
  const input = {
    order_id: "ORD-001",
    sku: "WH-1001",
    product_name: "Wireless Headphones",
    expected_components: [{ name: "Headphones", essential: true }],
    images: ["a", "b", "c", "d", "e", "f"],
    image_mime_types: ["image/jpeg", "image/jpeg", "image/jpeg", "image/jpeg", "image/jpeg", "image/jpeg"],
  };
  expect(() => InspectionInput.parse(input)).toThrow();
});

test("InspectionInput accepts 5 images (at limit)", () => {
  const input = {
    order_id: "ORD-001",
    sku: "WH-1001",
    product_name: "Wireless Headphones",
    expected_components: [{ name: "Headphones", essential: true }],
    images: ["a", "b", "c", "d", "e"],
    image_mime_types: [
      "image/jpeg",
      "image/jpeg",
      "image/jpeg",
      "image/jpeg",
      "image/jpeg",
    ],
  };
  expect(() => InspectionInput.parse(input)).not.toThrow();
});

// ─── OverrideRequest validation ───────────────────────────────────────────────

test("OverrideRequest rejects reason shorter than 10 chars", () => {
  const req = {
    record_id: "RTN-001",
    organization_id: "org_demo_alpha",
    operator_id: "op_1",
    reason: "short",
    new_disposition: "restock",
  };
  expect(() => OverrideRequest.parse(req)).toThrow();
});

test("OverrideRequest accepts valid reason and disposition", () => {
  const req = {
    record_id: "RTN-001",
    organization_id: "org_demo_alpha",
    operator_id: "op_1",
    reason: "Physically verified all components are present and item is in good condition.",
    new_disposition: "restock",
  };
  expect(() => OverrideRequest.parse(req)).not.toThrow();
});
