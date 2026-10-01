"use client";

/**
 * Screen 1 — Return Inspection Workstation
 *
 * A professional enterprise operations layout for warehouse returns processing.
 *
 * Flow:
 *  1. Operator inputs Return ID, Order ID, and SKU / ASIN.
 *  2. Operator triggers Catalogue Lookup (or presses Enter).
 *  3. System automatically retrieves product metadata, expected components (Required/Optional),
 *     and authentic Catalogue Reference standard photos.
 *  4. Operator uploads or captures Customer Return Evidence photos.
 *  5. Operator clicks "Run Inspection", executing the live Gemini multimodal pipeline.
 *  6. System validates observations, runs deterministic disposition engine, persists to Supabase,
 *     and routes to Screen 2 (Evidence & Review Workstation).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EvidenceRecord, ExpectedComponent } from "@/lib/schemas";
import PhotoCapture from "@/components/PhotoCapture";

type MimeType = "image/jpeg" | "image/png" | "image/webp";

interface ReferencePhoto {
  filename: string;
  title: string;
  base64: string;
  mimeType: MimeType;
  dataUrl: string;
}

interface ProductDetails {
  sku: string;
  asin?: string;
  product_name: string;
  category: string;
  description?: string;
  expected_components: ExpectedComponent[];
  reference_images: ReferencePhoto[];
}

export default function Screen1() {
  const router = useRouter();

  // Return & Order Identification
  const [returnId, setReturnId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [lookupQuery, setLookupQuery] = useState("");

  // Product Catalogue State
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductDetails | null>(null);

  // Return Evidence Photos State (Uploaded by Operator)
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [returnMimeTypes, setReturnMimeTypes] = useState<MimeType[]>([]);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Catalogue Lookup ────────────────────────────────────────────────────────
  async function handleLookup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const query = lookupQuery.trim();
    if (!query) {
      setLookupError("Please enter a SKU or ASIN to search catalogue.");
      return;
    }

    setLookingUp(true);
    setLookupError(null);
    setFormErrors((prev) => ({ ...prev, sku: "" }));

    try {
      // Try SKU first, fallback to ASIN
      const res = await fetch(`/api/catalogue?sku=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
        return;
      }

      // If SKU lookup returned 404, check if it's an ASIN
      const asinRes = await fetch(`/api/catalogue?asin=${encodeURIComponent(query)}`);
      if (asinRes.ok) {
        const data = await asinRes.json();
        setProduct(data);
        return;
      }

      const errData = await res.json();
      setProduct(null);
      setLookupError(errData.error || `No product found matching identifier '${query}'.`);
    } catch {
      setLookupError("Catalogue lookup failed. Please verify network connection.");
      setProduct(null);
    } finally {
      setLookingUp(false);
    }
  }

  // ── Form Validation ─────────────────────────────────────────────────────────
  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!returnId.trim()) errors.returnId = "Return ID is required";
    if (!orderId.trim()) errors.orderId = "Order ID is required";
    if (!product) errors.sku = "Product must be looked up in catalogue before inspection";
    if (returnImages.length === 0) errors.images = "At least 1 customer return photo is required";
    if (returnImages.length > 5) errors.images = "Maximum 5 return photos allowed";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Run Inspection Submission ───────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;
    if (!product) return;

    setSubmitting(true);

    try {
      // Prepare payload: send customer return evidence photos.
      // Omit bulky reference images from the HTTP body so the request stays lightweight (<1MB)
      // and safely under Vercel's 4.5MB serverless limit.
      // The server inspect-service will automatically load catalogue reference standards.
      const payload = {
        order_id: orderId.trim(),
        sku: product.sku,
        asin: product.asin || undefined,
        product_name: product.product_name,
        expected_components: product.expected_components,
        images: returnImages,
        image_mime_types: returnMimeTypes,
      };

      const res = await fetch("/api/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        if (res.status === 413) {
          setApiError("Upload payload exceeds Vercel request limit (4.5MB). Please upload fewer or smaller photos.");
          return;
        }
        setApiError(`Server error (${res.status}): ${res.statusText || "Unexpected response"}`);
        return;
      }

      if (res.status === 413) {
        setApiError("Upload payload exceeds Vercel request limit (4.5MB). Please upload fewer or smaller photos.");
        return;
      }

      if (res.status === 400) {
        setApiError(data.error ?? "Invalid inspection request. Check your inputs.");
        return;
      }

      if (res.status === 500) {
        setApiError(data.error ?? "Server error. Please try again.");
        return;
      }

      const record = data.record as EvidenceRecord;
      const persistenceWarning = res.status === 207 ? (data.warning as string) : null;

      // Safely store in sessionStorage for fast Screen 2 load
      try {
        // Clear previous inspection data to avoid exceeding the browser 5MB quota
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith("inspection:")) {
            sessionStorage.removeItem(key);
          }
        }

        sessionStorage.setItem(`inspection:${record.record_id}`, JSON.stringify(record));
        if (persistenceWarning) {
          sessionStorage.setItem(`inspection:${record.record_id}:warning`, persistenceWarning);
        }
        sessionStorage.setItem(
          `inspection:${record.record_id}:return_data_urls`,
          JSON.stringify(
            returnImages.map((b64, i) => `data:${returnMimeTypes[i] || "image/jpeg"};base64,${b64}`)
          )
        );
        if (product.reference_images && product.reference_images.length > 0) {
          sessionStorage.setItem(
            `inspection:${record.record_id}:reference_photos`,
            JSON.stringify(product.reference_images)
          );
        }
      } catch (storageErr) {
        console.warn("sessionStorage quota limit reached; Screen 2 will fetch record from API:", storageErr);
      }

      router.push(`/results/${record.record_id}`);
    } catch (err) {
      console.error("Inspection request failed:", err);
      setApiError(err instanceof Error ? err.message : "Inspection service request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const orgId = process.env.NEXT_PUBLIC_ORG_ID ?? "org_demo_alpha";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Workstation Top Header ────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Return Inspection Workstation
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Live Terminal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Multimodal returns verification, component completeness auditing & deterministic disposition routing.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg">
          <div>
            <span className="font-semibold text-slate-700">Organisation:</span> Apex Global Logistics
          </div>
          <div className="h-3 w-px bg-slate-200" />
          <div>
            <span className="font-semibold text-slate-700">Station:</span> WS-RETURN-04
          </div>
          <div className="h-3 w-px bg-slate-200" />
          <div>
            <span className="font-semibold text-slate-700">Operator:</span> Ayush Kumar (Lead Inspector)
          </div>
        </div>
      </header>

      {/* ── Form Container ────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* ── Section 1: Identification & Catalogue Lookup ─────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              1. Return & Product Identification
            </h2>
            <span className="text-xs text-slate-400">Step 1 of 2</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Return ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={returnId}
                onChange={(e) => setReturnId(e.target.value)}
                placeholder="e.g. RTN-2026-00981"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                  formErrors.returnId ? "border-red-400" : "border-slate-300"
                }`}
              />
              {formErrors.returnId && (
                <p className="text-xs text-red-500 mt-1">{formErrors.returnId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Order ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. ORD-2026-09-00821"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                  formErrors.orderId ? "border-red-400" : "border-slate-300"
                }`}
              />
              {formErrors.orderId && (
                <p className="text-xs text-red-500 mt-1">{formErrors.orderId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SKU / ASIN Lookup <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLookup();
                    }
                  }}
                  placeholder="Enter SKU (e.g. WH-1001) or ASIN"
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                    formErrors.sku ? "border-red-400" : product ? "border-emerald-400" : "border-slate-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleLookup()}
                  disabled={lookingUp}
                  className="px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors shrink-0 shadow-sm"
                >
                  {lookingUp ? "Fetching Standards…" : "Fetch Standards"}
                </button>
              </div>
              {formErrors.sku && (
                <p className="text-xs text-red-500 mt-1">{formErrors.sku}</p>
              )}
              {lookupError && (
                <p className="text-xs text-red-600 mt-1 font-medium">{lookupError}</p>
              )}
              {product && !lookupError && (
                <p className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
                  ✓ Standards loaded from catalogue — {product.category}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 2: Split Workstation View (Catalogue Reference vs Return Evidence) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left Column: Catalogue Standard & Expected Components (7 cols) ── */}
          <div className="lg:col-span-7 space-y-6">
            {/* Product Metadata & Expected Components Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  Catalogue Reference Standard
                </h2>
                {product && (
                  <span className="text-xs font-mono text-slate-500">
                    SKU: {product.sku} {product.asin ? `· ASIN: ${product.asin}` : ""}
                  </span>
                )}
              </div>

              {product ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{product.product_name}</h3>
                    {product.description && (
                      <p className="text-xs text-slate-600 mt-1">{product.description}</p>
                    )}
                  </div>

                  {/* Expected Components List */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Expected Components Checklist
                    </h4>
                    <div className="space-y-1.5">
                      {product.expected_components.map((c) => (
                        <div
                          key={c.name}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                        >
                          <span className="font-medium text-slate-800 flex items-center gap-2">
                            <span className="text-slate-400">▫</span> {c.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${
                              c.essential
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {c.essential ? "Essential / Required" : "Optional Accessory"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-sm font-medium">No product loaded.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter a SKU (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded">WH-1001</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">DEMO-LAPTOP-001</code>, or <code className="bg-slate-100 px-1 py-0.5 rounded">SKU-CABLE-USBC</code>) above and click <strong>Fetch Standards</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Reference Photos Gallery */}
            {product && product.reference_images && product.reference_images.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Authentic Catalogue Reference Photos
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pristine reference standards for physical identity, connector shapes, and complete bundle layout.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {product.reference_images.length} Reference Standards
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {product.reference_images.map((ref, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex flex-col"
                    >
                      <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                        <img
                          src={ref.dataUrl}
                          alt={ref.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                          REF #{idx + 1}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-800">{ref.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{ref.filename}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column: Customer Return Evidence Upload (5 cols) ────────── */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Customer Return Evidence
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Photographs of the actual physical package and items received.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  {returnImages.length} of 5 photos
                </span>
              </div>

              {/* PhotoCapture Component */}
              <PhotoCapture
                images={returnImages}
                mimeTypes={returnMimeTypes}
                onChange={(imgs, mimes) => {
                  setReturnImages(imgs);
                  setReturnMimeTypes(mimes);
                  if (formErrors.images) {
                    setFormErrors((prev) => ({ ...prev, images: "" }));
                  }
                }}
                maxPhotos={5}
              />
              {formErrors.images && (
                <p className="text-xs text-red-500 mt-2 font-medium">{formErrors.images}</p>
              )}

              {/* Standardized Operator Photo Guidelines */}
              <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="text-blue-600">📷</span> Standard Photo Capture Guidelines:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="font-semibold text-slate-800">1. Overall View:</span>
                    <p className="text-slate-500 mt-0.5">Wide shot of returned product, retail packaging, and outer condition.</p>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="font-semibold text-slate-800">2. Accessory Flat-Lay:</span>
                    <p className="text-slate-500 mt-0.5">All cables, manuals, and adapters separated and laid flat against contrasting surface.</p>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="font-semibold text-slate-800">3. ID / Model Close-Up:</span>
                    <p className="text-slate-500 mt-0.5">Macro shot of barcode, serial number, model stamp, or regulatory badge.</p>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="font-semibold text-slate-800">4. Damage / Wear Close-Up:</span>
                    <p className="text-slate-500 mt-0.5">Close-up of any blemishes, scratches, dents, cracks, or confirmation of pristine state.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── API / Submission Error ────────────────────────────────────────── */}
        {apiError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex gap-3 items-start">
              <span className="text-red-500 text-lg leading-none">⚠</span>
              <div>
                <p className="font-semibold text-red-800 text-sm">Inspection Request Failed</p>
                <p className="text-xs text-red-700 mt-0.5">{apiError}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Bottom Workstation Action Bar ─────────────────────────────────── */}
        <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${product ? "bg-emerald-400" : "bg-slate-500"}`} />
              <span>
                {product
                  ? `Product: ${product.product_name} (${product.expected_components.length} components)`
                  : "Catalogue lookup pending"}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Evidence: {returnImages.length} return photo{returnImages.length !== 1 ? "s" : ""} uploaded
              {product?.reference_images ? ` · ${product.reference_images.length} reference standards attached` : ""}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !product || returnImages.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow transition-colors"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing Live Multimodal Inspection…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                RUN INSPECTION
              </>
            )}
          </button>
        </div>

        {submitting && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 animate-spin text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-blue-900">Running Live Multimodal Inspection</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Gemini is evaluating Identity, Completeness, and Condition against catalogue standards. This takes ~5–10 seconds.
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
