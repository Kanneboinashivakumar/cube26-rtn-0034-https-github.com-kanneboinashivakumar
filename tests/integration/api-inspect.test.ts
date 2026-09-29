/**
 * api-inspect.test.ts
 *
 * Integration tests for the inspection pipeline (inspect-service.ts).
 * Tests the full path: validate → Gemini → disposition → evidence → persist.
 *
 * Mocks:
 *   - GeminiProvider      (no real API calls)
 *   - insertInspection    (no real DB)
 *
 * Tests:
 *   1. Happy path: valid input + valid Gemini response → evidence record saved
 *   2. Fail-open: Gemini throws → failure record returned + still attempts to save
 *   3. Fail-open: Gemini returns invalid JSON (Zod rejection) → failure record
 *   4. Persistence failure: DB write fails → evidence record returned + persistenceFailed=true
 *   5. Invalid input: Zod validation fails → ZodError thrown (caller returns 400)
 *   6. Camera vs upload: both produce identical InspectionInput (normalization)
 *   7. Disposition is deterministic: same observation → same disposition (no AI randomness)
 */

import { runInspection } from "@/lib/services/inspect-service";
import * as queries from "@/lib/supabase/queries";
import { GeminiProvider } from "@/lib/providers/gemini-provider";

// Prevent supabase/client from throwing on missing env vars at module load
jest.mock("@/lib/supabase/client", () => ({ getClient: jest.fn(), supabase: {} }));

// ─── Mock GeminiProvider ──────────────────────────────────────────────────────
jest.mock("@/lib/providers/gemini-provider");
const MockedGeminiProvider = GeminiProvider as jest.MockedClass<typeof GeminiProvider>;

// ─── Mock Supabase queries ────────────────────────────────────────────────────
jest.mock("@/lib/supabase/queries");
const mockInsertInspection = queries.insertInspection as jest.MockedFunction<
  typeof queries.insertInspection
>;

// ─── Test fixtures ────────────────────────────────────────────────────────────

const VALID_INPUT = {
  order_id: "ORD-TEST-001",
  sku: "WH-1001",
  asin: "B0DEMO1001",
  product_name: "Wireless Headphones (Noise Cancelling)",
  expected_components: [
    { name: "Headphones", essential: true },
    { name: "USB-C cable", essential: false },
    { name: "User manual", essential: false },
  ],
  images: ["base64imagedata1", "base64imagedata2"],
  image_mime_types: ["image/jpeg", "image/jpeg"],
};

const VALID_OBSERVATION = {
  identity: {
    verdict: "PASS",
    confidence: 0.95,
    observations: ["Product matches expected Wireless Headphones model"],
    evidence_refs: ["image_1"],
  },
  completeness: {
    verdict: "PASS",
    confidence: 0.9,
    components: [
      { name: "Headphones", observed: true },
      { name: "USB-C cable", observed: true },
      { name: "User manual", observed: true },
    ],
    observations: ["All expected components visible"],
    evidence_refs: ["image_1", "image_2"],
  },
  condition: {
    verdict: "PASS",
    confidence: 0.88,
    grade: "Used - Very Good",
    observed_state: "signs_of_use",
    observations: ["Minor cosmetic marks on earcup"],
    evidence_refs: ["image_1"],
  },
  visible_identifiers: [
    { type: "model_number", value: "WH-1001", image_ref: "image_1" },
  ],
};

const ORG = "org_demo_alpha";
const CLIENT = "client_test";
const OPERATOR = "op_test";

beforeEach(() => {
  jest.clearAllMocks();
  // Default: DB write succeeds
  mockInsertInspection.mockResolvedValue(undefined);
});

// ─── Test 1: Happy path ───────────────────────────────────────────────────────

test("Happy path: valid input + valid Gemini response → evidence record with correct disposition", async () => {
  MockedGeminiProvider.prototype.inspect.mockResolvedValue({
    observation: VALID_OBSERVATION as never,
    latency_ms: 1200,
    model_version: "gemini-test-mock",
  });

  const result = await runInspection(VALID_INPUT, ORG, CLIENT, OPERATOR);

  expect(result.persistenceFailed).toBe(false);
  expect(result.record.status).toBe("resolved");
  // PASS/PASS/Very Good → restock (rule 5a)
  expect(result.record.outcome.disposition).toBe("restock");
  expect(result.record.organization_id).toBe(ORG);
  expect(result.record.schema_version).toBe("1.0");
  expect(result.record.checks).toHaveLength(3);
  expect(result.record.content_hash).toBeDefined();
  expect(mockInsertInspection).toHaveBeenCalledTimes(1);
});

