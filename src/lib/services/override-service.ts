/**
 * override-service.ts
 *
 * Applies an operator override to an existing inspection record.
 *
 * Contract:
 *  - Requires reason (min 10 chars) — enforced by Zod schema upstream
 *  - Preserves the original verdict (overrides are appended, not replacing)
 *  - Recomputes content_hash after mutation
 *  - Returns the updated record
 */

import { getInspection, applyOverride } from "@/lib/supabase/queries";
import { computeContentHash } from "@/lib/content-hash";
import type { OverrideRequest, EvidenceRecord, OverrideRecord } from "@/lib/schemas";

export interface OverrideServiceResult {
  record: EvidenceRecord;
  persistenceFailed: boolean;
  persistenceError?: string;
}

export async function applyInspectionOverride(
  req: OverrideRequest
): Promise<OverrideServiceResult> {
  // Fetch existing record (org-scoped)
  const existing = await getInspection(req.record_id, req.organization_id);
  if (!existing) {
    const err = new Error(`Inspection ${req.record_id} not found for org ${req.organization_id}`);
    (err as NodeJS.ErrnoException).code = "NOT_FOUND";
    throw err;
  }

  const overrideRecord: OverrideRecord = {
    override_id: `OVR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    operator_id: req.operator_id,
    reason: req.reason,
    previous_disposition: existing.outcome.disposition,
    new_disposition: req.new_disposition,
    overridden_at: new Date().toISOString(),
  };

  const newStatus = req.new_disposition === "pending_review" ? "pending_review" : "resolved";

  // Build the updated record shape for hash computation
  const updatedRecord: EvidenceRecord = {
    ...existing,
    overrides: [...existing.overrides, overrideRecord],
    status: newStatus,
    outcome: {
      ...existing.outcome,
      disposition: req.new_disposition,
    },
  };

  const { content_hash: _prevHash, ...recordToHash } = updatedRecord;
  const newHash = computeContentHash(recordToHash);

  // Persist
  let persistenceFailed = false;
  let persistenceError: string | undefined;
  try {
    await applyOverride(
      req.record_id,
      req.organization_id,
      overrideRecord,
      newStatus,
      newHash
    );
  } catch (dbErr) {
    persistenceFailed = true;
    persistenceError =
      dbErr instanceof Error ? dbErr.message : "Unknown persistence error";
  }

  return {
    record: { ...updatedRecord, content_hash: newHash },
    persistenceFailed,
    persistenceError,
  };
}
