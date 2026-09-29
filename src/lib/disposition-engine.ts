/**
 * disposition-engine.ts
 *
 * Deterministic disposition engine — pure function, no I/O, no side effects.
 *
 * Applies rules from DISPOSITION_RULES.md in exact precedence order.
 * First-match-wins. The model NEVER decides disposition.
 * The essential flag comes ONLY from the input catalogue, never from model output.
 *
 * Returns both the disposition AND a full rule trace for auditability.
 */

import type { InspectionObservation, ExpectedComponent } from "@/lib/schemas";
import type { Disposition, RuleTraceEntry } from "@/lib/schemas";
import { isResaleSuitable, isRepairable, isBorderline } from "@/lib/condition-scale";
import type { ConditionGrade, ObservedState } from "@/lib/condition-scale";

export interface DispositionResult {
  disposition: Disposition;
  policy_version: "1.0";
  rule_trace: RuleTraceEntry[];
}

/**
 * evaluate — deterministic disposition engine.
 *
 * @param observation  Validated InspectionObservation from Gemini
 * @param catalogue    Expected components with essential flags (from application catalogue)
 * @returns            Disposition + full rule trace
 */
export function evaluate(
  observation: InspectionObservation,
  catalogue: ExpectedComponent[]
): DispositionResult {
  const trace: RuleTraceEntry[] = [];
  const { identity, completeness, condition } = observation;

  // ── Rule 1: Identity = FAIL ──────────────────────────────────────────────
  const rule1Matched = identity.verdict === "FAIL";
  trace.push({
    rule_id: "rule_1",
    description: "Identity FAIL → pending_review",
    matched: rule1Matched,
    inputs: { identity_verdict: identity.verdict },
    ...(rule1Matched ? { outcome: "pending_review" } : {}),
  });
  if (rule1Matched) {
    return { disposition: "pending_review", policy_version: "1.0", rule_trace: trace };
  }

  // ── Rule 2: Identity = UNCERTAIN ──────────────────────────────────────────
  const rule2Matched = identity.verdict === "UNCERTAIN";
  trace.push({
    rule_id: "rule_2",
    description: "Identity UNCERTAIN → pending_review",
    matched: rule2Matched,
    inputs: { identity_verdict: identity.verdict },
    ...(rule2Matched ? { outcome: "pending_review" } : {}),
  });
  if (rule2Matched) {
    return { disposition: "pending_review", policy_version: "1.0", rule_trace: trace };
  }

  // ── Rule 3: Completeness = UNCERTAIN ─────────────────────────────────────
  const rule3Matched = completeness.verdict === "UNCERTAIN";
  trace.push({
    rule_id: "rule_3",
    description: "Completeness UNCERTAIN → pending_review",
    matched: rule3Matched,
    inputs: { completeness_verdict: completeness.verdict },
    ...(rule3Matched ? { outcome: "pending_review" } : {}),
  });
  if (rule3Matched) {
    return { disposition: "pending_review", policy_version: "1.0", rule_trace: trace };
  }

  // ── Rule 4: Condition = UNCERTAIN ─────────────────────────────────────────
  const rule4Matched = condition.verdict === "UNCERTAIN";
  trace.push({
    rule_id: "rule_4",
    description: "Condition UNCERTAIN → pending_review",
    matched: rule4Matched,
    inputs: { condition_verdict: condition.verdict },
    ...(rule4Matched ? { outcome: "pending_review" } : {}),
  });
  if (rule4Matched) {
    return { disposition: "pending_review", policy_version: "1.0", rule_trace: trace };
  }

  // ── Rules 1–4 exhausted: identity=PASS, completeness=PASS|FAIL, condition=PASS ──
  // condition.grade is guaranteed to exist here (PASS verdict requires it)
  const grade = condition.grade as ConditionGrade;
  const observedState = condition.observed_state as ObservedState;

  // ── Rule 5: Identity = PASS AND Completeness = PASS ───────────────────────
  if (completeness.verdict === "PASS") {
    // 5a: resale-suitable grade → restock
    if (isResaleSuitable(grade)) {
      trace.push({
        rule_id: "rule_5a",
        description: "Identity PASS, Completeness PASS, resale-suitable grade → restock",
        matched: true,
        inputs: { identity_verdict: "PASS", completeness_verdict: "PASS", condition_grade: grade },
        outcome: "restock",
      });
      return { disposition: "restock", policy_version: "1.0", rule_trace: trace };
    }

    trace.push({
      rule_id: "rule_5a",
      description: "Identity PASS, Completeness PASS, resale-suitable grade → restock",
      matched: false,
      inputs: { condition_grade: grade },
    });

    // 5b: repairable grade (Used - Good) → refurbish
    if (isRepairable(grade)) {
      trace.push({
        rule_id: "rule_5b",
        description: "Identity PASS, Completeness PASS, Used-Good → refurbish",
        matched: true,
        inputs: { identity_verdict: "PASS", completeness_verdict: "PASS", condition_grade: grade },
        outcome: "refurbish",
      });
      return { disposition: "refurbish", policy_version: "1.0", rule_trace: trace };
    }

    trace.push({
      rule_id: "rule_5b",
      description: "Identity PASS, Completeness PASS, Used-Good → refurbish",
      matched: false,
      inputs: { condition_grade: grade },
    });

    // 5c/5d: borderline grade (Used - Acceptable)
    if (isBorderline(grade)) {
      if (observedState === "damaged") {
        // 5c: damaged — dispose
        trace.push({
          rule_id: "rule_5c",
          description:
            "Identity PASS, Completeness PASS, Used-Acceptable + damaged → dispose",
          matched: true,
          inputs: {
            identity_verdict: "PASS",
            completeness_verdict: "PASS",
            condition_grade: grade,
            observed_state: observedState,
          },
          outcome: "dispose",
        });
        return { disposition: "dispose", policy_version: "1.0", rule_trace: trace };
      } else {
        // 5d: borderline without clear damage signal → pending_review
        trace.push({
          rule_id: "rule_5d",
          description:
            "Identity PASS, Completeness PASS, Used-Acceptable (no damage signal) → pending_review",
          matched: true,
          inputs: {
            identity_verdict: "PASS",
            completeness_verdict: "PASS",
            condition_grade: grade,
            observed_state: observedState,
          },
          outcome: "pending_review",
        });
        return { disposition: "pending_review", policy_version: "1.0", rule_trace: trace };
      }
    }
  }

  // ── Rule 6: Identity = PASS AND Completeness = FAIL ───────────────────────
  if (completeness.verdict === "FAIL") {
    // Identify missing components from model output
    const missingComponentNames = completeness.components
      .filter((c) => c.observed === false)
      .map((c) => c.name.toLowerCase().trim());

    // Join to catalogue to check essential flags
    // The essential flag comes ONLY from the catalogue — never from the model
    const anyEssentialMissing = missingComponentNames.some((missingName) => {
      const catalogueEntry = catalogue.find(
        (c) => c.name.toLowerCase().trim() === missingName
      );
      // If not found in catalogue, treat as non-essential (conservative)
      return catalogueEntry?.essential === true;
    });

    const sharedInputs = {
      identity_verdict: "PASS",
      completeness_verdict: "FAIL",
      condition_grade: grade,
      essential_missing: anyEssentialMissing,
    };

    // 6a/6b: no essential missing + resale-suitable or repairable → refurbish
    if (!anyEssentialMissing && (isResaleSuitable(grade) || isRepairable(grade))) {
      trace.push({
        rule_id: "rule_6b",
        description:
          "Identity PASS, Completeness FAIL, no essential missing, resale-suitable/repairable → refurbish",
        matched: true,
        inputs: sharedInputs,
        outcome: "refurbish",
      });
      return { disposition: "refurbish", policy_version: "1.0", rule_trace: trace };
    }

    trace.push({
      rule_id: "rule_6b",
      description:
        "Identity PASS, Completeness FAIL, no essential missing, resale-suitable/repairable → refurbish",
      matched: false,
      inputs: sharedInputs,
    });

    // 6c: essential missing OR borderline grade → pending_review
    trace.push({
      rule_id: "rule_6c",
      description:
        "Identity PASS, Completeness FAIL, essential missing or Used-Acceptable → pending_review",
      matched: true,
      inputs: sharedInputs,
      outcome: "pending_review",
    });
    return { disposition: "pending_review", policy_version: "1.0", rule_trace: trace };
  }

  // ── Unreachable fallback ──────────────────────────────────────────────────
  // Should never be reached given the rules above cover all cases.
  trace.push({
    rule_id: "fallback",
    description: "No rule matched — routing to pending_review (should not occur)",
    matched: true,
    inputs: {
      identity_verdict: identity.verdict,
      completeness_verdict: completeness.verdict,
      condition_verdict: condition.verdict,
    },
    outcome: "pending_review",
  });
  return { disposition: "pending_review", policy_version: "1.0", rule_trace: trace };
}
