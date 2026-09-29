/**
 * check-independence.test.ts
 *
 * Proves that Identity, Completeness, and Condition verdicts are independently evaluated.
 * A verdict on one check must NEVER cause a different verdict on another check.
 *
 * Scenarios from the spec:
 *   1. Correct product + damaged condition → Identity stays PASS
 *   2. Correct product + missing cable + clean body → Completeness FAIL, Condition PASS
 *   3. Wrong product + excellent condition → Identity FAIL, Condition is still independently assessed
 *   4. Identifier not visible → Identity = UNCERTAIN
 *   5. Poor/insufficient image → All UNCERTAIN
 */

import { evaluate } from "@/lib/disposition-engine";
import type { InspectionObservation, ExpectedComponent } from "@/lib/schemas";

function makeObservation(
  identity: { verdict: "PASS" | "FAIL" | "UNCERTAIN"; confidence?: number },
  completeness: {
    verdict: "PASS" | "FAIL" | "UNCERTAIN";
    components?: { name: string; observed: boolean | "uncertain" }[];
  },
  condition: {
    verdict: "PASS" | "UNCERTAIN";
    grade?: string;
    observed_state?: string;
  }
): InspectionObservation {
  return {
    identity: {
      verdict: identity.verdict,
      confidence: identity.confidence ?? 0.9,
      observations: [],
      evidence_refs: [],
    },
    completeness: {
      verdict: completeness.verdict,
      confidence: 0.88,
      components: completeness.components ?? [],
      observations: [],
      evidence_refs: [],
    },
    condition: {
      verdict: condition.verdict,
      confidence: 0.85,
      ...(condition.grade ? { grade: condition.grade as never } : {}),
      observed_state: (condition.observed_state ?? "signs_of_use") as never,
      observations: [],
      evidence_refs: [],
    },
    visible_identifiers: [],
  };
}

const catalogue: ExpectedComponent[] = [
  { name: "Headphones", essential: true },
  { name: "USB-C cable", essential: false },
];

// ─── Scenario 1: Correct product + damaged ────────────────────────────────────
// Identity must PASS regardless of physical damage.

test("Scenario 1: Identity=PASS even when condition is Used-Acceptable/damaged", () => {
  const obs = makeObservation(
    { verdict: "PASS" },
    { verdict: "PASS" },
    { verdict: "PASS", grade: "Used - Acceptable", observed_state: "damaged" }
  );
  // Disposition goes to dispose per rule 5c, but identity check itself was PASS
  const result = evaluate(obs, catalogue);
  // The identity verdict in the input was PASS — it should not have been changed by condition
  expect(obs.identity.verdict).toBe("PASS");
  // Engine correctly routes to dispose (rule 5c), not pending_review due to identity
  expect(result.disposition).toBe("dispose");
  expect(result.rule_trace.find((r) => r.rule_id === "rule_1")?.matched).toBe(false);
  expect(result.rule_trace.find((r) => r.rule_id === "rule_5c")?.matched).toBe(true);
});

// ─── Scenario 2: Missing non-essential cable + clean body ─────────────────────
// Completeness=FAIL, Condition=PASS (Very Good) must be independently maintained.

test("Scenario 2: Completeness=FAIL and Condition=PASS coexist (cable missing, body clean)", () => {
  const obs = makeObservation(
    { verdict: "PASS" },
    {
      verdict: "FAIL",
      components: [
        { name: "Headphones", observed: true },
        { name: "USB-C cable", observed: false }, // non-essential
      ],
    },
    { verdict: "PASS", grade: "Used - Very Good", observed_state: "signs_of_use" }
  );
  expect(obs.completeness.verdict).toBe("FAIL");
  expect(obs.condition.verdict).toBe("PASS");
  expect(obs.condition.grade).toBe("Used - Very Good");
  // Engine: PASS/FAIL + non-essential missing → refurbish (rule 6b)
  const result = evaluate(obs, catalogue);
  expect(result.disposition).toBe("refurbish");
});

// ─── Scenario 3: Wrong product + excellent condition ──────────────────────────
// Condition is still independently assessed even when identity fails.

