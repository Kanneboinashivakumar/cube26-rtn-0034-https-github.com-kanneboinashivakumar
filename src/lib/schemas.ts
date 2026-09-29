/**
 * schemas.ts
 *
 * Single source of truth for ALL Zod schemas in ReturnOps AI.
 *
 * Key design contracts enforced here:
 *  1. InspectionObservation — what Gemini returns (observations only, never disposition)
 *  2. EvidenceRecord        — the official evidence contract stored in Supabase
 *  3. InspectionInput       — what the operator submits
 *  4. OverrideRequest       — what an operator submits to override a decision
 *
 * Condition.verdict is PASS | UNCERTAIN only (no FAIL) — see CONSTRAINTS.md for rationale.
 * Condition.grade uses the exact Amazon enum from condition-scale.ts — out-of-enum fails Zod.
 * The essential flag NEVER appears in model output — it lives in InspectionInput only.
 */

import { z } from "zod";
import { CONDITION_GRADES, OBSERVED_STATES } from "./condition-scale";

// ─── Shared primitives ────────────────────────────────────────────────────────

const Confidence = z.number().min(0).max(1);
const EvidenceRefs = z.array(z.string()).default([]);

// ─── InspectionObservation (raw Gemini output) ────────────────────────────────
// Gemini returns ONLY observations. No disposition. No essential flag. No rule trace.

const ComponentObservation = z.object({
  /** Component name must match the catalogue entry for join. */
  name: z.string().min(1),
  /**
   * Whether this component was visible in the submitted photos.
   * "uncertain" (string) is distinct from boolean false.
   * Gemini must use exactly these three values.
   */
  observed: z.union([z.boolean(), z.literal("uncertain")]),
});

export type ComponentObservation = z.infer<typeof ComponentObservation>;

const IdentityObservation = z.object({
  verdict: z.enum(["PASS", "FAIL", "UNCERTAIN"]),
  confidence: Confidence,
  observations: z.array(z.string()).default([]),
  evidence_refs: EvidenceRefs,
});

export type IdentityObservation = z.infer<typeof IdentityObservation>;

const CompletenessObservation = z.object({
  verdict: z.enum(["PASS", "FAIL", "UNCERTAIN"]),
  confidence: Confidence,
  components: z.array(ComponentObservation).default([]),
  observations: z.array(z.string()).default([]),
  evidence_refs: EvidenceRefs,
});

export type CompletenessObservation = z.infer<typeof CompletenessObservation>;

const ConditionObservation = z.object({
  /**
   * PASS | UNCERTAIN only — no FAIL for Condition.
   * See CONSTRAINTS.md: "Condition does not use FAIL in this build."
   */
  verdict: z.enum(["PASS", "UNCERTAIN"]),
  confidence: Confidence,
  /**
   * grade is required when verdict=PASS; omitted/undefined when verdict=UNCERTAIN.
   * Must be from the exact Amazon published enum — Zod rejects anything else.
   */
  grade: z.enum(CONDITION_GRADES).optional(),
  /**
   * Raw visual observation — NOT the condition grade.
   * e.g. "signs_of_use" is the observation; "Used - Very Good" is the grade.
   */
  observed_state: z.enum(OBSERVED_STATES),
  observations: z.array(z.string()).default([]),
  evidence_refs: EvidenceRefs,
});

export type ConditionObservation = z.infer<typeof ConditionObservation>;

const VisibleIdentifier = z.object({
  type: z.string(), // "model_number" | "sku" | "asin" | "label" | "serial"
  value: z.string(),
  image_ref: z.string(),
});

export type VisibleIdentifier = z.infer<typeof VisibleIdentifier>;

/**
 * InspectionObservation — the complete raw output from ONE Gemini multimodal call.
 * This is validated BEFORE the evidence record is built.
 * Never stored directly — raw_observation in the DB is for debugging only.
 */
export const InspectionObservation = z.object({
  identity: IdentityObservation,
  completeness: CompletenessObservation,
  condition: ConditionObservation,
  visible_identifiers: z.array(VisibleIdentifier).default([]),
});

export type InspectionObservation = z.infer<typeof InspectionObservation>;

// ─── InspectionInput (operator submission) ────────────────────────────────────

/**
 * ExpectedComponent — comes from the catalogue, not from Gemini.
 * The essential flag lives HERE and only here.
 */
export const ExpectedComponent = z.object({
  name: z.string().min(1),
  /**
   * essential comes from the application catalogue.
   * Gemini NEVER produces or modifies this flag.
   */
  essential: z.boolean(),
});

