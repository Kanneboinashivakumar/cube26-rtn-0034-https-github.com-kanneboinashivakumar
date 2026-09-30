/**
 * supabase-live.test.ts
 *
 * Phase 5 Verification Test:
 * Tests the real database operations against live Supabase when credentials are provided.
 *
 * When SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are absent:
 *   Skips gracefully with an informational message.
 *
 * When credentials ARE present in .env.local / process.env:
 *   1. Inserts an EvidenceRecord into the live `inspections` table.
 *   2. Queries the record using org-scoped getInspection().
 *   3. Verifies application-layer tenancy (org_demo_bravo cannot access alpha's record).
 *   4. Applies an operator override and verifies persistence.
 *   5. Confirms the inspection.
 *   6. Cleans up the test record.
 */

import { getClient } from "@/lib/supabase/client";
import {
  insertInspection,
  getInspection,
  applyOverride,
  confirmInspection,
} from "@/lib/supabase/queries";
import type { EvidenceRecord, OverrideRecord } from "@/lib/schemas";

const liveConfigured = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

const describeOrSkip = liveConfigured ? describe : describe.skip;

describeOrSkip("Live Supabase Integration (Phase 5)", () => {
  const TEST_RECORD_ID = `RTN-LIVE-TEST-${Date.now()}`;
  const ORG_ALPHA = "org_demo_alpha";
  const ORG_BRAVO = "org_demo_bravo";

  const testRecord: EvidenceRecord = {
    record_id: TEST_RECORD_ID,
    schema_version: "1.0",
    organization_id: ORG_ALPHA,
    client_id: "client_demo_001",
    agent: {
      name: "ReturnOps AI",
      version: "0.1.0",
    },
    subject: {
      order_id: "ORD-LIVE-TEST-001",
      sku: "WH-1001",
      asin: "B0DEMO1001",
      product_name: "Wireless Headphones (Noise Cancelling)",
    },
    captured_at: new Date().toISOString(),
    operator_label: "live_test_operator",
    images: ["image_1", "image_2"],
    checks: [
      {
        check_key: "identity",
        verdict: "PASS",
        confidence: 0.96,
        detail: "Product matches WH-1001",
        model_version: "test-model",
        latency_ms: 1200,
        evidence_refs: ["image_1"],
      },
      {
        check_key: "completeness",
        verdict: "PASS",
        confidence: 0.94,
        detail: "All components present",
        model_version: "test-model",
        latency_ms: 1200,
        components: [
          { name: "Headphones", observed: true },
          { name: "Charging case", observed: true },
        ],
        evidence_refs: ["image_1", "image_2"],
      },
      {
        check_key: "condition",
        verdict: "PASS",
        confidence: 0.91,
        detail: "Normal cosmetic wear",
        model_version: "test-model",
        latency_ms: 1200,
        grade: "Used - Very Good",
        observed_state: "signs_of_use",
        evidence_refs: ["image_1"],
      },
    ],
    outcome: {
      disposition: "restock",
      policy_version: "1.0",
      rule_trace: [
        {
          rule_id: "rule_5a",
          description: "All PASS, Resale Suitable -> restock",
          matched: true,
          inputs: {
            identity: "PASS",
            completeness: "PASS",
            condition_grade: "Used - Very Good",
          },
          outcome: "restock",
        },
      ],
    },
    overrides: [],
    status: "resolved",
    content_hash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  };

  afterAll(async () => {
    // Clean up test record from Supabase
    try {
      const db = getClient();
      await db.from("inspections").delete().eq("record_id", TEST_RECORD_ID);
    } catch {
      // Ignore cleanup error if credentials failed
    }
  });

  test("1. Successfully inserts inspection record into live database", async () => {
    await expect(insertInspection(testRecord)).resolves.not.toThrow();
  });

  test("2. Retrieves the inserted record with matching org_id", async () => {
    const fetched = await getInspection(TEST_RECORD_ID, ORG_ALPHA);
    expect(fetched).not.toBeNull();
    expect(fetched?.record_id).toBe(TEST_RECORD_ID);
    expect(fetched?.organization_id).toBe(ORG_ALPHA);
    expect(fetched?.outcome.disposition).toBe("restock");
    expect(fetched?.checks).toHaveLength(3);
  });

  test("3. Tenancy isolation: different org cannot read alpha's record", async () => {
    const fetchedBravo = await getInspection(TEST_RECORD_ID, ORG_BRAVO);
    expect(fetchedBravo).toBeNull();
  });

  test("4. Applies operator override and persists updated disposition and reason", async () => {
    const overrideRecord: OverrideRecord = {
      override_id: `OVR-${Date.now()}`,
      operator_id: "op_supervisor",
      reason: "Customer noted minor hinge issue, routing to refurbish instead.",
      previous_disposition: "restock",
      new_disposition: "refurbish",
      overridden_at: new Date().toISOString(),
    };

    const updatedHash = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

    await applyOverride(
      TEST_RECORD_ID,
      ORG_ALPHA,
      overrideRecord,
      "resolved",
      updatedHash
    );

    const fetched = await getInspection(TEST_RECORD_ID, ORG_ALPHA);
    expect(fetched).not.toBeNull();
    expect(fetched?.overrides).toHaveLength(1);
    expect(fetched?.overrides[0].new_disposition).toBe("refurbish");
    expect(fetched?.content_hash).toBe(updatedHash);
  });

  test("5. Confirms inspection record", async () => {
    await expect(confirmInspection(TEST_RECORD_ID, ORG_ALPHA)).resolves.not.toThrow();
  });
});
