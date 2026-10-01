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
      const cleanRel = relPath.replace(/^\/+/, "");
      const publicPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", cleanRel);
      const rootPath = path.join(/*turbopackIgnore: true*/ process.cwd(), cleanRel);
      const fullPath = fs.existsSync(publicPath) ? publicPath : fs.existsSync(rootPath) ? rootPath : null;

      const filename = path.basename(relPath);
      const titles = ["Product View", "Accessories / Connectors", "Packaging & Complete Set"];
      const title = titles[idx] || `Reference #${idx + 1}`;
      const staticUrl = `/${cleanRel}`;

      if (fullPath) {
        try {
          const buffer = fs.readFileSync(fullPath);
          const base64 = buffer.toString("base64");
          return {
            filename,
            title,
            base64,
            mimeType: "image/jpeg" as const,
            dataUrl: `data:image/jpeg;base64,${base64}`,
            url: staticUrl,
          };
        } catch {
          return {
            filename,
            title,
            base64: "",
            mimeType: "image/jpeg" as const,
            dataUrl: staticUrl,
            url: staticUrl,
          };
        }
      }

      // Fallback: If not on local disk, supply static URL so the browser can load it directly
      return {
        filename,
        title,
        base64: "",
        mimeType: "image/jpeg" as const,
        dataUrl: staticUrl,
        url: staticUrl,
      };
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