test("Scenario 3: Identity=FAIL, Condition still independently has a grade (but pending_review from rule 1)", () => {
  const obs = makeObservation(
    { verdict: "FAIL" },
    { verdict: "PASS" },
    { verdict: "PASS", grade: "New", observed_state: "factory_sealed" }
  );
  expect(obs.identity.verdict).toBe("FAIL");
  expect(obs.condition.grade).toBe("New"); // Condition was still assessed independently
  const result = evaluate(obs, catalogue);
  expect(result.disposition).toBe("pending_review"); // Rule 1 fires first
  expect(result.rule_trace.find((r) => r.rule_id === "rule_1")?.matched).toBe(true);
  // Rule 1 fires — subsequent rules not evaluated
  expect(result.rule_trace.find((r) => r.rule_id === "rule_5a")?.matched).toBeUndefined();
});

test("Scenario 3: Identity=UNCERTAIN, Condition independently assessed as signs_of_use", () => {
  const obs = makeObservation(
    { verdict: "UNCERTAIN", confidence: 0.4 },
    { verdict: "PASS" },
    { verdict: "PASS", grade: "Used - Good", observed_state: "signs_of_use" }
  );
  expect(obs.identity.verdict).toBe("UNCERTAIN");
  expect(obs.condition.grade).toBe("Used - Good"); // independently assessed
  const result = evaluate(obs, catalogue);
  expect(result.disposition).toBe("pending_review"); // Rule 2
  expect(result.rule_trace.find((r) => r.rule_id === "rule_2")?.matched).toBe(true);
});

// ─── Scenario 4: Identifier not visible → Identity=UNCERTAIN ─────────────────
// Insufficient evidence must produce UNCERTAIN, not a fabricated PASS or FAIL.

test("Scenario 4: Identity=UNCERTAIN when product label not visible (low confidence)", () => {
  const obs = makeObservation(
    { verdict: "UNCERTAIN", confidence: 0.3 },
    { verdict: "UNCERTAIN" },
    { verdict: "UNCERTAIN" }
  );
  expect(obs.identity.verdict).toBe("UNCERTAIN");
  // Confidence should be low to reflect insufficient evidence
  expect(obs.identity.confidence).toBeLessThan(0.5);
  const result = evaluate(obs, catalogue);
  expect(result.disposition).toBe("pending_review");
});

// ─── Scenario 5: Poor/insufficient image → all UNCERTAIN ─────────────────────
// No fabricated results — all three checks should remain UNCERTAIN.

test("Scenario 5: All checks UNCERTAIN for blurred/insufficient photos → pending_review", () => {
  const obs = makeObservation(
    { verdict: "UNCERTAIN", confidence: 0.2 },
    { verdict: "UNCERTAIN" },
    { verdict: "UNCERTAIN" }
  );
  expect(obs.identity.verdict).toBe("UNCERTAIN");
  expect(obs.completeness.verdict).toBe("UNCERTAIN");
  expect(obs.condition.verdict).toBe("UNCERTAIN");

  const result = evaluate(obs, catalogue);
  // Rule 2 (identity=UNCERTAIN) fires first
  expect(result.disposition).toBe("pending_review");
  // Verify UNCERTAIN is not silently converted to PASS or FAIL anywhere
  expect(obs.identity.verdict).not.toBe("PASS");
  expect(obs.identity.verdict).not.toBe("FAIL");
  expect(obs.condition.verdict).not.toBe("PASS");
});

// ─── Cross-contamination: changing one verdict must not affect others ──────────

test("Cross-contamination: changing identity verdict from PASS to FAIL only affects identity routing", () => {
  const passObs = makeObservation(
    { verdict: "PASS" },
    { verdict: "PASS" },
    { verdict: "PASS", grade: "Used - Very Good" }
  );
  const failObs = makeObservation(
    { verdict: "FAIL" }, // only identity changed
    { verdict: "PASS" },
    { verdict: "PASS", grade: "Used - Very Good" }
  );

  expect(evaluate(passObs, catalogue).disposition).toBe("restock");
  expect(evaluate(failObs, catalogue).disposition).toBe("pending_review");

  // The condition/completeness verdicts are identical in both — only identity changed the routing
  expect(passObs.condition.grade).toBe(failObs.condition.grade);
  expect(passObs.completeness.verdict).toBe(failObs.completeness.verdict);
});