// ─── Test 2: Gemini throws → fail-open with failure record ───────────────────

test("Fail-open: Gemini timeout → failure record with status=failed", async () => {
  MockedGeminiProvider.prototype.inspect.mockRejectedValue(
    new Error("Request timeout after 30000ms")
  );

  const result = await runInspection(VALID_INPUT, ORG, CLIENT, OPERATOR);

  expect(result.record.status).toBe("failed");
  expect(result.record.outcome.disposition).toBe("pending_review");
  expect(result.record.error_detail).toContain("timeout");
  expect(result.record.checks).toHaveLength(0); // no checks completed
  // Still attempts to save the failure record
  expect(mockInsertInspection).toHaveBeenCalledTimes(1);
});

// ─── Test 3: Gemini returns invalid JSON (Zod rejects) → fail-open ───────────

test("Fail-open: Gemini returns output with condition verdict=FAIL (Zod rejects) → failure record", async () => {
  MockedGeminiProvider.prototype.inspect.mockRejectedValue(
    new Error("ZodError: invalid_enum_value at condition.verdict")
  );

  const result = await runInspection(VALID_INPUT, ORG, CLIENT, OPERATOR);

  expect(result.record.status).toBe("failed");
  expect(result.record.outcome.disposition).toBe("pending_review");
  expect(result.persistenceFailed).toBe(false);
});

// ─── Test 4: Persistence failure → evidence record returned + flag set ────────

test("Persistence failure: evidence record is returned with persistenceFailed=true", async () => {
  MockedGeminiProvider.prototype.inspect.mockResolvedValue({
    observation: VALID_OBSERVATION as never,
    latency_ms: 900,
    model_version: "gemini-test-mock",
  });
  mockInsertInspection.mockRejectedValue(new Error("Supabase: connection refused"));

  const result = await runInspection(VALID_INPUT, ORG, CLIENT, OPERATOR);

  // Evidence record is still returned — NOT discarded
  expect(result.record.outcome.disposition).toBe("restock");
  expect(result.record.checks).toHaveLength(3);
  // Flag is set and error is surfaced
  expect(result.persistenceFailed).toBe(true);
  expect(result.persistenceError).toContain("connection refused");
});

// ─── Test 5: Invalid input → ZodError thrown ─────────────────────────────────

test("Invalid input (missing sku) → ZodError thrown (route returns 400)", async () => {
  const badInput = { ...VALID_INPUT, sku: "" }; // empty SKU fails min(1)
  await expect(runInspection(badInput, ORG, CLIENT, OPERATOR)).rejects.toThrow();
  expect(MockedGeminiProvider.prototype.inspect).not.toHaveBeenCalled();
});

test("Invalid input (6 images) → ZodError thrown before Gemini is called", async () => {
  const badInput = {
    ...VALID_INPUT,
    images: ["a", "b", "c", "d", "e", "f"],
    image_mime_types: [
      "image/jpeg",
      "image/jpeg",
      "image/jpeg",
      "image/jpeg",
      "image/jpeg",
      "image/jpeg",
    ],
  };
  await expect(runInspection(badInput, ORG, CLIENT, OPERATOR)).rejects.toThrow();
  expect(MockedGeminiProvider.prototype.inspect).not.toHaveBeenCalled();
});

// ─── Test 6: Camera vs upload normalization ───────────────────────────────────

