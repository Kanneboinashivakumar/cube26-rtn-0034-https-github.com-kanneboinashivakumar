/**
 * disposition-engine.test.ts
 *
 * Tests every rule branch in the disposition engine.
 * Uses mocked InspectionObservation — no Gemini calls made here.
 *
 * Rules tested (from DISPOSITION_RULES.md):
 *   Rule 1: Identity = FAIL → pending_review
 *   Rule 2: Identity = UNCERTAIN → pending_review
 *   Rule 3: Completeness = UNCERTAIN → pending_review
 *   Rule 4: Condition = UNCERTAIN → pending_review
 *   Rule 5a: PASS/PASS/resale-suitable → restock
 *   Rule 5b: PASS/PASS/Used-Good → refurbish
 *   Rule 5c: PASS/PASS/Used-Acceptable + damaged → dispose
 *   Rule 5d: PASS/PASS/Used-Acceptable + not-damaged → pending_review
 *   Rule 6b: PASS/FAIL/no-essential-missing/resale-or-repairable → refurbish
 *   Rule 6c: PASS/FAIL/essential-missing → pending_review
 *   Rule 6c: PASS/FAIL/Used-Acceptable → pending_review
 */

import { evaluate } from "@/lib/disposition-engine";
import type { InspectionObservation, ExpectedComponent } from "@/lib/schemas";

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeObservation(
  identityVerdict: "PASS" | "FAIL" | "UNCERTAIN",
  completenessVerdict: "PASS" | "FAIL" | "UNCERTAIN",
  conditionVerdict: "PASS" | "UNCERTAIN",
  grade?: string,
  observedState: string = "signs_of_use",
  components: { name: string; observed: boolean | "uncertain" }[] = []
): InspectionObservation {
  return {
    identity: {
      verdict: identityVerdict,
      confidence: 0.9,
      observations: [],
      evidence_refs: [],
    },
    completeness: {
      verdict: completenessVerdict,
      confidence: 0.9,
      observations: [],
      components,
      evidence_refs: [],
    },
    condition: {
      verdict: conditionVerdict,
      confidence: 0.85,
      ...(grade ? { grade: grade as never } : {}),
      observed_state: observedState as never,
      observations: [],
      evidence_refs: [],
    },
    visible_identifiers: [],
  };
}

const defaultCatalogue: ExpectedComponent[] = [
  { name: "Headphones", essential: true },
  { name: "USB-C cable", essential: false },
  { name: "User manual", essential: false },
];

// ─── Rule 1: Identity FAIL ────────────────────────────────────────────────────

test("Rule 1: Identity=FAIL → pending_review", () => {
  const obs = makeObservation("FAIL", "PASS", "PASS", "Used - Very Good");
  const result = evaluate(obs, defaultCatalogue);
  expect(result.disposition).toBe("pending_review");
  expect(result.rule_trace.find((r) => r.rule_id === "rule_1")?.matched).toBe(true);
});

// ─── Rule 2: Identity UNCERTAIN ───────────────────────────────────────────────

test("Rule 2: Identity=UNCERTAIN → pending_review", () => {
  const obs = makeObservation("UNCERTAIN", "PASS", "PASS", "New");
  const result = evaluate(obs, defaultCatalogue);
  expect(result.disposition).toBe("pending_review");
  expect(result.rule_trace.find((r) => r.rule_id === "rule_2")?.matched).toBe(true);
});

// ─── Rule 3: Completeness UNCERTAIN ──────────────────────────────────────────

test("Rule 3: Completeness=UNCERTAIN → pending_review", () => {
  const obs = makeObservation("PASS", "UNCERTAIN", "PASS", "Used - Like New");
  const result = evaluate(obs, defaultCatalogue);
  expect(result.disposition).toBe("pending_review");
  expect(result.rule_trace.find((r) => r.rule_id === "rule_3")?.matched).toBe(true);
});

// ─── Rule 4: Condition UNCERTAIN ─────────────────────────────────────────────

test("Rule 4: Condition=UNCERTAIN → pending_review", () => {
  const obs = makeObservation("PASS", "PASS", "UNCERTAIN");
  const result = evaluate(obs, defaultCatalogue);
  expect(result.disposition).toBe("pending_review");
  expect(result.rule_trace.find((r) => r.rule_id === "rule_4")?.matched).toBe(true);
});

// ─── Rule 5a: restock paths ───────────────────────────────────────────────────

test("Rule 5a: PASS/PASS/New → restock", () => {
  const obs = makeObservation("PASS", "PASS", "PASS", "New", "factory_sealed");
  const result = evaluate(obs, defaultCatalogue);
  expect(result.disposition).toBe("restock");
  expect(result.rule_trace.find((r) => r.rule_id === "rule_5a")?.matched).toBe(true);
});

test("Rule 5a: PASS/PASS/Used-Like New → restock", () => {
  const obs = makeObservation("PASS", "PASS", "PASS", "Used - Like New", "opened_unused");
  const result = evaluate(obs, defaultCatalogue);
  expect(result.disposition).toBe("restock");
});

