/**
 * POST /api/inspect
 *
 * Accepts a JSON body matching InspectionInput (with base64 images).
 * Runs the full inspection pipeline and returns the EvidenceRecord.
 *
 * Response codes:
 *   200  — inspection completed (including fail-open results with status=failed)
 *   400  — request body failed validation
 *   500  — unexpected server error
 *
 * Note: A Gemini failure returns 200 with the failure record (status=failed).
 * This is intentional — the pipeline completed, it just could not get AI results.
 * A persistence failure returns 207 (partial success) with the record + warning.
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { runInspection } from "@/lib/services/inspect-service";

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? "org_demo_alpha";
const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID ?? "client_demo_001";
const OPERATOR_LABEL = process.env.NEXT_PUBLIC_OPERATOR_LABEL ?? "demo_operator";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  try {
    const result = await runInspection(body, ORG_ID, CLIENT_ID, OPERATOR_LABEL);

    if (result.persistenceFailed) {
      // 207: inspection ran but DB write failed — return record with warning
      return NextResponse.json(
        {
          record: result.record,
          warning: "Inspection completed but could not be saved to the database.",
          persistence_error: result.persistenceError,
        },
        { status: 207 }
      );
    }

    return NextResponse.json({ record: result.record }, { status: 200 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid inspection input", details: err.flatten() },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[POST /api/inspect]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