test("Camera image and upload image produce identical InspectionInput shape", async () => {
  MockedGeminiProvider.prototype.inspect.mockResolvedValue({
    observation: VALID_OBSERVATION as never,
    latency_ms: 800,
    model_version: "gemini-test-mock",
  });

  // Both "camera" and "upload" images arrive as base64 strings in the same field
  const cameraInput = { ...VALID_INPUT, images: ["cameraBase64Data"] };
  const uploadInput = { ...VALID_INPUT, images: ["uploadBase64Data"] };

  const cameraResult = await runInspection(
    { ...cameraInput, image_mime_types: ["image/jpeg"] },
    ORG, CLIENT, OPERATOR
  );
  const uploadResult = await runInspection(
    { ...uploadInput, image_mime_types: ["image/jpeg"] },
    ORG, CLIENT, OPERATOR
  );

  // Both should produce the same schema — only image content differs
  expect(cameraResult.record.schema_version).toBe(uploadResult.record.schema_version);
  expect(cameraResult.record.checks.length).toBe(uploadResult.record.checks.length);
  expect(cameraResult.record.outcome.disposition).toBe(uploadResult.record.outcome.disposition);
  expect(MockedGeminiProvider.prototype.inspect).toHaveBeenCalledTimes(2);
});

// ─── Test 7: Disposition is deterministic ────────────────────────────────────

test("Same observation always produces the same disposition (no randomness)", async () => {
  MockedGeminiProvider.prototype.inspect.mockResolvedValue({
    observation: VALID_OBSERVATION as never,
    latency_ms: 1000,
    model_version: "gemini-test-mock",
  });

  const result1 = await runInspection(VALID_INPUT, ORG, CLIENT, OPERATOR);
  const result2 = await runInspection(VALID_INPUT, ORG, CLIENT, OPERATOR);

  expect(result1.record.outcome.disposition).toBe(result2.record.outcome.disposition);
  expect(result1.record.outcome.rule_trace.length).toBe(
    result2.record.outcome.rule_trace.length
  );
});

// ─── Test 8: Evidence record structure integrity ──────────────────────────────

test("Evidence record has all required fields per evidence contract", async () => {
  MockedGeminiProvider.prototype.inspect.mockResolvedValue({
    observation: VALID_OBSERVATION as never,
    latency_ms: 1100,
    model_version: "gemini-test-mock",
  });

  const result = await runInspection(VALID_INPUT, ORG, CLIENT, OPERATOR);
  const r = result.record;

  expect(r.record_id).toBeDefined();
  expect(r.schema_version).toBe("1.0");
  expect(r.organization_id).toBe(ORG);
  expect(r.client_id).toBe(CLIENT);
  expect(r.agent.name).toBe("ReturnOps AI");
  expect(r.subject.order_id).toBe("ORD-TEST-001");
  expect(r.subject.sku).toBe("WH-1001");
  expect(r.captured_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(r.images).toEqual(["image_1", "image_2"]);
  expect(r.checks.map((c) => c.check_key)).toEqual([
    "identity",
    "completeness",
    "condition",
  ]);
  expect(r.outcome.policy_version).toBe("1.0");
  expect(r.outcome.rule_trace.length).toBeGreaterThan(0);
  expect(r.overrides).toEqual([]);
  expect(r.content_hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
});

// ─── Test 9: Rule trace in evidence record ────────────────────────────────────

test("Evidence record outcome contains rule trace with exactly one matched rule", async () => {
  MockedGeminiProvider.prototype.inspect.mockResolvedValue({
    observation: VALID_OBSERVATION as never,
    latency_ms: 900,
    model_version: "gemini-test-mock",
  });

  const result = await runInspection(VALID_INPUT, ORG, CLIENT, OPERATOR);
  const matched = result.record.outcome.rule_trace.filter((r) => r.matched);
  expect(matched).toHaveLength(1);
  expect(matched[0].outcome).toBe("restock");
});

// ─── Test 10: Fail-open on DB write during Gemini failure ─────────────────────

test("Fail-open: Gemini fails AND DB fails → still returns failure record with both errors surfaced", async () => {
  MockedGeminiProvider.prototype.inspect.mockRejectedValue(
    new Error("Gemini service unavailable")
  );
  mockInsertInspection.mockRejectedValue(new Error("DB connection lost"));

  const result = await runInspection(VALID_INPUT, ORG, CLIENT, OPERATOR);

  expect(result.record.status).toBe("failed");
  expect(result.record.error_detail).toContain("unavailable");
  expect(result.persistenceFailed).toBe(true);
  expect(result.persistenceError).toContain("connection lost");
  // The record must still have valid identifiers
  expect(result.record.organization_id).toBe(ORG);
  expect(result.record.record_id).toMatch(/^FAIL-/);
});
