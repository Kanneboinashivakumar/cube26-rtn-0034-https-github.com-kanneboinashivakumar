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

export type { CatalogueEntry };