export type ExpectedComponent = z.infer<typeof ExpectedComponent>;

export const InspectionInput = z.object({
  order_id: z.string().min(1, "Order ID is required"),
  sku: z.string().min(1, "SKU is required"),
  asin: z.string().optional(),
  product_name: z.string().min(1, "Product name is required"),
  expected_components: z
    .array(ExpectedComponent)
    .min(1, "At least one expected component is required"),
  /**
   * Base64-encoded image strings.
   * 1–5 images required. Camera and upload images are identical here.
   */
  images: z
    .array(z.string().min(1))
    .min(1, "At least 1 photo is required")
    .max(5, "Maximum 5 photos allowed"),
  /** Image MIME types in the same order as images[]. */
  image_mime_types: z
    .array(z.enum(["image/jpeg", "image/png", "image/webp"]))
    .min(1)
    .max(5),
});

export type InspectionInput = z.infer<typeof InspectionInput>;

// ─── EvidenceRecord (official evidence contract) ──────────────────────────────

const RuleTraceEntry = z.object({
  rule_id: z.string(),
  description: z.string(),
  matched: z.boolean(),
  inputs: z.record(z.string(), z.unknown()),
  outcome: z.string().optional(),
});

export type RuleTraceEntry = z.infer<typeof RuleTraceEntry>;

const CheckRecord = z.object({
  check_key: z.enum(["identity", "completeness", "condition"]),
  verdict: z.string(),
  confidence: Confidence,
  detail: z.string(),
  model_version: z.string(),
  latency_ms: z.number().int().nonnegative(),
  // Condition-specific fields
  grade: z.enum(CONDITION_GRADES).optional(),
  observed_state: z.enum(OBSERVED_STATES).optional(),
  // Completeness-specific
  components: z.array(ComponentObservation).optional(),
  // Evidence references
  evidence_refs: EvidenceRefs,
});

export type CheckRecord = z.infer<typeof CheckRecord>;

const Disposition = z.enum([
  "restock",
  "refurbish",
  "liquidate",
  "dispose",
  "pending_review",
]);

export type Disposition = z.infer<typeof Disposition>;

const OverrideRecord = z.object({
  override_id: z.string(),
  operator_id: z.string(),
  reason: z.string().min(10, "Override reason must be at least 10 characters"),
  previous_disposition: Disposition,
  new_disposition: Disposition,
  overridden_at: z.string().datetime(),
});

export type OverrideRecord = z.infer<typeof OverrideRecord>;

const InspectionStatus = z.enum(["resolved", "pending_review", "failed"]);
export type InspectionStatus = z.infer<typeof InspectionStatus>;

export const EvidenceRecord = z.object({
  record_id: z.string(),
  schema_version: z.literal("1.0"),
  organization_id: z.string(),
  client_id: z.string(),
  agent: z.object({
    name: z.literal("ReturnOps AI"),
    version: z.string(),
  }),
  subject: z.object({
    order_id: z.string(),
    sku: z.string(),
    asin: z.string().optional(),
    product_name: z.string(),
  }),
  captured_at: z.string().datetime(),
  operator_label: z.string(),
  /** Positional image labels: ["image_1", "image_2", …]. No binary stored here. */
  images: z.array(z.string()),
  checks: z.array(CheckRecord),
  outcome: z.object({
    disposition: Disposition,
    policy_version: z.literal("1.0"),
    rule_trace: z.array(RuleTraceEntry),
  }),
  overrides: z.array(OverrideRecord),
  status: InspectionStatus,
  /** SHA-256 of the canonical evidence record JSON (excluding this field). */
  content_hash: z.string().optional(),
  /** Raw model response stored for debugging — not part of official contract. */
  raw_observation: z.unknown().optional(),
  /** Populated when status=failed. */
  error_detail: z.string().optional(),
});

export type EvidenceRecord = z.infer<typeof EvidenceRecord>;

// ─── OverrideRequest ──────────────────────────────────────────────────────────

export const OverrideRequest = z.object({
  record_id: z.string().min(1),
  organization_id: z.string().min(1),
  operator_id: z.string().min(1),
  reason: z
    .string()
    .min(10, "Override reason must be at least 10 characters")
    .max(500, "Override reason must be 500 characters or fewer"),
  new_disposition: Disposition,
});

export type OverrideRequest = z.infer<typeof OverrideRequest>;

// ─── ConfirmRequest ───────────────────────────────────────────────────────────

export const ConfirmRequest = z.object({
  record_id: z.string().min(1),
  organization_id: z.string().min(1),
});

export type ConfirmRequest = z.infer<typeof ConfirmRequest>;
