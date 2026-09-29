/**
 * condition-scale.ts
 *
 * Single source of truth for condition terminology.
 *
 * Scope: Consumer Electronics (primary evaluation category for this build).
 * Source: Amazon Seller Central published condition guidelines.
 *
 * DO NOT invent grades or modify these values without verifying against the
 * current Amazon Seller Central condition guidelines.
 *
 * observed_state ≠ condition_grade — these are separate concepts:
 *   condition_grade: the authoritative sellable condition from Amazon's scale
 *   observed_state:  a raw visual observation logged by the AI agent
 */

// ─── Condition grades ───────────────────────────────────────────────────────
// Exactly matches Amazon's published condition values for used/new items.
// No additions, no removals.

export const CONDITION_GRADES = [
  "New",
  "Used - Like New",
  "Used - Very Good",
  "Used - Good",
  "Used - Acceptable",
] as const;

export type ConditionGrade = (typeof CONDITION_GRADES)[number];

// ─── Observed states ─────────────────────────────────────────────────────────
// Raw visual observations — NOT condition grades.
// These are logged by the AI agent based on what it sees in the photos.

export const OBSERVED_STATES = [
  "factory_sealed",
  "opened_unused",
  "signs_of_use",
  "damaged",
  "empty_box",
  "uncertain",
] as const;

export type ObservedState = (typeof OBSERVED_STATES)[number];

// ─── Scale metadata ───────────────────────────────────────────────────────────

export const CONDITION_SCALE_META = {
  version: "1.0",
  category: "Consumer Electronics",
  source: "Amazon Seller Central condition guidelines",
  note: "Scoped to Consumer Electronics only. Do not claim this scale applies universally to all product categories.",
} as const;

// ─── Grade groupings (used by disposition engine per DISPOSITION_RULES.md) ───

/** Grades that support direct restock without refurbishment. */
export const RESALE_SUITABLE_GRADES: readonly ConditionGrade[] = [
  "New",
  "Used - Like New",
  "Used - Very Good",
];

/** Grade that supports refurbishment path. */
export const REPAIRABLE_GRADES: readonly ConditionGrade[] = ["Used - Good"];

/** Borderline grade — disposition depends on observed_state (see rule 5c/5d). */
export const BORDERLINE_GRADES: readonly ConditionGrade[] = ["Used - Acceptable"];

// ─── Validation helpers ───────────────────────────────────────────────────────

export function isValidConditionGrade(grade: string): grade is ConditionGrade {
  return (CONDITION_GRADES as readonly string[]).includes(grade);
}

export function isValidObservedState(state: string): state is ObservedState {
  return (OBSERVED_STATES as readonly string[]).includes(state);
}

export function isResaleSuitable(grade: ConditionGrade): boolean {
  return (RESALE_SUITABLE_GRADES as readonly string[]).includes(grade);
}

export function isRepairable(grade: ConditionGrade): boolean {
  return (REPAIRABLE_GRADES as readonly string[]).includes(grade);
}

export function isBorderline(grade: ConditionGrade): boolean {
  return (BORDERLINE_GRADES as readonly string[]).includes(grade);
}