test("Rule 5a: PASS/PASS/Used-Very Good → restock", () => {
  const obs = makeObservation("PASS", "PASS", "PASS", "Used - Very Good", "signs_of_use");
  const result = evaluate(obs, defaultCatalogue);
  expect(result.disposition).toBe("restock");
});

// ─── Rule 5b: refurbish ───────────────────────────────────────────────────────

test("Rule 5b: PASS/PASS/Used-Good → refurbish", () => {
  const obs = makeObservation("PASS", "PASS", "PASS", "Used - Good", "signs_of_use");
  const result = evaluate(obs, defaultCatalogue);
  expect(result.disposition).toBe("refurbish");
  expect(result.rule_trace.find((r) => r.rule_id === "rule_5b")?.matched).toBe(true);
});

// ─── Rule 5c: dispose ────────────────────────────────────────────────────────

test("Rule 5c: PASS/PASS/Used-Acceptable + damaged → dispose", () => {
  const obs = makeObservation("PASS", "PASS", "PASS", "Used - Acceptable", "damaged");
  const result = evaluate(obs, defaultCatalogue);
  expect(result.disposition).toBe("dispose");
  expect(result.rule_trace.find((r) => r.rule_id === "rule_5c")?.matched).toBe(true);
});

// ─── Rule 5d: borderline without damage ──────────────────────────────────────

test("Rule 5d: PASS/PASS/Used-Acceptable + signs_of_use → pending_review", () => {
  const obs = makeObservation("PASS", "PASS", "PASS", "Used - Acceptable", "signs_of_use");
  const result = evaluate(obs, defaultCatalogue);
  expect(result.disposition).toBe("pending_review");
  expect(result.rule_trace.find((r) => r.rule_id === "rule_5d")?.matched).toBe(true);
});

test("Rule 5d: PASS/PASS/Used-Acceptable + opened_unused → pending_review", () => {
  const obs = makeObservation("PASS", "PASS", "PASS", "Used - Acceptable", "opened_unused");
  const result = evaluate(obs, defaultCatalogue);
  expect(result.disposition).toBe("pending_review");
});

// ─── Rule 6b: Completeness FAIL, no essential missing ────────────────────────

test("Rule 6b: PASS/FAIL, non-essential missing, Very Good → refurbish", () => {
  const obs = makeObservation("PASS", "FAIL", "PASS", "Used - Very Good", "signs_of_use", [
    { name: "Headphones", observed: true },
    { name: "USB-C cable", observed: false },   // non-essential
    { name: "User manual", observed: true },
  ]);
  const result = evaluate(obs, defaultCatalogue);
  expect(result.disposition).toBe("refurbish");
  expect(result.rule_trace.find((r) => r.rule_id === "rule_6b")?.matched).toBe(true);
});

test("Rule 6b: PASS/FAIL, non-essential missing, Used-Good → refurbish", () => {
  const obs = makeObservation("PASS", "FAIL", "PASS", "Used - Good", "signs_of_use", [
    { name: "Headphones", observed: true },
    { name: "User manual", observed: false },   // non-essential
  ]);
  const result = evaluate(obs, defaultCatalogue);
  expect(result.disposition).toBe("refurbish");
});

// ─── Rule 6c: essential missing → pending_review ─────────────────────────────

test("Rule 6c: PASS/FAIL, essential component missing → pending_review", () => {
  const obs = makeObservation("PASS", "FAIL", "PASS", "Used - Very Good", "signs_of_use", [
    { name: "Headphones", observed: false },    // essential!
    { name: "USB-C cable", observed: true },
  ]);
  const result = evaluate(obs, defaultCatalogue);
  expect(result.disposition).toBe("pending_review");
  expect(result.rule_trace.find((r) => r.rule_id === "rule_6c")?.matched).toBe(true);
});

test("Rule 6c: PASS/FAIL, Used-Acceptable (borderline grade) → pending_review", () => {
  const obs = makeObservation("PASS", "FAIL", "PASS", "Used - Acceptable", "signs_of_use", [
    { name: "Headphones", observed: true },
    { name: "USB-C cable", observed: false },   // non-essential, but grade is borderline
  ]);
  const result = evaluate(obs, defaultCatalogue);
  expect(result.disposition).toBe("pending_review");
});

// ─── Rule trace completeness ─────────────────────────────────────────────────

test("Rule trace: trace is non-empty on every result", () => {
  const obs = makeObservation("PASS", "PASS", "PASS", "New", "factory_sealed");
  const result = evaluate(obs, defaultCatalogue);
  expect(result.rule_trace.length).toBeGreaterThan(0);
  expect(result.policy_version).toBe("1.0");
});

test("Rule trace: exactly one rule has matched=true", () => {
  const obs = makeObservation("PASS", "PASS", "PASS", "Used - Good");
  const result = evaluate(obs, defaultCatalogue);
  const matched = result.rule_trace.filter((r) => r.matched);
  expect(matched.length).toBe(1);
});
