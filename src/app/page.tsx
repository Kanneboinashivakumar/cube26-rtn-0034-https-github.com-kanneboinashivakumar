"use client";

/**
 * Screen 1 — Returns Inspection
 *
 * The operator fills in return information, views expected components from the
 * catalogue (read-only), captures/uploads 1–5 photos, and submits for inspection.
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
          Complete all sections, then run inspection. Gemini will analyse the evidence.
        </p>
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

        {/* ── Section C: Return Evidence ─────────────────────────────────── */}
        <Section
          title="Return Evidence"
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
