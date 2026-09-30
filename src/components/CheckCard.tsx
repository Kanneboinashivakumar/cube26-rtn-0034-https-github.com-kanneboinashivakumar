"use client";

/**
 * CheckCard.tsx
 *
 * Renders one of the three inspection check results (identity / completeness / condition).
 * Reads directly from a CheckRecord from the EvidenceRecord.
 * Never invents, recalculates, or reinterprets backend data.
 */

import type { CheckRecord, ComponentObservation } from "@/lib/schemas";
import VerdictBadge from "./VerdictBadge";

const CHECK_TITLES: Record<string, string> = {
  identity: "Identity Check",
  completeness: "Completeness Check",
  condition: "Condition Check",
};

const CHECK_ICONS: Record<string, string> = {
  identity: "🔍",
  completeness: "📦",
  condition: "⭐",
};

interface CheckCardProps {
  check: CheckRecord;
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const colour =
    value >= 0.8 ? "bg-green-500" : value >= 0.5 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${colour} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 tabular-nums w-10 text-right">
        {pct}%
      </span>
    </div>
  );
}

function ComponentRow({ comp }: { comp: ComponentObservation }) {
  const observed = comp.observed;
  let icon: string;
  let label: string;
  let colourClass: string;

  if (observed === true) {
    icon = "✓";
    label = "Observed";
    colourClass = "text-green-700";
  } else if (observed === false) {
    icon = "✗";
    label = "Not observed";
    colourClass = "text-red-600";
  } else {
    icon = "?";
    label = "Uncertain";
    colourClass = "text-amber-600";
  }

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-800">{comp.name}</span>
      <span className={`text-xs font-medium flex items-center gap-1 ${colourClass}`}>
        <span>{icon}</span>
        {label}
      </span>
    </div>
  );
}

export default function CheckCard({ check }: CheckCardProps) {
  const title = CHECK_TITLES[check.check_key] ?? check.check_key;
  const icon = CHECK_ICONS[check.check_key] ?? "📋";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        </div>
        <VerdictBadge verdict={check.verdict} size="md" />
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Confidence */}
        <div>
          <div className="text-xs text-gray-500 mb-1.5">Confidence</div>
          <ConfidenceMeter value={check.confidence} />
        </div>

        {/* Condition-specific: grade & observed_state */}
        {check.check_key === "condition" && (check.grade || check.observed_state) && (
          <div className="grid grid-cols-2 gap-3">
            {check.grade && (
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-blue-500 font-semibold mb-0.5">
                  Condition Grade
                </div>
                <div className="text-sm font-semibold text-blue-900">{check.grade}</div>
              </div>
            )}
            {check.observed_state && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">
                  Observed State
                </div>
                <div className="text-sm font-medium text-gray-700">
                  {check.observed_state.replace(/_/g, " ")}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completeness-specific: components table */}
        {check.check_key === "completeness" && check.components && check.components.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-2">Components</div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-3 bg-gray-50 border-b border-gray-200">
                {check.components.map((comp) => (
                  <ComponentRow key={comp.name} comp={comp} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Observations (detail text) */}
        {check.detail && (
          <div>
            <div className="text-xs text-gray-500 mb-1.5">Observations</div>
            <p className="text-sm text-gray-700 leading-relaxed">{check.detail}</p>
          </div>
        )}

        {/* Evidence references */}
        {check.evidence_refs.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">Evidence:</span>
            {check.evidence_refs.map((ref) => (
              <span
                key={ref}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200"
              >
                {ref}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
