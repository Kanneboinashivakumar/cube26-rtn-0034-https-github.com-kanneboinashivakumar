import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("case_id");

    const demoJsonPath = path.join(process.cwd(), "evaluation", "fixtures", "demo", "demo-cases.json");
    if (!fs.existsSync(demoJsonPath)) {
      return NextResponse.json({ error: "Demo cases metadata not found" }, { status: 404 });
    }

    const demoCasesData = JSON.parse(fs.readFileSync(demoJsonPath, "utf-8"));

    if (caseId) {
      const foundCase = demoCasesData.cases.find(
        (c: { case_id: string }) => c.case_id.toLowerCase() === caseId.toLowerCase()
      );
      if (!foundCase) {
        return NextResponse.json({ error: `Case ${caseId} not found` }, { status: 404 });
      }

      const demoBaseDir = path.join(process.cwd(), "evaluation", "fixtures", "demo");

      // Read reference images as base64 data URLs
      const refImages = foundCase.reference_images.map((relPath: string) => {
        const subPath = relPath.replace(/^evaluation\/fixtures\/demo\//, "");
        const fullPath = path.join(demoBaseDir, subPath);
        const buffer = fs.readFileSync(fullPath);
        const filename = path.basename(relPath);
        const dataUrl = `data:image/jpeg;base64,${buffer.toString("base64")}`;
        return {
          filename,
          title: filename.replace(".jpg", "").replace(/_/g, " "),
          dataUrl,
        };
      });

      // Read return images as raw base64 and data URLs
      const retImages = foundCase.return_images.map((relPath: string) => {
        const subPath = relPath.replace(/^evaluation\/fixtures\/demo\//, "");
        const fullPath = path.join(demoBaseDir, subPath);
        const buffer = fs.readFileSync(fullPath);
        const filename = path.basename(relPath);
        const base64 = buffer.toString("base64");
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        return {
          filename,
          title: filename.replace(".jpg", "").replace(/_/g, " "),
          base64,
          mimeType: "image/jpeg" as const,
          dataUrl,
        };
      });

      return NextResponse.json({
        case_id: foundCase.case_id,
        sku: foundCase.sku,
        product: foundCase.product,
        product_description: foundCase.product_description,
        scenario: foundCase.scenario,
        controlled_change: foundCase.controlled_change,
        expected_components: foundCase.expected_components,
        expected_identity: foundCase.expected_identity,
        expected_completeness: foundCase.expected_completeness,
        expected_condition: foundCase.expected_condition,
        expected_condition_grade: foundCase.expected_condition_grade,
        expected_disposition: foundCase.expected_disposition,
        evidence_notes: foundCase.evidence_notes,
        reference_images: refImages,
        return_images: retImages,
      });
    }

    // List summary of all cases
    return NextResponse.json({
      cases: demoCasesData.cases.map((c: { case_id: string; sku: string; product: string; scenario: string }) => ({
        case_id: c.case_id,
        sku: c.sku,
        product: c.product,
        scenario: c.scenario,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
