import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { lookupBySku, lookupByAsin } from "@/lib/catalogue";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get("sku")?.trim();
    const asin = searchParams.get("asin")?.trim();

    if (!sku && !asin) {
      return NextResponse.json(
        { error: "Must provide either 'sku' or 'asin' parameter" },
        { status: 400 }
      );
    }

    const entry = sku ? lookupBySku(sku) : lookupByAsin(asin!);
    if (!entry) {
      return NextResponse.json(
        { error: `No product found in catalogue for ${sku ? `SKU '${sku}'` : `ASIN '${asin}'`}` },
        { status: 404 }
      );
    }

    // Load reference photos as base64 data URLs if configured
    const referencePhotos = (entry.reference_images || []).map((relPath, idx) => {
      const fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), relPath);
      if (fs.existsSync(fullPath)) {
        const buffer = fs.readFileSync(fullPath);
        const filename = path.basename(relPath);
        const base64 = buffer.toString("base64");
        const titles = ["Product View", "Accessories / Connectors", "Packaging & Complete Set"];
        return {
          filename,
          title: titles[idx] || `Reference #${idx + 1}`,
          base64,
          mimeType: "image/jpeg" as const,
          dataUrl: `data:image/jpeg;base64,${base64}`,
        };
      }
      return null;
    }).filter(Boolean);

    return NextResponse.json({
      sku: entry.sku,
      asin: entry.asin ?? null,
      product_name: entry.product_name,
      category: entry.category,
      description: entry.description ?? null,
      expected_components: entry.expected_components,
      reference_images: referencePhotos,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
