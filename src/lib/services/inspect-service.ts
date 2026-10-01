/**
 * inspect-service.ts
 *
 * Core inspection logic — called by the API route and directly in integration tests.
 * Routes stay thin (HTTP only); all business logic lives here.
 *
 * Fail-open contract:
 *  - Gemini failure (timeout / invalid JSON / Zod rejection)  → failure record, status=failed
 *  - Persistence failure                                      → return evidence record + persistenceFailed flag
 *  In neither case is the input silently discarded.
 */

import { GeminiProvider } from "@/lib/providers/gemini-provider";
import { evaluate } from "@/lib/disposition-engine";
import { buildEvidenceRecord, buildFailureRecord } from "@/lib/evidence-builder";
import { insertInspection } from "@/lib/supabase/queries";
import { InspectionInput } from "@/lib/schemas";
import type { EvidenceRecord } from "@/lib/schemas";
import { lookupBySku } from "@/lib/catalogue";
import fs from "fs";
import path from "path";

export interface InspectServiceResult {
  record: EvidenceRecord;
  persistenceFailed: boolean;
  persistenceError?: string;
}

export async function runInspection(
  rawInput: unknown,
  organizationId: string,
  clientId: string,
  operatorLabel: string
): Promise<InspectServiceResult> {
  // 1. Validate input
  const input = InspectionInput.parse(rawInput); // throws ZodError on bad input

  // If client omitted reference images to prevent exceeding Vercel's 4.5MB request limit,
  // load authentic catalogue reference images directly from the local static assets.
  if ((!input.reference_images || input.reference_images.length === 0) && input.sku) {
    const cat = lookupBySku(input.sku);
    if (cat && cat.reference_images && cat.reference_images.length > 0) {
      const serverRefImages: string[] = [];
      const serverRefMimes: ("image/jpeg" | "image/png" | "image/webp")[] = [];
      for (const relPath of cat.reference_images) {
        const cleanRel = relPath.replace(/^\/+/, "");
        const pubPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", cleanRel);
        const rootPath = path.join(/*turbopackIgnore: true*/ process.cwd(), cleanRel);
        const targetPath = fs.existsSync(pubPath) ? pubPath : fs.existsSync(rootPath) ? rootPath : null;
        if (targetPath) {
          try {
            serverRefImages.push(fs.readFileSync(targetPath).toString("base64"));
            serverRefMimes.push("image/jpeg");
          } catch {}
        }
      }
      if (serverRefImages.length > 0) {
        input.reference_images = serverRefImages;
        input.reference_image_mime_types = serverRefMimes;
      }
    }
  }

  // 2. Call Gemini (single multimodal call)
  let geminiResult: Awaited<ReturnType<GeminiProvider["inspect"]>>;
  try {
    const provider = new GeminiProvider();
    geminiResult = await provider.inspect(input);
  } catch (err) {
    // Fail-open: Gemini unavailable / malformed output → failure record
    const errorDetail =
      err instanceof Error ? err.message : "Unknown AI provider error";

    const failureRecord = buildFailureRecord({
      input,
      organization_id: organizationId,
      client_id: clientId,
      operator_label: operatorLabel,
      error_detail: errorDetail,
    });

    // Attempt persistence — non-fatal if it also fails
    let persistenceFailed = false;
    let persistenceError: string | undefined;
    try {
      await insertInspection(failureRecord);
    } catch (dbErr) {
      persistenceFailed = true;
      persistenceError =
        dbErr instanceof Error ? dbErr.message : "Unknown persistence error";
    }

    return { record: failureRecord, persistenceFailed, persistenceError };
  }

  // 3. Run deterministic disposition engine
  const dispositionResult = evaluate(
    geminiResult.observation,
    input.expected_components
  );

  // 4. Build the official evidence record
  const record = buildEvidenceRecord({
    input,
    observation: geminiResult.observation,
    dispositionResult,
    latency_ms: geminiResult.latency_ms,
    model_version: geminiResult.model_version,
    organization_id: organizationId,
    client_id: clientId,
    operator_label: operatorLabel,
  });

  // 5. Persist — surface failure to caller without discarding result
  let persistenceFailed = false;
  let persistenceError: string | undefined;
  try {
    await insertInspection(record);
  } catch (dbErr) {
    persistenceFailed = true;
    persistenceError =
      dbErr instanceof Error ? dbErr.message : "Unknown persistence error";
  }

  return { record, persistenceFailed, persistenceError };
}
