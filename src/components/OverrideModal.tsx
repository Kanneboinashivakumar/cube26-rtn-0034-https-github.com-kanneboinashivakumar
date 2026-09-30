"use client";

/**
 * OverrideModal.tsx
 *
 * Modal dialog for operator override.
 * Calls POST /api/override on submit.
 * Shows current AI decision; lets operator pick a new disposition + enter a reason (min 10 chars).
 */

import { useState } from "react";
import type { EvidenceRecord, Disposition } from "@/lib/schemas";
import DispositionBadge from "./DispositionBadge";

const DISPOSITIONS: Disposition[] = [
  "restock",
  "refurbish",
  "liquidate",
  "dispose",
  "pending_review",
];

const DISPOSITION_LABELS: Record<Disposition, string> = {
  restock: "Restock",
  refurbish: "Refurbish",
  liquidate: "Liquidate",
  dispose: "Dispose",
  pending_review: "Pending Review",
};

interface OverrideModalProps {
  record: EvidenceRecord;
  onClose: () => void;
  onSuccess: (updatedRecord: EvidenceRecord) => void;
}

export default function OverrideModal({
  record,
  onClose,
  onSuccess,
}: OverrideModalProps) {
  const currentDisposition = record.outcome.disposition;

  const [newDisposition, setNewDisposition] = useState<Disposition>(currentDisposition);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonValid = reason.trim().length >= 10;
  const canSubmit = reasonValid && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_id: record.record_id,
          organization_id: record.organization_id,
          operator_id: "demo_operator",
          reason: reason.trim(),
          new_disposition: newDisposition,
        }),
      });

      const data = await res.json();

      if (!res.ok && res.status !== 207) {
        setError(data.error ?? `Override failed (HTTP ${res.status})`);
        return;
      }

      onSuccess(data.record as EvidenceRecord);
    } catch {
      setError("Network error — could not reach the API.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Override Decision</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {/* Current decision */}
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
              <div className="text-xs text-gray-500 mb-1.5">Current AI Decision</div>
              <DispositionBadge disposition={currentDisposition} size="md" />
            </div>

            {/* New disposition selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Disposition
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DISPOSITIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setNewDisposition(d)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      newDisposition === d
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {DISPOSITION_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label
                htmlFor="override-reason"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Reason{" "}
                <span className="text-gray-400 font-normal">(required, min 10 characters)</span>
              </label>
              <textarea
                id="override-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe why you are overriding the AI decision…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs ${reasonValid ? "text-green-600" : "text-gray-400"}`}>
                  {reason.trim().length} / 10 min
                </span>
                {!reasonValid && reason.length > 0 && (
                  <span className="text-xs text-red-500">Too short</span>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting…
                </>
              ) : (
                "Submit Override"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
