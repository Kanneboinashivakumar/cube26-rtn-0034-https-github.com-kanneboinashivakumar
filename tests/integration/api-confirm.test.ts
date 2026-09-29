/**
 * api-confirm.test.ts
 *
 * Integration tests for confirm-service.ts.
 *
 * Tests:
 *   1. Valid confirm → status=resolved, no override record added
 *   2. Confirm does NOT add an override record
 *   3. Unknown record_id → NOT_FOUND
 *   4. Wrong org → NOT_FOUND (tenancy isolation)
 *   5. Persistence failure → result returned with persistenceFailed=true
 */

import { confirmInspectionRecord } from "@/lib/services/confirm-service";
import * as queries from "@/lib/supabase/queries";
import type { EvidenceRecord } from "@/lib/schemas";

jest.mock("@/lib/supabase/client", () => ({ getClient: jest.fn(), supabase: {} }));

jest.mock("@/lib/supabase/queries");

const mockGetInspection = queries.getInspection as jest.MockedFunction<
  typeof queries.getInspection
>;
const mockConfirmInspection = queries.confirmInspection as jest.MockedFunction<
  typeof queries.confirmInspection
>;

const PENDING_RECORD: EvidenceRecord = {
  record_id: "RTN-CONFIRM-001",
  schema_version: "1.0",
  organization_id: "org_demo_alpha",
  client_id: "client_test",
  agent: { name: "ReturnOps AI", version: "0.1.0" },
  subject: { order_id: "ORD-002", sku: "WH-1001", product_name: "Wireless Headphones" },
  captured_at: "2026-09-29T12:00:00.000Z",
  operator_label: "op_test",
  images: ["image_1"],
  checks: [],
  outcome: {
    disposition: "restock",
    policy_version: "1.0",
    rule_trace: [],
  },
  overrides: [],
  status: "resolved",
  content_hash: "def456",
};

const VALID_CONFIRM_REQ = {
  record_id: "RTN-CONFIRM-001",
  organization_id: "org_demo_alpha",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetInspection.mockResolvedValue(PENDING_RECORD);
  mockConfirmInspection.mockResolvedValue(undefined);
});

// ─── Test 1: Confirm sets status=resolved ────────────────────────────────────

test("Valid confirm → status=resolved returned", async () => {
  const result = await confirmInspectionRecord(VALID_CONFIRM_REQ);

  expect(result.status).toBe("resolved");
  expect(result.record_id).toBe("RTN-CONFIRM-001");
  expect(result.persistenceFailed).toBe(false);
  expect(mockConfirmInspection).toHaveBeenCalledWith(
    "RTN-CONFIRM-001",
    "org_demo_alpha"
  );
});

// ─── Test 2: Confirm does NOT add an override record ─────────────────────────

test("Confirm does NOT call applyOverride — only confirmInspection", async () => {
  await confirmInspectionRecord(VALID_CONFIRM_REQ);

  // confirmInspection called, applyOverride NOT called
  expect(mockConfirmInspection).toHaveBeenCalledTimes(1);
  const mockApplyOverride = queries.applyOverride as jest.MockedFunction<
    typeof queries.applyOverride
  >;
  expect(mockApplyOverride).not.toHaveBeenCalled();
});

// ─── Test 3: Unknown record_id → NOT_FOUND ────────────────────────────────────

test("Unknown record_id → throws NOT_FOUND error", async () => {
  mockGetInspection.mockResolvedValue(null);

  await expect(
    confirmInspectionRecord({ ...VALID_CONFIRM_REQ, record_id: "RTN-DOES-NOT-EXIST" })
  ).rejects.toMatchObject({ code: "NOT_FOUND" });

  expect(mockConfirmInspection).not.toHaveBeenCalled();
});

// ─── Test 4: Wrong org → NOT_FOUND (tenancy isolation) ───────────────────────

test("Wrong org_id → NOT_FOUND (record from different org not accessible)", async () => {
  mockGetInspection.mockResolvedValue(null); // org-scoped query returns null

  await expect(
    confirmInspectionRecord({
      record_id: "RTN-CONFIRM-001",
      organization_id: "org_demo_bravo", // different org
    })
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

// ─── Test 5: Persistence failure → result with persistenceFailed=true ─────────

test("Persistence failure on confirm → result returned with persistenceFailed=true", async () => {
  mockConfirmInspection.mockRejectedValue(new Error("DB write failed: timeout"));

  const result = await confirmInspectionRecord(VALID_CONFIRM_REQ);

  expect(result.record_id).toBe("RTN-CONFIRM-001");
  expect(result.status).toBe("resolved");
  expect(result.persistenceFailed).toBe(true);
  expect(result.persistenceError).toContain("timeout");
});
