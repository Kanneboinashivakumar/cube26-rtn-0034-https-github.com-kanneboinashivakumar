/**
 * confirm-service.ts
 *
 * Confirms an inspection — sets status=resolved.
 * Does NOT add an override record (confirm ≠ override).
 */

import { getInspection, confirmInspection } from "@/lib/supabase/queries";
import type { ConfirmRequest } from "@/lib/schemas";

export interface ConfirmServiceResult {
  record_id: string;
  status: "resolved";
  persistenceFailed: boolean;
  persistenceError?: string;
}

export async function confirmInspectionRecord(
  req: ConfirmRequest
): Promise<ConfirmServiceResult> {
  // Verify record exists and belongs to this org
  const existing = await getInspection(req.record_id, req.organization_id);
  if (!existing) {
    const err = new Error(`Inspection ${req.record_id} not found for org ${req.organization_id}`);
    (err as NodeJS.ErrnoException).code = "NOT_FOUND";
    throw err;
  }

  let persistenceFailed = false;
  let persistenceError: string | undefined;
  try {
    await confirmInspection(req.record_id, req.organization_id);
  } catch (dbErr) {
    persistenceFailed = true;
    persistenceError =
      dbErr instanceof Error ? dbErr.message : "Unknown persistence error";
  }

  return {
    record_id: req.record_id,
    status: "resolved",
    persistenceFailed,
    persistenceError,
  };
}
