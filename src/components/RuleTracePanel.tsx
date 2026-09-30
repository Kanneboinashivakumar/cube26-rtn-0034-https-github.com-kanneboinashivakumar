"use client";

/**
 * RuleTracePanel.tsx
 *
 * Renders the rule_trace[] from EvidenceRecord.outcome.
 * Shows which rules were evaluated and which fired.
 * Does not reinterpret or recalculate any rules.
 */

import type { RuleTraceEntry } from "@/lib/schemas";

interface RuleTracePanelProps {
  rules: RuleTraceEntry[];
}

export default function RuleTracePanel({ rules }: RuleTracePanelProps) {
  if (!rules.length) {
    return (
      <p className="text-sm text-gray-400 italic">No rule trace available.</p>
    );
  }

  return (
    <div className="space-y-2">
      {rules.map((rule, i) => (
        <div
          key={rule.rule_id ?? i}
          className={`flex items-start gap-3 rounded-lg px-4 py-3 border text-sm ${
            rule.matched
              ? "bg-blue-50 border-blue-200 text-blue-900"
              : "bg-gray-50 border-gray-200 text-gray-500"
          }`}
        >
          {/* Matched indicator */}
          <span
            className={`mt-0.5 flex-shrink-0 text-xs font-bold w-4 text-center ${
              rule.matched ? "text-blue-600" : "text-gray-300"
            }`}
          >
            {rule.matched ? "▶" : "○"}
          </span>

          {/* Rule detail */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs bg-white/60 border border-current/20 px-1.5 py-0.5 rounded">
                {rule.rule_id}
              </span>
              {rule.matched && rule.outcome && (
                <span className="text-xs font-semibold uppercase tracking-wide">
                  → {rule.outcome}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs leading-relaxed">
              {rule.description}
            </p>
          </div>

          {/* Fired / Not fired label */}
          <span
            className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide mt-0.5 ${
              rule.matched ? "text-blue-600" : "text-gray-300"
            }`}
          >
            {rule.matched ? "Fired" : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
