/**
 * POST /api/confirm
 *
 * Confirms an existing inspection (sets status=resolved).
 * Does NOT add an override record.
 *
 * Response codes:
 *   200  — confirmed
 *   207  — confirmed in memory but persistence failed
 *   400  — validation error
 *   404  — record not found
 *   500  — unexpected server error
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { ConfirmRequest } from "@/lib/schemas";
import { confirmInspectionRecord } from "@/lib/services/confirm-service";

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

  let parsed: ReturnType<typeof ConfirmRequest.parse>;
  try {
    parsed = ConfirmRequest.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid confirm request", details: err.flatten() },
        { status: 400 }
      );
    }
    throw err;
  }

  try {
    const result = await confirmInspectionRecord(parsed);

    if (result.persistenceFailed) {
      return NextResponse.json(
        {
          record_id: result.record_id,
          status: result.status,
          warning: "Confirmed in memory but could not be saved to the database.",
          persistence_error: result.persistenceError,
        },
        { status: 207 }
      );
    }

    return NextResponse.json(
      { record_id: result.record_id, status: result.status },
      { status: 200 }
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "NOT_FOUND") {
      return NextResponse.json({ error: (err as Error).message }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[POST /api/confirm]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
