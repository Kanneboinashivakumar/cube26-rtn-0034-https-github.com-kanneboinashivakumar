"use client";

/**
 * Screen 1 — Returns Inspection
 *
 * The operator fills in return information, views expected components from the
 * catalogue (read-only), captures/uploads 1–5 photos, and submits for inspection.
 *
 * Includes Demo Fixture Quick-Select for:
 *   - CASE-01 — Laptop / Missing Charger
 *   - CASE-02 — Headphones / Physical Damage
 *   - CASE-03 — USB-C Cable / Wrong Product
 *
 * On success → navigate to /results/[record_id] with the record stored in
 * sessionStorage (so Screen 2 does not need a separate API call when offline).
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { EvidenceRecord, ExpectedComponent } from "@/lib/schemas";
import PhotoCapture from "@/components/PhotoCapture";
import catalogData from "@/data/demo-catalog.json";

type MimeType = "image/jpeg" | "image/png" | "image/webp";

interface CatalogEntry {
  sku: string;
  asin?: string;
  product_name: string;
  category: string;
  expected_components: ExpectedComponent[];
}

interface ReferenceImage {
  filename: string;
  title: string;
  dataUrl: string;
}

const CATALOG = catalogData as CatalogEntry[];

function lookupBySku(sku: string): CatalogEntry | null {
  return CATALOG.find((e) => e.sku.toLowerCase() === sku.trim().toLowerCase()) ?? null;
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Input field ───────────────────────────────────────────────────────────────
function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function Screen1() {
  const router = useRouter();

  // Form state
  const [orderId, setOrderId] = useState("");
  const [sku, setSku] = useState("");
  const [asin, setAsin] = useState("");
  const [productName, setProductName] = useState("");
  const [catalogEntry, setCatalogEntry] = useState<CatalogEntry | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [mimeTypes, setMimeTypes] = useState<MimeType[]>([]);

  // Demo fixtures state
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [loadingDemoCase, setLoadingDemoCase] = useState(false);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [demoScenario, setDemoScenario] = useState<{
    scenario: string;
    controlled_change: string;
  } | null>(null);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Auto-fill from catalogue when SKU is entered
  useEffect(() => {
    const entry = lookupBySku(sku);
    if (entry) {
      setCatalogEntry(entry);
      setProductName(entry.product_name);
      setAsin(entry.asin ?? "");
    } else {
      setCatalogEntry(null);
    }
  }, [sku]);

  // ── Load Demo Case ──────────────────────────────────────────────────────────
  async function loadDemoCase(caseId: string) {
    if (loadingDemoCase) return;
    setLoadingDemoCase(true);
    setApiError(null);
    setFormErrors({});

    try {
      const res = await fetch(`/api/demo-cases?case_id=${caseId}`);
      if (!res.ok) {
        throw new Error(`Failed to load demo case: HTTP ${res.status}`);
      }
      const data = await res.json();

      setSelectedCaseId(caseId);
      setOrderId(`DEMO-ORD-${caseId}`);
      setSku(data.sku);
      setProductName(data.product);

      // Match catalogue entry
      const entry = lookupBySku(data.sku);
      if (entry) {
        setCatalogEntry(entry);
        setAsin(entry.asin ?? "");
      } else {
        setCatalogEntry({
          sku: data.sku,
          product_name: data.product,
          category: "General",
          expected_components: data.expected_components,
        });
      }

      // Load reference photos
      setReferenceImages(data.reference_images || []);

      // Load return photos directly into PhotoCapture state
      const retImgs = (data.return_images || []).map((img: { base64: string }) => img.base64);
      const retMimes = (data.return_images || []).map(
        (img: { mimeType: MimeType }) => img.mimeType || "image/jpeg"
      );
      setImages(retImgs);
      setMimeTypes(retMimes);

      setDemoScenario({
        scenario: data.scenario,
        controlled_change: data.controlled_change,
      });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to load demo case");
    } finally {
      setLoadingDemoCase(false);
    }
  }

  function clearDemoSelection() {
    setSelectedCaseId(null);
    setOrderId("");
    setSku("");
    setAsin("");
    setProductName("");
    setCatalogEntry(null);
    setImages([]);
    setMimeTypes([]);
    setReferenceImages([]);
    setDemoScenario(null);
    setFormErrors({});
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!orderId.trim()) errors.orderId = "Order ID is required";
    if (!sku.trim()) errors.sku = "SKU is required";
    if (!productName.trim()) errors.productName = "Product name is required";
    if (!catalogEntry) errors.sku = "SKU not found in catalogue";
    if (images.length === 0) errors.images = "At least 1 photo is required";
    if (images.length > 5) errors.images = "Maximum 5 photos allowed";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;
    if (!catalogEntry) return;

    setSubmitting(true);

    try {
      const payload = {
        order_id: orderId.trim(),
        sku: sku.trim(),
        asin: asin.trim() || undefined,
        product_name: productName.trim(),
        expected_components: catalogEntry.expected_components,
        images,
        image_mime_types: mimeTypes,
      };

      const res = await fetch("/api/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 400) {
        setApiError(data.error ?? "Invalid inspection request. Check your inputs.");
        return;
      }

      if (res.status === 500) {
        setApiError(data.error ?? "Server error. Please try again.");
        return;
      }

      // 200 or 207 (persistence partial failure) — both have a record to display
      const record = data.record as EvidenceRecord;
      const persistenceWarning = res.status === 207 ? (data.warning as string) : null;

      // Store in sessionStorage so Screen 2 can read without another API call
      sessionStorage.setItem(`inspection:${record.record_id}`, JSON.stringify(record));
      if (persistenceWarning) {
        sessionStorage.setItem(`inspection:${record.record_id}:warning`, persistenceWarning);
      }

      router.push(`/results/${record.record_id}`);
    } catch {
      setApiError("Network error — could not reach the inspection API. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  const orgId = process.env.NEXT_PUBLIC_ORG_ID ?? "org_demo_alpha";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Returns Inspection</h1>
        <p className="text-sm text-gray-500 mt-1">
          Select a realistic demo return case below, or fill in return information manually.
        </p>
      </div>

      {/* ── Demo Return Selection ─────────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Demo Return Cases
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select one of the three realistic demo fixtures to load reference and return evidence:
            </p>
          </div>
          {selectedCaseId && (
            <button
              type="button"
              onClick={clearDemoSelection}
              className="text-xs text-slate-600 hover:text-red-600 font-medium underline self-start sm:self-center"
            >
              Reset to Blank
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => loadDemoCase("CASE-01")}
            disabled={loadingDemoCase}
            className={`text-left p-3 rounded-lg border text-xs transition-all ${
              selectedCaseId === "CASE-01"
                ? "bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-500"
                : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
            }`}
          >
            <div className="font-semibold text-slate-900 flex items-center justify-between">
              <span>CASE-01</span>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                Missing Part
              </span>
            </div>
            <div className="text-slate-700 font-medium mt-1">15-inch Laptop</div>
            <div className="text-slate-500 text-[11px] mt-0.5">Missing AC Power Charger</div>
          </button>

          <button
            type="button"
            onClick={() => loadDemoCase("CASE-02")}
            disabled={loadingDemoCase}
            className={`text-left p-3 rounded-lg border text-xs transition-all ${
              selectedCaseId === "CASE-02"
                ? "bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-500"
                : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
            }`}
          >
            <div className="font-semibold text-slate-900 flex items-center justify-between">
              <span>CASE-02</span>
              <span className="text-[10px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                Damaged
              </span>
            </div>
            <div className="text-slate-700 font-medium mt-1">Wireless Headphones</div>
            <div className="text-slate-500 text-[11px] mt-0.5">Cracked Headband / Hinge</div>
          </button>

          <button
            type="button"
            onClick={() => loadDemoCase("CASE-03")}
            disabled={loadingDemoCase}
            className={`text-left p-3 rounded-lg border text-xs transition-all ${
              selectedCaseId === "CASE-03"
                ? "bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-500"
                : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
            }`}
          >
            <div className="font-semibold text-slate-900 flex items-center justify-between">
              <span>CASE-03</span>
              <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                Wrong Item
              </span>
            </div>
            <div className="text-slate-700 font-medium mt-1">USB-C Cable (2m)</div>
            <div className="text-slate-500 text-[11px] mt-0.5">Lightning Cable Returned</div>
          </button>
        </div>

        {demoScenario && (
          <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs">
            <div className="text-slate-700">
              <span className="font-semibold text-slate-900">Scenario:</span> {demoScenario.scenario}
            </div>
            <div className="text-slate-600 mt-1">
              <span className="font-semibold text-slate-900">Controlled Change:</span>{" "}
              {demoScenario.controlled_change}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* ── Section A: Return Information ─────────────────────────────── */}
        <Section
          title="Return Information"
          subtitle={`Organisation: ${orgId}`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Order ID" required>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. ORD-2026-09-001"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.orderId ? "border-red-400" : "border-gray-300"
                }`}
              />
              {formErrors.orderId && (
                <p className="text-xs text-red-500 mt-1">{formErrors.orderId}</p>
              )}
            </Field>

            <Field
              label="SKU"
              required
              hint="Enter a SKU to auto-populate from the catalogue"
            >
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. WH-1001"
                list="sku-list"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.sku ? "border-red-400" : catalogEntry ? "border-green-400" : "border-gray-300"
                }`}
              />
              <datalist id="sku-list">
                {CATALOG.map((e) => (
                  <option key={e.sku} value={e.sku}>
                    {e.product_name}
                  </option>
                ))}
              </datalist>
              {formErrors.sku && (
                <p className="text-xs text-red-500 mt-1">{formErrors.sku}</p>
              )}
              {catalogEntry && !formErrors.sku && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Found in catalogue — {catalogEntry.category}
                </p>
              )}
            </Field>

            <Field label="ASIN" hint="Optional — auto-filled from catalogue">
              <input
                type="text"
                value={asin}
                onChange={(e) => setAsin(e.target.value)}
                placeholder="e.g. B0DEMO1001"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="Product Name" required>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Auto-filled from SKU lookup"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.productName ? "border-red-400" : "border-gray-300"
                }`}
              />
              {formErrors.productName && (
                <p className="text-xs text-red-500 mt-1">{formErrors.productName}</p>
              )}
            </Field>
          </div>
        </Section>

        {/* ── Section B: Expected Components ────────────────────────────── */}
        <Section
          title="Expected Components"
          subtitle="From catalogue — display only. The required flag cannot be changed."
        >
          {catalogEntry ? (
            <div className="space-y-2">
              {catalogEntry.expected_components.map((comp) => (
                <div
                  key={comp.name}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5"
                >
                  <span className="text-sm text-gray-800">{comp.name}</span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      comp.essential
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}
                  >
                    {comp.essential ? "Required" : "Optional"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-sm">Enter a valid SKU above to see expected components.</p>
            </div>
          )}
        </Section>

        {/* ── Section C: Reference / Expected Product Photos ───────────────── */}
        {referenceImages.length > 0 && (
          <Section
            title="Reference / Expected Product Photos"
            subtitle="Catalog reference standards showing expected product and complete accessories configuration."
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {referenceImages.map((ref, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                  <div className="aspect-[4/3] bg-slate-100 relative">
                    <img
                      src={ref.dataUrl}
                      alt={ref.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 bg-blue-900/80 text-white text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded shadow">
                      Reference #{idx + 1}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-slate-800 capitalize">{ref.title}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{ref.filename}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Section D: Return Evidence Photos ───────────────────────────── */}
        <Section
          title="Return Evidence Photos"
          subtitle="1–5 photos required. Camera and file upload both feed the same evidence set."
        >
          <PhotoCapture
            images={images}
            mimeTypes={mimeTypes}
            onChange={(imgs, mimes) => {
              setImages(imgs);
              setMimeTypes(mimes);
              if (formErrors.images) {
                setFormErrors((prev) => ({ ...prev, images: "" }));
              }
            }}
            maxPhotos={5}
          />
          {formErrors.images && (
            <p className="text-sm text-red-500 mt-3 font-medium">{formErrors.images}</p>
          )}
        </Section>

        {/* ── API error ─────────────────────────────────────────────────── */}
        {apiError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <div className="flex gap-3 items-start">
              <span className="text-red-500 text-lg">⚠</span>
              <div>
                <p className="font-medium text-red-800 text-sm">Inspection failed</p>
                <p className="text-sm text-red-700 mt-0.5">{apiError}</p>
                <p className="text-xs text-red-500 mt-1">
                  Your form and photos are preserved. You can retry.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Submit ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">
            {images.length}/5 photos · {catalogEntry?.expected_components.length ?? 0} expected components
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Inspecting…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Run Inspection
              </>
            )}
          </button>
        </div>

        {submitting && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900">Analysing return evidence…</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Gemini is reviewing {images.length} photo{images.length !== 1 ? "s" : ""}. This may take 10–30 seconds.
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
