/**
 * condition-scale.test.ts
 *
 * Tests for condition-scale.ts — validates the authoritative grade/state enums
 * and helper functions.
 */

import {
  CONDITION_GRADES,
  OBSERVED_STATES,
  isValidConditionGrade,
  isValidObservedState,
  isResaleSuitable,
  isRepairable,
  isBorderline,
  RESALE_SUITABLE_GRADES,
  REPAIRABLE_GRADES,
  BORDERLINE_GRADES,
} from "@/lib/condition-scale";

// ─── Grade enum coverage ──────────────────────────────────────────────────────

test("CONDITION_GRADES has exactly 5 Amazon grades", () => {
  expect(CONDITION_GRADES).toHaveLength(5);
  expect(CONDITION_GRADES).toContain("New");
  expect(CONDITION_GRADES).toContain("Used - Like New");
  expect(CONDITION_GRADES).toContain("Used - Very Good");
  expect(CONDITION_GRADES).toContain("Used - Good");
  expect(CONDITION_GRADES).toContain("Used - Acceptable");
});

test("OBSERVED_STATES has exactly 6 states", () => {
  expect(OBSERVED_STATES).toHaveLength(6);
  expect(OBSERVED_STATES).toContain("factory_sealed");
  expect(OBSERVED_STATES).toContain("opened_unused");
  expect(OBSERVED_STATES).toContain("signs_of_use");
  expect(OBSERVED_STATES).toContain("damaged");
  expect(OBSERVED_STATES).toContain("empty_box");
  expect(OBSERVED_STATES).toContain("uncertain");
});

// ─── isValidConditionGrade ────────────────────────────────────────────────────

test("isValidConditionGrade returns true for all valid grades", () => {
  for (const grade of CONDITION_GRADES) {
    expect(isValidConditionGrade(grade)).toBe(true);
  }
});

test("isValidConditionGrade returns false for invented grades", () => {
  expect(isValidConditionGrade("Good")).toBe(false);
  expect(isValidConditionGrade("Very Good")).toBe(false);
  expect(isValidConditionGrade("Like New")).toBe(false);
  expect(isValidConditionGrade("")).toBe(false);
  expect(isValidConditionGrade("used - like new")).toBe(false); // case-sensitive
});

// ─── isValidObservedState ─────────────────────────────────────────────────────

test("isValidObservedState returns true for all valid states", () => {
  for (const state of OBSERVED_STATES) {
    expect(isValidObservedState(state)).toBe(true);
  }
});

test("isValidObservedState returns false for invented states", () => {
  expect(isValidObservedState("heavily_worn")).toBe(false);
  expect(isValidObservedState("scratched")).toBe(false);
  expect(isValidObservedState("")).toBe(false);
});

// ─── Grade groupings ──────────────────────────────────────────────────────────

test("RESALE_SUITABLE_GRADES contains New, Like New, Very Good", () => {
  expect(RESALE_SUITABLE_GRADES).toContain("New");
  expect(RESALE_SUITABLE_GRADES).toContain("Used - Like New");
  expect(RESALE_SUITABLE_GRADES).toContain("Used - Very Good");
  expect(RESALE_SUITABLE_GRADES).not.toContain("Used - Good");
  expect(RESALE_SUITABLE_GRADES).not.toContain("Used - Acceptable");
});

test("REPAIRABLE_GRADES contains only Used-Good", () => {
  expect(REPAIRABLE_GRADES).toContain("Used - Good");
  expect(REPAIRABLE_GRADES).toHaveLength(1);
});

test("BORDERLINE_GRADES contains only Used-Acceptable", () => {
  expect(BORDERLINE_GRADES).toContain("Used - Acceptable");
  expect(BORDERLINE_GRADES).toHaveLength(1);
});

// ─── Helper function correctness ──────────────────────────────────────────────

test("isResaleSuitable is true only for New, Like New, Very Good", () => {
  expect(isResaleSuitable("New")).toBe(true);
  expect(isResaleSuitable("Used - Like New")).toBe(true);
  expect(isResaleSuitable("Used - Very Good")).toBe(true);
  expect(isResaleSuitable("Used - Good")).toBe(false);
  expect(isResaleSuitable("Used - Acceptable")).toBe(false);
});

test("isRepairable is true only for Used-Good", () => {
  expect(isRepairable("Used - Good")).toBe(true);
  expect(isRepairable("New")).toBe(false);
  expect(isRepairable("Used - Acceptable")).toBe(false);
});

test("isBorderline is true only for Used-Acceptable", () => {
  expect(isBorderline("Used - Acceptable")).toBe(true);
  expect(isBorderline("Used - Good")).toBe(false);
  expect(isBorderline("New")).toBe(false);
});

// ─── Grade groups are mutually exclusive ─────────────────────────────────────

test("Grade groups are mutually exclusive and jointly exhaustive", () => {
  for (const grade of CONDITION_GRADES) {
    if (grade === "New") {
      expect(isResaleSuitable(grade)).toBe(true);
      expect(isRepairable(grade)).toBe(false);
      expect(isBorderline(grade)).toBe(false);
    } else if (grade === "Used - Good") {
      expect(isResaleSuitable(grade)).toBe(false);
      expect(isRepairable(grade)).toBe(true);
      expect(isBorderline(grade)).toBe(false);
    } else if (grade === "Used - Acceptable") {
      expect(isResaleSuitable(grade)).toBe(false);
      expect(isRepairable(grade)).toBe(false);
      expect(isBorderline(grade)).toBe(true);
    }
  }
});
