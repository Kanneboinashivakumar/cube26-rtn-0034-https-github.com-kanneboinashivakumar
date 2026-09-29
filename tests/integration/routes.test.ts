/**
 * routes.test.ts
 *
 * Tests the HTTP route handlers directly:
 *   - POST /api/inspect
 *   - POST /api/override
 *   - POST /api/confirm
 *   - GET  /api/inspections/[record_id]
 */

import { NextRequest } from "next/server";
import { POST as inspectHandler } from "@/app/api/inspect/route";
import { POST as overrideHandler } from "@/app/api/override/route";
import { POST as confirmHandler } from "@/app/api/confirm/route";
import { GET as getInspectionHandler } from "@/app/api/inspections/[record_id]/route";

import * as inspectService from "@/lib/services/inspect-service";
import * as overrideService from "@/lib/services/override-service";
import * as confirmService from "@/lib/services/confirm-service";
import * as queries from "@/lib/supabase/queries";
import type { EvidenceRecord } from "@/lib/schemas";

jest.mock("@/lib/supabase/client", () => ({ getClient: jest.fn(), supabase: {} }));
jest.mock("@/lib/services/inspect-service");
jest.mock("@/lib/services/override-service");
jest.mock("@/lib/services/confirm-service");
jest.mock("@/lib/supabase/queries");

const mockRunInspection = inspectService.runInspection as jest.MockedFunction<
  typeof inspectService.runInspection
>;
const mockApplyOverride = overrideService.applyInspectionOverride as jest.MockedFunction<
  typeof overrideService.applyInspectionOverride
>;
const mockConfirmRecord = confirmService.confirmInspectionRecord as jest.MockedFunction<
  typeof confirmService.confirmInspectionRecord
>;
const mockGetInspection = queries.getInspection as jest.MockedFunction<
  typeof queries.getInspection
>;

const MOCK_RECORD: EvidenceRecord = {
  record_id: "RTN-ROUTE-001",
  schema_version: "1.0",
  organization_id: "org_demo_alpha",
  client_id: "client_demo_001",
  agent: { name: "ReturnOps AI", version: "0.1.0" },
  subject: { order_id: "ORD-001", sku: "WH-1001", product_name: "Headphones" },
  captured_at: "2026-09-29T12:00:00.000Z",
  operator_label: "demo_operator",
  images: ["image_1"],
  checks: [],
  outcome: { disposition: "restock", policy_version: "1.0", rule_trace: [] },
  overrides: [],
  status: "resolved",
  content_hash: "hash123",
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── POST /api/inspect ────────────────────────────────────────────────────────

describe("POST /api/inspect route", () => {
  test("returns 200 and record on success", async () => {
    mockRunInspection.mockResolvedValue({
      record: MOCK_RECORD,
      persistenceFailed: false,
    });

    const req = new NextRequest("http://localhost:3000/api/inspect", {
      method: "POST",
      body: JSON.stringify({ order_id: "ORD-001" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await inspectHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.record.record_id).toBe("RTN-ROUTE-001");
  });

  test("returns 207 when persistence fails but inspection succeeded", async () => {
    mockRunInspection.mockResolvedValue({
      record: MOCK_RECORD,
      persistenceFailed: true,
      persistenceError: "DB offline",
    });

    const req = new NextRequest("http://localhost:3000/api/inspect", {
      method: "POST",
      body: JSON.stringify({ order_id: "ORD-001" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await inspectHandler(req);
    expect(res.status).toBe(207);
    const data = await res.json();
    expect(data.record).toBeDefined();
    expect(data.warning).toContain("could not be saved");
  });

  test("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost:3000/api/inspect", {
      method: "POST",
      body: "not-json{",
      headers: { "Content-Type": "application/json" },
    });

    const res = await inspectHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON in request body");
  });
});

// ─── POST /api/override ───────────────────────────────────────────────────────

describe("POST /api/override route", () => {
  const validOverridePayload = {
    record_id: "RTN-ROUTE-001",
    organization_id: "org_demo_alpha",
    operator_id: "op_01",
    reason: "Reason that exceeds ten characters easily",
    new_disposition: "refurbish",
  };

  test("returns 200 on successful override", async () => {
    mockApplyOverride.mockResolvedValue({
      record: { ...MOCK_RECORD, outcome: { ...MOCK_RECORD.outcome, disposition: "refurbish" } },
      persistenceFailed: false,
    });

    const req = new NextRequest("http://localhost:3000/api/override", {
      method: "POST",
      body: JSON.stringify(validOverridePayload),
      headers: { "Content-Type": "application/json" },
    });

    const res = await overrideHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.record.outcome.disposition).toBe("refurbish");
  });

  test("returns 400 when reason is too short", async () => {
    const req = new NextRequest("http://localhost:3000/api/override", {
      method: "POST",
      body: JSON.stringify({ ...validOverridePayload, reason: "short" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await overrideHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid override request");
  });

  test("returns 404 when record is not found", async () => {
    const err = new Error("Not found");
    (err as NodeJS.ErrnoException).code = "NOT_FOUND";
    mockApplyOverride.mockRejectedValue(err);

    const req = new NextRequest("http://localhost:3000/api/override", {
      method: "POST",
      body: JSON.stringify(validOverridePayload),
      headers: { "Content-Type": "application/json" },
    });

    const res = await overrideHandler(req);
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/confirm ────────────────────────────────────────────────────────

describe("POST /api/confirm route", () => {
  const validConfirmPayload = {
    record_id: "RTN-ROUTE-001",
    organization_id: "org_demo_alpha",
  };

  test("returns 200 on successful confirm", async () => {
    mockConfirmRecord.mockResolvedValue({
      record_id: "RTN-ROUTE-001",
      status: "resolved",
      persistenceFailed: false,
    });

    const req = new NextRequest("http://localhost:3000/api/confirm", {
      method: "POST",
      body: JSON.stringify(validConfirmPayload),
      headers: { "Content-Type": "application/json" },
    });

    const res = await confirmHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("resolved");
  });

  test("returns 404 when confirm target not found", async () => {
    const err = new Error("Not found");
    (err as NodeJS.ErrnoException).code = "NOT_FOUND";
    mockConfirmRecord.mockRejectedValue(err);

    const req = new NextRequest("http://localhost:3000/api/confirm", {
      method: "POST",
      body: JSON.stringify(validConfirmPayload),
      headers: { "Content-Type": "application/json" },
    });

    const res = await confirmHandler(req);
    expect(res.status).toBe(404);
  });
});

// ─── GET /api/inspections/[record_id] ─────────────────────────────────────────

describe("GET /api/inspections/[record_id] route", () => {
  test("returns 400 if org_id query param is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/inspections/RTN-ROUTE-001");
    const res = await getInspectionHandler(req, {
      params: Promise.resolve({ record_id: "RTN-ROUTE-001" }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("org_id query parameter is required");
  });

  test("returns 200 and record when found", async () => {
    mockGetInspection.mockResolvedValue(MOCK_RECORD);

    const req = new NextRequest("http://localhost:3000/api/inspections/RTN-ROUTE-001?org_id=org_demo_alpha");
    const res = await getInspectionHandler(req, {
      params: Promise.resolve({ record_id: "RTN-ROUTE-001" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.record.record_id).toBe("RTN-ROUTE-001");
  });

  test("returns 404 when record does not exist", async () => {
    mockGetInspection.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/inspections/NON_EXISTENT?org_id=org_demo_alpha");
    const res = await getInspectionHandler(req, {
      params: Promise.resolve({ record_id: "NON_EXISTENT" }),
    });

    expect(res.status).toBe(404);
  });
});
