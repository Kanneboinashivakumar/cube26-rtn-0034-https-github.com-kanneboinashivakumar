/**
 * POST /api/override
 *
 * Applies an operator override to an existing inspection.
 * Requires a reason (min 10 characters) — enforced by OverrideRequest schema.
 *
 * Response codes:
 *   200  — override applied
 *   207  — override applied but persistence failed
 *   400  — validation error
 *   404  — record not found for this org
 *   500  — unexpected server error
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { OverrideRequest } from "@/lib/schemas";
import { applyInspectionOverride } from "@/lib/services/override-service";

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

  let parsed: ReturnType<typeof OverrideRequest.parse>;
  try {
    parsed = OverrideRequest.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid override request", details: err.flatten() },
        { status: 400 }
      );
    }
    throw err;
  }

  try {
    const result = await applyInspectionOverride(parsed);

    if (result.persistenceFailed) {
      return NextResponse.json(
        {
          record: result.record,
          warning: "Override applied in memory but could not be saved to the database.",
          persistence_error: result.persistenceError,
        },
        { status: 207 }
      );
    }

    return NextResponse.json({ record: result.record }, { status: 200 });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "NOT_FOUND") {
      return NextResponse.json({ error: (err as Error).message }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[POST /api/override]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
