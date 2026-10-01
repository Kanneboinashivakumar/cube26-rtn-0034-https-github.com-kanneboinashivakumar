/**
 * catalogue.ts
 *
 * Catalogue lookup — maps a SKU to its product metadata and expected components.
 * This is the ONLY place where expected_components with essential flags originate.
 *
 * The essential flag comes from here — never from Gemini's output.
 */

import catalogData from "@/data/demo-catalog.json";
import type { ExpectedComponent } from "@/lib/schemas";

interface CatalogueEntry {
  sku: string;
  asin?: string;
  product_name: string;
  category: string;
  description?: string;
  expected_components: ExpectedComponent[];
  reference_images?: string[];
}

const catalogue = catalogData as CatalogueEntry[];

/** Look up a product by SKU. Returns null if not found. */
export function lookupBySku(sku: string): CatalogueEntry | null {
  return catalogue.find((p) => p.sku.toLowerCase() === sku.toLowerCase()) ?? null;
}

/** Look up a product by ASIN. Returns null if not found. */
export function lookupByAsin(asin: string): CatalogueEntry | null {
  return catalogue.find((p) => p.asin?.toLowerCase() === asin.toLowerCase()) ?? null;
}

/** Get all available SKUs (for UI dropdown / autocomplete). */
export function getAllSkus(): string[] {
  return catalogue.map((p) => p.sku);
}

/**
 * Resolves static customer return evidence images for demo fixtures
 * (RTN-001 laptop, RTN-002 headphones, RTN-003 USB-C cable).
 */
export function resolveReturnEvidenceUrls(
  recordId?: string,
  sku?: string,
  orderId?: string
): string[] {
  const normId = (recordId || "").toUpperCase();
  const normSku = (sku || "").toUpperCase();
  const normOrder = (orderId || "").toUpperCase();

  if (
    normId.includes("RTN-001") ||
    normSku === "DEMO-LAPTOP-001" ||
    normSku === "LAP-1501" ||
    normOrder.includes("RTN-001")
  ) {
    return [
      "/demo-data/return-evidence/RTN-001/01.jpg",
      "/demo-data/return-evidence/RTN-001/02.jpg",
      "/demo-data/return-evidence/RTN-001/03.jpg",
    ];
  }
  if (
    normId.includes("RTN-002") ||
    normSku === "WH-1001" ||
    normOrder.includes("RTN-002")
  ) {
    return [
      "/demo-data/return-evidence/RTN-002/01.jpg",
      "/demo-data/return-evidence/RTN-002/02.jpg",
      "/demo-data/return-evidence/RTN-002/03.jpg",
    ];
  }
  if (
    normId.includes("RTN-003") ||
    normSku === "SKU-CABLE-USBC" ||
    normSku === "USB-C-2001" ||
    normOrder.includes("RTN-003")
  ) {
    return [
      "/demo-data/return-evidence/RTN-003/01.jpg",
      "/demo-data/return-evidence/RTN-003/02.jpg",
      "/demo-data/return-evidence/RTN-003/03.jpg",
    ];
  }
  return [];
}

export type { CatalogueEntry };
