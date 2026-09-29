/**
 * catalogue-lookup.test.ts
 *
 * Tests for catalogue.ts — verifies SKU lookup, essential flags, and unknown SKU handling.
 * The essential flag must come ONLY from here, never from Gemini.
 */

import { lookupBySku, lookupByAsin, getAllSkus } from "@/lib/catalogue";

test("Known SKU returns product with expected components", () => {
  const product = lookupBySku("WH-1001");
  expect(product).not.toBeNull();
  expect(product?.product_name).toBe("Wireless Headphones (Noise Cancelling)");
  expect(product?.expected_components.length).toBeGreaterThan(0);
});

test("SKU lookup is case-insensitive", () => {
  expect(lookupBySku("wh-1001")).not.toBeNull();
  expect(lookupBySku("WH-1001")).not.toBeNull();
});

test("Unknown SKU returns null", () => {
  expect(lookupBySku("NOT-EXIST-SKU")).toBeNull();
});

test("Essential flags are defined correctly for WH-1001", () => {
  const product = lookupBySku("WH-1001");
  const headphones = product?.expected_components.find((c) => c.name === "Headphones");
  const cable = product?.expected_components.find((c) => c.name === "USB-C cable");
  expect(headphones?.essential).toBe(true);
  expect(cable?.essential).toBe(false);
});

test("Every component has an essential boolean (not undefined)", () => {
  const product = lookupBySku("WH-1001");
  for (const comp of product?.expected_components ?? []) {
    expect(typeof comp.essential).toBe("boolean");
  }
});

test("SKU-SERUM-30: dropper is essential, leaflet is not", () => {
  const product = lookupBySku("SKU-SERUM-30");
  expect(product).not.toBeNull();
  const dropper = product?.expected_components.find((c) => c.name === "Dropper");
  const leaflet = product?.expected_components.find((c) => c.name === "Product leaflet");
  expect(dropper?.essential).toBe(true);
  expect(leaflet?.essential).toBe(false);
});

test("lookupByAsin returns matching product", () => {
  const product = lookupByAsin("B0DEMO1001");
  expect(product).not.toBeNull();
  expect(product?.sku).toBe("WH-1001");
});

test("lookupByAsin returns null for unknown ASIN", () => {
  expect(lookupByAsin("B0NOPE0000")).toBeNull();
});

test("getAllSkus returns a non-empty list containing demo SKUs", () => {
  const skus = getAllSkus();
  expect(skus.length).toBeGreaterThan(0);
  expect(skus).toContain("WH-1001");
  expect(skus).toContain("SKU-SERUM-30");
  expect(skus).toContain("SKU-CABLE-USBC");
});
