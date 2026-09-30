"use client";

/**
 * Screen 2 — Inspection Results / Evidence & Review
 *
 * Reads the EvidenceRecord from sessionStorage (set by Screen 1 after POST /api/inspect).
 * Falls back to GET /api/inspections/[record_id] if not in sessionStorage.
 *
 * Shows all three check results, final disposition, rule trace.
 * Provides Confirm and Override actions.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { EvidenceRecord, Disposition } from "@/lib/schemas";
import CheckCard from "@/components/CheckCard";
import DispositionBadge from "@/components/DispositionBadge";
import RuleTracePanel from "@/components/RuleTracePanel";
import OverrideModal from "@/components/OverrideModal";
import VerdictBadge from "@/components/VerdictBadge";

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? "org_demo_alpha";

// ── Small metadata pair ───────────────────────────────────────────────────────
function MetaPair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{label}</dt>
      <dd className="text-sm text-gray-800 font-medium mt-0.5">{value}</dd>
    </div>
  );
}

// ── Status badge for overall inspection status ────────────────────────────────
function StatusBadge({ status }: { status: EvidenceRecord["status"] }) {
  const styles = {
    resolved: "bg-green-100 text-green-800 border-green-200",
    pending_review: "bg-amber-100 text-amber-800 border-amber-200",
    failed: "bg-red-100 text-red-800 border-red-200",
  };
  const labels = {
    resolved: "Resolved",
    pending_review: "Pending Review",
    failed: "Inspection Failed",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default function Screen2() {
  const params = useParams();
  const router = useRouter();
  const recordId = params?.record_id as string;

  const [record, setRecord] = useState<EvidenceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null);

  // Override modal state
  const [overrideOpen, setOverrideOpen] = useState(false);

  // Confirm state
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // ── Load record ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!recordId) return;

    // Try sessionStorage first (fastest, works without Supabase)
    const cached = sessionStorage.getItem(`inspection:${recordId}`);
    const warning = sessionStorage.getItem(`inspection:${recordId}:warning`);

    if (cached) {
      try {
        setRecord(JSON.parse(cached) as EvidenceRecord);
        if (warning) setPersistenceWarning(warning);
        setLoading(false);
        return;
      } catch {
        // fall through to API fetch
      }
    }

    // Fallback: fetch from API
    fetch(`/api/inspections/${recordId}?org_id=${ORG_ID}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setRecord(data.record as EvidenceRecord))
      .catch((err) =>
        setFetchError(
          err instanceof Error ? err.message : "Failed to load inspection record."
        )
      )
      .finally(() => setLoading(false));
  }, [recordId]);

  // ── Confirm ─────────────────────────────────────────────────────────────────
  async function handleConfirm() {
    if (!record) return;
    setConfirming(true);
    setConfirmError(null);

    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_id: record.record_id,
          organization_id: record.organization_id,
        }),
      });
      const data = await res.json();

      if (!res.ok && res.status !== 207) {
        setConfirmError(data.error ?? `Confirm failed (HTTP ${res.status})`);
        return;
      }

      setConfirmed(true);
      setRecord((prev) =>
        prev ? { ...prev, status: "resolved" } : prev
      );

      if (res.status === 207) {
        setPersistenceWarning(
          data.warning ?? "Confirmed but could not be saved to the database."
        );
      }
    } catch {
      setConfirmError("Network error — could not confirm the inspection.");
    } finally {
      setConfirming(false);
    }
  }

  // ── Override success ─────────────────────────────────────────────────────────
  function handleOverrideSuccess(updatedRecord: EvidenceRecord) {
    setRecord(updatedRecord);
    setOverrideOpen(false);
    // Update sessionStorage with the new record
    sessionStorage.setItem(`inspection:${updatedRecord.record_id}`, JSON.stringify(updatedRecord));
  }

  // ── Render states ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4">
        <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-gray-500">Loading inspection results…</p>
      </div>
    );
  }

  if (fetchError || !record) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Could not load inspection</h2>
        <p className="text-sm text-gray-600 mb-6">{fetchError ?? "Inspection record not found."}</p>
        <button
          onClick={() => router.push("/")}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          ← Start new inspection
        </button>
      </div>
    );
  }

  const { outcome, checks, subject, agent, overrides, status } = record;
  const latencyCheck = checks[0];
  const hasOverrides = overrides.length > 0;
  const latestOverride = hasOverrides ? overrides[overrides.length - 1] : null;
  const inspectionFailed = status === "failed";
  const canConfirm = !confirmed && status !== "failed" && !confirming;

  return (
    <>
      {/* ── Override modal ──────────────────────────────────────────────── */}
      {overrideOpen && (
        <OverrideModal
          record={record}
          onClose={() => setOverrideOpen(false)}
          onSuccess={handleOverrideSuccess}
        />
      )}

      <div className="max-w-3xl mx-auto space-y-6">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => router.push("/")}
                className="text-xs text-blue-600 hover:underline"
              >
                ← New inspection
              </button>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Inspection Results</h1>
            <p className="text-xs text-gray-500 mt-1 font-mono">{record.record_id}</p>
          </div>
          <StatusBadge status={record.status} />
        </div>

        {/* ── Persistence warning ─────────────────────────────────────────── */}
        {persistenceWarning && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">⚠ Persistence Warning:</span>{" "}
              {persistenceWarning}{" "}
              <span className="text-amber-600">This result was not durably saved.</span>
            </p>
          </div>
        )}

        {/* ── Inspection failed notice ─────────────────────────────────────── */}
        {inspectionFailed && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="font-semibold text-red-800 text-sm mb-1">AI inspection could not complete</p>
            <p className="text-sm text-red-700">
              {record.error_detail ?? "An error occurred during inspection. The case has been routed to pending review."}
            </p>
          </div>
        )}

        {/* ── Section A: Inspection Metadata ──────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Inspection Details</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <MetaPair label="Order ID" value={subject.order_id} />
            <MetaPair label="SKU" value={subject.sku} />
            {subject.asin && <MetaPair label="ASIN" value={subject.asin} />}
            <MetaPair label="Product" value={subject.product_name} />
            <MetaPair label="Organisation" value={record.organization_id} />
            <MetaPair
              label="Inspected"
              value={new Date(record.captured_at).toLocaleString()}
            />
            {latencyCheck && (
              <MetaPair
                label="Processing time"
                value={`${(latencyCheck.latency_ms / 1000).toFixed(1)}s`}
              />
            )}
            <MetaPair
              label="AI model"
              value={latencyCheck?.model_version ?? agent.name}
            />
            <MetaPair label="Policy" value={outcome.policy_version} />
          </dl>
        </div>

        {/* ── Sections B, C, D: Checks ─────────────────────────────────────── */}
        {checks.length > 0 ? (
          <>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Evidence Analysis
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {checks.map((check) => (
                <CheckCard key={check.check_key} check={check} />
              ))}
            </div>
          </>
        ) : inspectionFailed ? null : (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-8 text-center text-gray-400">
            <p className="text-sm">No check results available.</p>
          </div>
        )}

        {/* ── Section E: Final Disposition ─────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Final Disposition</h2>
            {hasOverrides && (
              <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                Operator Override Applied
              </span>
            )}
          </div>

          <DispositionBadge disposition={outcome.disposition} size="lg" />

          {/* Show original if overridden */}
          {latestOverride && (
            <div className="mt-4 rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                Override Details
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Original AI decision:</span>
                <DispositionBadge disposition={latestOverride.previous_disposition} size="sm" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Overridden to:</span>
                <DispositionBadge disposition={latestOverride.new_disposition} size="sm" />
              </div>
              <p className="text-sm text-orange-800">
                <span className="font-medium">Reason:</span> {latestOverride.reason}
              </p>
              <p className="text-xs text-orange-500">
                Overridden at {new Date(latestOverride.overridden_at).toLocaleString()} by {latestOverride.operator_id}
              </p>
            </div>
          )}

          {/* UNCERTAIN / pending notice */}
          {(outcome.disposition === "pending_review" || status === "pending_review") && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Human review required.</span>{" "}
                The AI returned uncertain results or insufficient evidence. Please examine the evidence above and use Override to set a final disposition.
              </p>
            </div>
          )}
        </div>

        {/* ── Section F: Decision Rules Applied ────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Decision Rules Applied</h2>
          <p className="text-xs text-gray-400 mb-4">
            The disposition is determined by these deterministic rules — not by the AI directly.
          </p>
          <RuleTracePanel rules={outcome.rule_trace} />
        </div>

        {/* ── Confirm / Override actions ────────────────────────────────────── */}
        {!inspectionFailed && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Operator Actions</h2>

            <div className="flex flex-wrap gap-3 items-start">
              {/* Confirm */}
              <div className="flex-1 min-w-48">
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  className={`w-full py-2.5 px-5 rounded-lg font-semibold text-sm transition-colors ${
                    confirmed
                      ? "bg-green-100 text-green-800 border border-green-300 cursor-default"
                      : "bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  {confirming ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Confirming…
                    </span>
                  ) : confirmed ? (
                    "✓ Decision Confirmed"
                  ) : (
                    "Confirm Decision"
                  )}
                </button>
                <p className="text-xs text-gray-400 mt-1.5 text-center">
                  Accept the AI-determined disposition
                </p>
                {confirmError && (
                  <p className="text-xs text-red-500 mt-1 text-center">{confirmError}</p>
                )}
              </div>

              {/* Override */}
              <div className="flex-1 min-w-48">
                <button
                  onClick={() => setOverrideOpen(true)}
                  className="w-full py-2.5 px-5 rounded-lg font-semibold text-sm bg-white text-orange-700 border border-orange-300 hover:bg-orange-50 transition-colors"
                >
                  Override Decision
                </button>
                <p className="text-xs text-gray-400 mt-1.5 text-center">
                  Change disposition with a documented reason
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Override history ─────────────────────────────────────────────── */}
        {overrides.length > 1 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Override History</h2>
            <div className="space-y-3">
              {overrides.map((ov, i) => (
                <div
                  key={ov.override_id}
                  className="rounded-lg border border-gray-200 px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-400">#{i + 1}</span>
                    <DispositionBadge disposition={ov.previous_disposition as Disposition} size="sm" />
                    <span className="text-gray-400">→</span>
                    <DispositionBadge disposition={ov.new_disposition as Disposition} size="sm" />
                  </div>
                  <p className="text-gray-700">{ov.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(ov.overridden_at).toLocaleString()} · {ov.operator_id}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer nav ─────────────────────────────────────────────────── */}
        <div className="pb-8 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Start another inspection
          </button>
        </div>
      </div>
    </>
  );
}
