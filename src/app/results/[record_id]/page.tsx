"use client";

/**
 * Screen 2 — Inspection Results / Evidence & Review Workstation
 *
 * A high-density, professional desktop operations review workstation.
 *
 * Layout:
 *  - Left / Main Area:
 *      * Overall Disposition Banner & Status
 *      * Deterministic Rule Trace explanation
 *      * Independent AI Check Cards (Identity, Completeness, Condition Assessment)
 *      * Operational Metadata (Latency, Model, Content Hash)
 *      * Warehouse Operator Actions (Confirm / Override)
 *  - Right / Evidence Area:
 *      * Customer Return Evidence Photos (numbered image_1, image_2, ...)
 *      * Catalogue Reference Standards (authentic expected configuration)
 *      * Evidence Citations & Observations mapping
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { EvidenceRecord, Disposition } from "@/lib/schemas";
import CheckCard from "@/components/CheckCard";
import DispositionBadge from "@/components/DispositionBadge";
import RuleTracePanel from "@/components/RuleTracePanel";
import OverrideModal from "@/components/OverrideModal";

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? "org_demo_alpha";

interface ReferencePhoto {
  filename: string;
  title: string;
  dataUrl: string;
}

// ── Small metadata pair ───────────────────────────────────────────────────────
function MetaPair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{label}</dt>
      <dd className="text-xs text-slate-800 font-medium mt-0.5 font-mono">{value}</dd>
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: EvidenceRecord["status"] }) {
  const styles = {
    resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    pending_review: "bg-amber-100 text-amber-800 border-amber-200",
    failed: "bg-red-100 text-red-800 border-red-200",
  };
  const labels = {
    resolved: "Resolved / Finalized",
    pending_review: "Pending Operations Review",
    failed: "Inspection Failed",
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}
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

  // Evidence Photos State
  const [referencePhotos, setReferencePhotos] = useState<ReferencePhoto[]>([]);
  const [returnDataUrls, setReturnDataUrls] = useState<string[]>([]);

  // Override modal state
  const [overrideOpen, setOverrideOpen] = useState(false);

  // Confirm state
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // ── Load Record & Evidence ──────────────────────────────────────────────────
  useEffect(() => {
    if (!recordId) return;

    // 1. Check sessionStorage for cached EvidenceRecord
    const cached = sessionStorage.getItem(`inspection:${recordId}`);
    const warning = sessionStorage.getItem(`inspection:${recordId}:warning`);
    const cachedRefs = sessionStorage.getItem(`inspection:${recordId}:reference_photos`);
    const cachedReturns = sessionStorage.getItem(`inspection:${recordId}:return_data_urls`);

    if (cachedRefs) {
      try {
        setReferencePhotos(JSON.parse(cachedRefs));
      } catch {}
    }

    if (cachedReturns) {
      try {
        setReturnDataUrls(JSON.parse(cachedReturns));
      } catch {}
    }

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as EvidenceRecord;
        setRecord(parsed);
        if (warning) setPersistenceWarning(warning);
        setLoading(false);

        // If reference photos weren't in session, fetch from catalogue
        if (!cachedRefs && parsed.subject?.sku) {
          fetch(`/api/catalogue?sku=${encodeURIComponent(parsed.subject.sku)}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((catData) => {
              if (catData?.reference_images) setReferencePhotos(catData.reference_images);
            })
            .catch(() => {});
        }
        return;
      } catch {
        // Fall through to API fetch
      }
    }

    // 2. Fallback: fetch from API
    fetch(`/api/inspections/${recordId}?org_id=${ORG_ID}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const fetchedRecord = data.record as EvidenceRecord;
        setRecord(fetchedRecord);
        // Also load reference photos for this SKU
        if (fetchedRecord.subject?.sku) {
          fetch(`/api/catalogue?sku=${encodeURIComponent(fetchedRecord.subject.sku)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((catData) => {
              if (catData?.reference_images) setReferencePhotos(catData.reference_images);
            })
            .catch(() => {});
        }
      })
      .catch((err) =>
        setFetchError(err instanceof Error ? err.message : "Failed to load inspection record.")
      )
      .finally(() => setLoading(false));
  }, [recordId]);

  // ── Confirm Decision ────────────────────────────────────────────────────────
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
      setRecord((prev) => (prev ? { ...prev, status: "resolved" } : prev));

      if (res.status === 207) {
        setPersistenceWarning(data.warning ?? "Confirmed but could not be saved to database.");
      }
    } catch {
      setConfirmError("Network error — could not confirm the inspection.");
    } finally {
      setConfirming(false);
    }
  }

  // ── Override Success ────────────────────────────────────────────────────────
  function handleOverrideSuccess(updatedRecord: EvidenceRecord) {
    setRecord(updatedRecord);
    setOverrideOpen(false);
    sessionStorage.setItem(`inspection:${updatedRecord.record_id}`, JSON.stringify(updatedRecord));
  }

  // ── Loading & Error States ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <svg className="w-8 h-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-xs text-slate-500 font-medium">Retrieving inspection evidence record…</p>
      </div>
    );
  }

  if (fetchError || !record) {
    return (
      <div className="max-w-lg mx-auto my-16 text-center bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="text-base font-bold text-slate-900 mb-1">Inspection Record Not Found</h2>
        <p className="text-xs text-slate-600 mb-5">{fetchError ?? "Record could not be loaded."}</p>
        <button
          onClick={() => router.push("/")}
          className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
        >
          ← Return to Inspection Workstation
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
      {/* ── Override Modal ────────────────────────────────────────────────── */}
      {overrideOpen && (
        <OverrideModal
          record={record}
          onClose={() => setOverrideOpen(false)}
          onSuccess={handleOverrideSuccess}
        />
      )}

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── Top Header / Breadcrumbs ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => router.push("/")}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                ← Return to Terminal
              </button>
              <span className="text-slate-300">/</span>
              <span className="text-xs text-slate-500 font-mono">Record: {record.record_id}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Evidence & Disposition Review
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={record.status} />
          </div>
        </div>

        {/* ── Persistence Warning Banner (if any) ─────────────────────────── */}
        {persistenceWarning && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs text-amber-800">
              <span className="font-bold">⚠ Persistence Notice:</span> {persistenceWarning}{" "}
              <span className="text-amber-600">The inspection record is active in session.</span>
            </p>
          </div>
        )}

        {/* ── Failed State Notice ─────────────────────────────────────────── */}
        {inspectionFailed && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-bold text-red-800 text-xs mb-1">Multimodal Pipeline Fail-Open Active</p>
            <p className="text-xs text-red-700">
              {record.error_detail ?? "An unexpected exception occurred. Case routed to pending_review for manual processing."}
            </p>
          </div>
        )}

        {/* ── Split Layout: Left Column (Results/Rules) vs Right Column (Visual Evidence) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── Left Area: Checks, Disposition & Rules (7 cols) ─────────────── */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Final Disposition Banner */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Deterministic Business Disposition
                </span>
                {hasOverrides && (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Operator Override Active
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                <div>
                  <DispositionBadge disposition={outcome.disposition} size="lg" />
                  <p className="text-xs text-slate-500 mt-2">
                    Evaluated by ReturnOps deterministic rules engine (Policy v{outcome.policy_version}).
                  </p>
                </div>

                {/* Confirm & Override Action Buttons */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setOverrideOpen(true)}
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    Override…
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    {confirming ? (
                      "Confirming…"
                    ) : confirmed ? (
                      "✓ Confirmed"
                    ) : (
                      "Confirm Disposition"
                    )}
                  </button>
                </div>
              </div>

              {confirmError && (
                <p className="text-xs text-red-600 mt-2 font-medium">{confirmError}</p>
              )}

              {/* Override Log Note */}
              {latestOverride && (
                <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs space-y-1">
                  <div className="font-semibold text-amber-900">
                    Overridden from <span className="uppercase">{latestOverride.previous_disposition}</span> by operator {latestOverride.operator_id}
                  </div>
                  <div className="text-amber-800 italic">"{latestOverride.reason}"</div>
                </div>
              )}
            </div>

            {/* 2. Deterministic Rule Trace */}
            <RuleTracePanel rules={outcome.rule_trace} />

            {/* 3. Independent AI Check Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Multimodal Evidence Analysis (3 Independent Checks)
                </h2>
                <span className="text-[11px] text-slate-400">Zero cross-contamination</span>
              </div>

              {checks.map((chk) => (
                <CheckCard key={chk.check_key} check={chk} />
              ))}
            </div>

            {/* 4. Inspection Metadata Footer */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <MetaPair label="Order ID" value={subject.order_id} />
                <MetaPair label="SKU" value={subject.sku} />
                <MetaPair label="Latency" value={`${((latencyCheck?.latency_ms ?? 0) / 1000).toFixed(2)}s`} />
                <MetaPair label="Model" value={latencyCheck?.model_version ?? agent.name} />
              </dl>
              {record.content_hash && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 text-[10px] text-slate-400 font-mono truncate">
                  SHA-256: {record.content_hash}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Area: Visual Evidence Comparison (5 cols) ─────────────── */}
          <div className="lg:col-span-5 space-y-6">
            {/* Customer Return Evidence Photos */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Customer Return Evidence ({record.images.length} photos)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Actual photographs submitted for multimodal analysis.
                  </p>
                </div>
              </div>

              {returnDataUrls.length > 0 ? (
                <div className="space-y-3">
                  {returnDataUrls.map((url, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                      <div className="aspect-[4/3] bg-slate-100 relative">
                        <img
                          src={url}
                          alt={`Return Photo ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow">
                          image_{i + 1}
                        </span>
                      </div>
                      <div className="p-2 bg-white border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                        <span>Return Evidence Photo #{i + 1}</span>
                        <span className="font-mono text-[10px]">image_{i + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {record.images.map((imgRef, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-600 font-mono"
                    >
                      📷 {imgRef} (Submitted evidence photo #{i + 1})
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Catalogue Reference Standard Photos */}
            {referencePhotos.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      Catalogue Reference Standards ({referencePhotos.length})
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pristine reference photographs for visual comparison.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {referencePhotos.map((ref, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                      <div className="aspect-[4/3] bg-slate-100 relative">
                        <img
                          src={ref.dataUrl}
                          alt={ref.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 bg-blue-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                          REF #{idx + 1}
                        </span>
                      </div>
                      <div className="p-2 bg-white border-t border-slate-100 text-[11px]">
                        <span className="font-semibold text-slate-800">{ref.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
