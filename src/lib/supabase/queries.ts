/**
 * queries.ts — typed Supabase query functions.
 *
 * ALL queries include organization_id in the WHERE clause.
 * This is the application-layer tenancy isolation.
 * Note: Row-Level Security (RLS) is NOT implemented in this build.
 * This is documented honestly — we do not claim RLS unless it is actually written.
 */

import { getClient } from "./client";
import type { EvidenceRecord, OverrideRecord } from "@/lib/schemas";

const TABLE = "inspections";

// Helper: gets client lazily — never called at module load time
function db() {
  return getClient();
}

// ─── Insert ───────────────────────────────────────────────────────────────────

export async function insertInspection(record: EvidenceRecord): Promise<void> {
  const { error } = await db().from(TABLE).insert({
    record_id: record.record_id,
    schema_version: record.schema_version,
    organization_id: record.organization_id,
    client_id: record.client_id,
    agent: record.agent,
    subject: record.subject,
    captured_at: record.captured_at,
    operator_label: record.operator_label,
    images: record.images,
    checks: record.checks,
    outcome: record.outcome,
    overrides: record.overrides,
    status: record.status,
    content_hash: record.content_hash ?? null,
    raw_observation: record.raw_observation ?? null,
    error_detail: record.error_detail ?? null,
  });

  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
}

// ─── Fetch by record_id (org-scoped) ─────────────────────────────────────────

export async function getInspection(
  record_id: string,
  organization_id: string
): Promise<EvidenceRecord | null> {
  const { data, error } = await db()
    .from(TABLE)
    .select("*")
    .eq("record_id", record_id)
    .eq("organization_id", organization_id) // tenancy isolation
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(`Supabase fetch failed: ${error.message}`);
  }

  return data as EvidenceRecord;
}

// ─── Append override + update status + recompute hash ─────────────────────────

export async function applyOverride(
  record_id: string,
  organization_id: string,
  override: OverrideRecord,
  new_status: "resolved" | "pending_review",
  new_content_hash: string
): Promise<void> {
  // Fetch current overrides first
  const { data, error: fetchError } = await db()
    .from(TABLE)
    .select("overrides")
    .eq("record_id", record_id)
    .eq("organization_id", organization_id)
    .single();

  if (fetchError) throw new Error(`Supabase fetch for override failed: ${fetchError.message}`);

  const currentOverrides: OverrideRecord[] = (data?.overrides as OverrideRecord[]) ?? [];

  const { error: updateError } = await db()
    .from(TABLE)
    .update({
      overrides: [...currentOverrides, override],
      status: new_status,
      content_hash: new_content_hash,
      updated_at: new Date().toISOString(),
    })
    .eq("record_id", record_id)
    .eq("organization_id", organization_id);

  if (updateError) throw new Error(`Supabase override update failed: ${updateError.message}`);
}

// ─── Confirm (set status=resolved without override record) ────────────────────

export async function confirmInspection(
  record_id: string,
  organization_id: string
): Promise<void> {
  const { error } = await db()
    .from(TABLE)
    .update({
      status: "resolved",
      updated_at: new Date().toISOString(),
    })
    .eq("record_id", record_id)
    .eq("organization_id", organization_id);

  if (error) throw new Error(`Supabase confirm failed: ${error.message}`);
}
