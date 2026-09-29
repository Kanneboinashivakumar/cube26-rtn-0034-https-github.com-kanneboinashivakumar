/**
 * evidence-builder.ts
 *
 * Transforms a validated InspectionObservation + metadata into the
 * official EvidenceRecord that gets stored in Supabase.
 *
 * This is the only place InspectionObservation is mapped to EvidenceRecord.
 * The distinction matters: InspectionObservation is raw AI output;
 * EvidenceRecord is the auditable, application-level contract.
 */

import type {
  InspectionInput,
  InspectionObservation,
  EvidenceRecord,
  CheckRecord,
} from "@/lib/schemas";
import type { DispositionResult } from "@/lib/disposition-engine";
import { computeContentHash } from "@/lib/content-hash";

const AGENT_VERSION = "0.1.0";

interface BuildOptions {
  input: InspectionInput;
  observation: InspectionObservation;
  dispositionResult: DispositionResult;
  latency_ms: number;
  model_version: string;
  organization_id: string;
  client_id: string;
  operator_label: string;
}

export function buildEvidenceRecord(opts: BuildOptions): EvidenceRecord {
  const {
    input,
    observation,
    dispositionResult,
    latency_ms,
    model_version,
    organization_id,
    client_id,
    operator_label,
  } = opts;

  const captured_at = new Date().toISOString();
  const record_id = `RTN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  // Image labels (positional) — no binary stored in the record
  const images = input.images.map((_, i) => `image_${i + 1}`);

  // ── Identity check record ──────────────────────────────────────────────────
  const identityCheck: CheckRecord = {
    check_key: "identity",
    verdict: observation.identity.verdict,
    confidence: observation.identity.confidence,
    detail: observation.identity.observations.join("; ") || "No observations provided",
    model_version,
    latency_ms,
    evidence_refs: observation.identity.evidence_refs,
  };

  // ── Completeness check record ──────────────────────────────────────────────
  const missingComponents = observation.completeness.components.filter(
    (c) => c.observed === false
  );
  const uncertainComponents = observation.completeness.components.filter(
    (c) => c.observed === "uncertain"
  );

  let completenessDetail = observation.completeness.observations.join("; ");
  if (!completenessDetail) {
    if (missingComponents.length > 0) {
      completenessDetail = `Missing: ${missingComponents.map((c) => c.name).join(", ")}`;
    } else if (uncertainComponents.length > 0) {
      completenessDetail = `Cannot verify: ${uncertainComponents.map((c) => c.name).join(", ")}`;
    } else {
      completenessDetail = "All expected components observed";
    }
  }

  const completenessCheck: CheckRecord = {
    check_key: "completeness",
    verdict: observation.completeness.verdict,
    confidence: observation.completeness.confidence,
    detail: completenessDetail,
    model_version,
    latency_ms,
    components: observation.completeness.components,
    evidence_refs: observation.completeness.evidence_refs,
  };

  // ── Condition check record ─────────────────────────────────────────────────
  const conditionDetail = observation.condition.observations.join("; ") ||
    (observation.condition.grade
      ? `Condition grade: ${observation.condition.grade}`
      : "Insufficient evidence for condition assessment");

  const conditionCheck: CheckRecord = {
    check_key: "condition",
    verdict: observation.condition.verdict,
    confidence: observation.condition.confidence,
    detail: conditionDetail,
    model_version,
    latency_ms,
    grade: observation.condition.grade,
    observed_state: observation.condition.observed_state,
    evidence_refs: observation.condition.evidence_refs,
  };

  // ── Determine status ───────────────────────────────────────────────────────
  const status =
    dispositionResult.disposition === "pending_review" ? "pending_review" : "resolved";

  // ── Assemble record (without content_hash) ─────────────────────────────────
  const recordWithoutHash: Omit<EvidenceRecord, "content_hash"> = {
    record_id,
    schema_version: "1.0",
    organization_id,
    client_id,
    agent: { name: "ReturnOps AI", version: AGENT_VERSION },
    subject: {
      order_id: input.order_id,
      sku: input.sku,
      asin: input.asin,
      product_name: input.product_name,
    },
    captured_at,
    operator_label,
    images,
    checks: [identityCheck, completenessCheck, conditionCheck],
    outcome: {
      disposition: dispositionResult.disposition,
      policy_version: "1.0",
      rule_trace: dispositionResult.rule_trace,
    },
    overrides: [],
    status,
    raw_observation: observation,
  };

  const content_hash = computeContentHash(recordWithoutHash);

  return { ...recordWithoutHash, content_hash };
}

/** Build a failure record when the AI pipeline fails. */
export function buildFailureRecord(opts: {
  input: InspectionInput | null;
  organization_id: string;
  client_id: string;
  operator_label: string;
  error_detail: string;
  raw_observation?: unknown;
}): EvidenceRecord {
  const captured_at = new Date().toISOString();
  const record_id = `FAIL-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const recordWithoutHash: Omit<EvidenceRecord, "content_hash"> = {
    record_id,
    schema_version: "1.0",
    organization_id: opts.organization_id,
    client_id: opts.client_id,
    agent: { name: "ReturnOps AI", version: AGENT_VERSION },
    subject: opts.input
      ? {
          order_id: opts.input.order_id,
          sku: opts.input.sku,
          asin: opts.input.asin,
          product_name: opts.input.product_name,
        }
      : { order_id: "UNKNOWN", sku: "UNKNOWN", product_name: "UNKNOWN" },
    captured_at,
    operator_label: opts.operator_label,
    images: opts.input ? opts.input.images.map((_, i) => `image_${i + 1}`) : [],
    checks: [],
    outcome: {
      disposition: "pending_review",
      policy_version: "1.0",
      rule_trace: [],
    },
    overrides: [],
    status: "failed",
    error_detail: opts.error_detail,
    raw_observation: opts.raw_observation,
  };

  const content_hash = computeContentHash(recordWithoutHash);
  return { ...recordWithoutHash, content_hash };
}
