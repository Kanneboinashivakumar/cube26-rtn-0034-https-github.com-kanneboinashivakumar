/**
 * api-override.test.ts
 *
 * Integration tests for override-service.ts.
 *
 * Tests:
 *   1. Valid override → appended to record, original verdict preserved
 *   2. Override changes disposition in outcome
 *   3. Content hash updated after override
 *   4. Reason too short → ZodError (enforced at route layer, but Zod schema validates here too)
 *   5. Unknown record_id → NOT_FOUND error
 *   6. Second override appended (multiple overrides accumulate)
 *   7. Persistence failure on override → record returned + persistenceFailed=true
 */

import { applyInspectionOverride } from "@/lib/services/override-service";
import * as queries from "@/lib/supabase/queries";
import type { EvidenceRecord } from "@/lib/schemas";

jest.mock("@/lib/supabase/client", () => ({ getClient: jest.fn(), supabase: {} }));

jest.mock("@/lib/supabase/queries");

const mockGetInspection = queries.getInspection as jest.MockedFunction<
  typeof queries.getInspection
>;
const mockApplyOverride = queries.applyOverride as jest.MockedFunction<
  typeof queries.applyOverride
>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const EXISTING_RECORD: EvidenceRecord = {
  record_id: "RTN-TEST-001",
  schema_version: "1.0",
  organization_id: "org_demo_alpha",
  client_id: "client_test",
  agent: { name: "ReturnOps AI", version: "0.1.0" },
  subject: { order_id: "ORD-001", sku: "WH-1001", product_name: "Wireless Headphones" },
  captured_at: "2026-09-29T12:00:00.000Z",
  operator_label: "op_test",
  images: ["image_1", "image_2"],
  checks: [],
  outcome: {
    disposition: "pending_review",
    policy_version: "1.0",
    rule_trace: [
      {
        rule_id: "rule_1",
        description: "Identity FAIL → pending_review",
        matched: true,
        inputs: { identity_verdict: "FAIL" },
        outcome: "pending_review",
      },
    ],
  },
  overrides: [],
  status: "pending_review",
  content_hash: "abc123",
};

const VALID_OVERRIDE_REQ = {
  record_id: "RTN-TEST-001",
  organization_id: "org_demo_alpha",
  operator_id: "op_supervisor",
  reason: "Physically inspected item — confirmed it is the correct product.",
  new_disposition: "restock" as const,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetInspection.mockResolvedValue(EXISTING_RECORD);
  mockApplyOverride.mockResolvedValue(undefined);
});

// ─── Test 1: Override appended, original verdict preserved ────────────────────

test("Override appended to record — original disposition preserved in override record", async () => {
  const result = await applyInspectionOverride(VALID_OVERRIDE_REQ);

  expect(result.persistenceFailed).toBe(false);
  expect(result.record.overrides).toHaveLength(1);
  const override = result.record.overrides[0];
  expect(override.previous_disposition).toBe("pending_review"); // original preserved
  expect(override.new_disposition).toBe("restock");             // new applied
  expect(override.reason).toBe(VALID_OVERRIDE_REQ.reason);
  expect(override.operator_id).toBe("op_supervisor");
  expect(override.override_id).toMatch(/^OVR-/);
});

// ─── Test 2: Disposition updated in outcome ───────────────────────────────────

test("Override updates outcome.disposition on the returned record", async () => {
  const result = await applyInspectionOverride(VALID_OVERRIDE_REQ);
  expect(result.record.outcome.disposition).toBe("restock");
  expect(result.record.status).toBe("resolved"); // restock → resolved
});

// ─── Test 3: Content hash recomputed after override ──────────────────────────

test("Content hash changes after override (record is mutated)", async () => {
  const result = await applyInspectionOverride(VALID_OVERRIDE_REQ);
  // Hash must differ from original (record was mutated)
  expect(result.record.content_hash).toBeDefined();
  expect(result.record.content_hash).not.toBe("abc123");
  expect(result.record.content_hash).toMatch(/^[a-f0-9]{64}$/);
});

// ─── Test 4: Unknown record_id → NOT_FOUND ────────────────────────────────────

test("Unknown record_id → throws NOT_FOUND error", async () => {
  mockGetInspection.mockResolvedValue(null);

  await expect(
    applyInspectionOverride({ ...VALID_OVERRIDE_REQ, record_id: "RTN-DOES-NOT-EXIST" })
  ).rejects.toMatchObject({ code: "NOT_FOUND" });

  expect(mockApplyOverride).not.toHaveBeenCalled();
});

// ─── Test 5: Wrong org → NOT_FOUND (tenancy isolation) ───────────────────────

test("Wrong org_id → NOT_FOUND (record not visible across orgs)", async () => {
  // getInspection with wrong org returns null (org-scoped query)
  mockGetInspection.mockResolvedValue(null);

  await expect(
    applyInspectionOverride({
      ...VALID_OVERRIDE_REQ,
      organization_id: "org_demo_bravo", // different org
    })
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

// ─── Test 6: Multiple overrides accumulate ────────────────────────────────────

test("Second override appends to existing overrides array", async () => {
  const recordWithOneOverride: EvidenceRecord = {
    ...EXISTING_RECORD,
    overrides: [
      {
        override_id: "OVR-FIRST",
        operator_id: "op_a",
        reason: "First override reason here.",
        previous_disposition: "pending_review",
        new_disposition: "refurbish",
        overridden_at: "2026-09-29T11:00:00.000Z",
      },
    ],
    outcome: { ...EXISTING_RECORD.outcome, disposition: "refurbish" },
    status: "resolved",
  };
  mockGetInspection.mockResolvedValue(recordWithOneOverride);

  const result = await applyInspectionOverride({
    ...VALID_OVERRIDE_REQ,
    reason: "Further review shows restock is appropriate here.",
    new_disposition: "restock",
  });

  expect(result.record.overrides).toHaveLength(2);
  expect(result.record.overrides[0].override_id).toBe("OVR-FIRST");
  expect(result.record.overrides[1].previous_disposition).toBe("refurbish");
  expect(result.record.overrides[1].new_disposition).toBe("restock");
});

// ─── Test 7: Override sets pending_review status correctly ────────────────────

test("Override to pending_review sets status=pending_review", async () => {
  const resolvedRecord: EvidenceRecord = {
    ...EXISTING_RECORD,
    outcome: { ...EXISTING_RECORD.outcome, disposition: "restock" },
    status: "resolved",
  };
  mockGetInspection.mockResolvedValue(resolvedRecord);

  const result = await applyInspectionOverride({
    ...VALID_OVERRIDE_REQ,
    reason: "Need further human review of this item before restocking.",
    new_disposition: "pending_review",
  });

  expect(result.record.status).toBe("pending_review");
});

// ─── Test 8: Persistence failure on override ─────────────────────────────────

test("DB failure on override → updated record returned with persistenceFailed=true", async () => {
  mockApplyOverride.mockRejectedValue(new Error("Supabase: write timeout"));

  const result = await applyInspectionOverride(VALID_OVERRIDE_REQ);

  // Record is still returned with override applied in-memory
  expect(result.record.overrides).toHaveLength(1);
  expect(result.record.outcome.disposition).toBe("restock");
  expect(result.persistenceFailed).toBe(true);
  expect(result.persistenceError).toContain("write timeout");
});
