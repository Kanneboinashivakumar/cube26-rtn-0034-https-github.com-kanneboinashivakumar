/**
 * gemini-provider.ts
 *
 * GeminiProvider — the single AI provider implementation.
 *
 * Makes ONE multimodal call per inspection containing:
 *   - System instruction (inspection rules)
 *   - Order/SKU/product context (JSON text)
 *   - 1–5 images (inline base64)
 *
 * Returns a validated InspectionObservation.
 * NEVER returns a disposition. NEVER decides essentiality.
 *
 * Model is read from GEMINI_MODEL environment variable — never hardcoded.
 */

import {
  GoogleGenerativeAI,
  type GenerateContentRequest,
  type Part,
} from "@google/generative-ai";
import { InspectionObservation, type InspectionInput } from "@/lib/schemas";
import type { VisionProvider, VisionProviderResult } from "./vision-provider";

// ─── System instruction ───────────────────────────────────────────────────────
// This is the exact prompt sent to Gemini. It is versioned by the application commit.

const SYSTEM_INSTRUCTION = `You are a product return inspector. Your job is to analyze photos of a returned product and report objective observations only. You do not make business decisions.

You will receive:
1. A JSON object with order details and a list of expected components.
2. Between 1 and 5 product photographs labeled image_1, image_2, etc.

You must perform THREE independent checks and return a single structured JSON response.

=== IDENTITY CHECK ===
Determine whether the returned item matches the expected SKU/ASIN/product.
- PASS: The evidence clearly shows this is the correct product.
- FAIL: The evidence clearly shows this is a different product.
- UNCERTAIN: The available photos do not provide sufficient evidence to make a reliable determination.
Report: verdict, confidence (0.0-1.0), a list of observation strings, and which image labels you used as evidence.

=== COMPLETENESS CHECK ===
For EACH component listed in expected_components, report whether you observed it in the photos.
Use EXACTLY one of these three values per component:
  true        — component is clearly visible and present
  false       — component is clearly absent / not present
  "uncertain" — cannot determine from the available photos

Verdict rules (apply strictly):
  PASS      — every component has observed: true
  FAIL      — at least one component has observed: false (and none are "uncertain")
  UNCERTAIN — at least one component has observed: "uncertain" (regardless of others)

=== FACTORY-SEALED COMPLETENESS INFERENCE ===
If the returned product is in its original manufacturer packaging with intact factory shrinkwrap or unbroken manufacturer tamper seals (observed_state: "factory_sealed"):
- Internal packaged components (e.g. charging cases, cables, documentation) are verified complete via factory seal integrity.
- For all expected internal components, mark observed: true and note "Verified complete via intact factory seal".
- Do NOT mark internal components as "uncertain" merely because the retail box is opaque or unopened.

Report: verdict, confidence, the component list with observed values, observation strings, and evidence image labels.

=== CONDITION CHECK ===
Assess the physical condition of the returned item.
verdict:
  PASS      — sufficient evidence to assign a reliable condition grade from the fixed list below
  UNCERTAIN — evidence is insufficient to assign a reliable grade

grade (ONLY when verdict=PASS, MUST be one of these exact strings — no other values):
  "New"
  "Used - Like New"
  "Used - Very Good"
  "Used - Good"
  "Used - Acceptable"

observed_state (ALWAYS required, MUST be one of these exact strings):
  "factory_sealed"   — original packaging completely intact
  "opened_unused"    — packaging opened but item appears unused
  "signs_of_use"     — item shows normal wear from use
  "damaged"          — item has significant damage (cracks, breaks, tears)
  "empty_box"        — packaging present but item missing
  "uncertain"        — cannot determine from photos

=== CONDITION GRADING RUBRIC ===
When condition verdict is PASS, assign the grade using these strict observable boundaries:
- "New": Original manufacturer packaging is factory sealed with intact shrinkwrap or unbroken security/tamper stickers, or item is in original open box with all factory protective films/wraps intact and zero handling marks.
- "Used - Like New": Packaging has been opened, but the physical item and accessories show zero scratches, zero scuffs, zero dust, and zero cosmetic blemishes. Contacts, cables, and surfaces are pristine.
- "Used - Very Good": Minimal handling evidence only: superficial fingerprints, untied/loosely uncoiled power cables, or barely perceptible micro-scuffs. Fully functional and cosmetically clean.
- "Used - Good": Obvious signs of regular moderate use: noticeable cosmetic scuffs, faint dust or smudges on casing, water spots, or superficial rubs from normal handling. No structural cracks or deep gouges.
- "Used - Acceptable": Heavy aesthetic wear (deep scratches, chipped exterior paint, frayed outer trim/threading, faded fabric), OR physical damage (cracked screen, broken enclosure, bent pins, cut cables).
CRITICAL: If observed_state is "damaged" and verdict is PASS, you MUST explicitly set grade to "Used - Acceptable".

Report: verdict, confidence, grade (if PASS), observed_state, observation strings, evidence image labels.

=== VISIBLE IDENTIFIERS ===
If a model number, SKU, ASIN, serial number, or product label is CLEARLY READABLE in any photo, report it.
Do NOT report partially visible or guessed identifiers.

=== REQUIRED JSON RESPONSE STRUCTURE ===
Return a single JSON object with this exact shape:
{
  "identity": {
    "verdict": "PASS" | "FAIL" | "UNCERTAIN",
    "confidence": 0.0-1.0,
    "observations": ["string"],
    "evidence_refs": ["image_1"]
  },
  "completeness": {
    "verdict": "PASS" | "FAIL" | "UNCERTAIN",
    "confidence": 0.0-1.0,
    "components": [
      {
        "name": "Exact component name from expected_components",
        "observed": true | false | "uncertain"
      }
    ],
    "observations": ["string"],
    "evidence_refs": ["image_1"]
  },
  "condition": {
    "verdict": "PASS" | "UNCERTAIN",
    "confidence": 0.0-1.0,
    "grade": "New" | "Used - Like New" | "Used - Very Good" | "Used - Good" | "Used - Acceptable",
    "observed_state": "factory_sealed" | "opened_unused" | "signs_of_use" | "damaged" | "empty_box" | "uncertain",
    "observations": ["string"],
    "evidence_refs": ["image_1"]
  },
  "visible_identifiers": [
    {
      "type": "model_number",
      "value": "WH-1001",
      "image_ref": "image_1"
    }
  ]
}

Note: In "condition", include "grade" ONLY when verdict is "PASS". When verdict is "UNCERTAIN", omit the "grade" key entirely.
"visible_identifiers" should be an empty list [] if no barcodes/labels are readable.

=== CORE INSPECTION PRINCIPLES ===
1. BRAND / PRODUCT HALLUCINATION PREVENTION: Do not assume or invent a brand, manufacturer, or exact model that is not clearly visible in the physical product or packaging. Do not infer a brand from a SKU prefix, filename, surrounding text, or metadata alone.
2. CONDITION ABSTENTION: If image resolution, focus, lighting, obstruction, or other evidence limitations prevent reliable assessment of physical condition, return UNCERTAIN rather than assigning a condition grade.
3. PHYSICAL EVIDENCE PRIORITY & MERCHANDISE VERIFICATION: Prioritize visual evidence from the physical product, accessories, packaging, connectors, labels, and returned contents. If the provided evidence photos consist solely of paperwork, shipping manifests, text status cards/placards, or computer screenshots without the physical merchandise visible, you MUST report UNCERTAIN across checks (physical merchandise not presented in photo). Do not treat fixture metadata, filenames, or text placards as physical product evidence.
4. REFERENCE / RETURN DISTINCTION: Reference images show the expected product/configuration. Return images show the actual returned item. Do not confuse reference evidence with returned evidence.
5. CHECK INDEPENDENCE: Evaluate Identity, Completeness, and Condition independently. A failure or uncertainty in one check must not automatically determine another check.

=== CRITICAL RULES ===
1. Each check is INDEPENDENT. A damaged item can still have PASS identity. A wrong product can still have an assessable condition.
2. If evidence is insufficient for any check, return UNCERTAIN — never guess or infer what you cannot see.
3. Never output a disposition (restock/refurbish/liquidate/dispose). That is not your job.
4. Never decide whether a component is "essential". Report only what you observe.
5. Return ONLY the valid JSON object conforming to the structure above. No markdown fences, no text outside the JSON.`;

// ─── GeminiProvider ───────────────────────────────────────────────────────────

export class GeminiProvider implements VisionProvider {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelId: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    const modelId = process.env.GEMINI_MODEL;
    if (!modelId) {
      throw new Error(
        "GEMINI_MODEL environment variable is not set. Set it to the exact model ID (e.g. gemini-2.5-flash)."
      );
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelId = modelId;
  }

  async inspect(input: InspectionInput): Promise<VisionProviderResult> {
    const startTime = Date.now();

    // Build the context JSON sent as the first user message part
    const contextPayload = {
      order_id: input.order_id,
      sku: input.sku,
      asin: input.asin ?? null,
      product_name: input.product_name,
      // expected_components sent for context — Gemini reports observed only, never essential
      expected_components: input.expected_components.map((c) => ({
        name: c.name,
        // essential is intentionally excluded from the model context.
        // The model must NEVER know or report essentiality.
      })),
    };

    // Build parts: context text + reference images (if available) + return evidence images
    const parts: Part[] = [
      {
        text: `Return inspection context:\n${JSON.stringify(contextPayload, null, 2)}\n\nAnalyze the photos below and return your inspection results as JSON.`,
      },
    ];

    // 1. Customer return evidence images (always evaluated, labeled image_1, image_2, ...)
    parts.push({
      text: "=== CUSTOMER RETURN EVIDENCE IMAGES (Actual Returned Package & Contents) ===\nThe following photos show what the customer physically returned. They are labeled image_1, image_2, etc. Your Identity, Completeness, and Condition verdicts must be based STRICTLY on what is present or absent in these customer return photos:",
    });
    input.images.forEach((base64, i) => {
      parts.push({
        text: `[Customer Return Evidence photo: image_${i + 1}]`,
      });
      parts.push({
        inlineData: {
          mimeType: input.image_mime_types[i],
          data: base64,
        },
      });
    });

    // 2. Reference standard images from catalogue (for comparison only)
    if (input.reference_images && input.reference_images.length > 0) {
      parts.push({
        text: "=== CATALOGUE REFERENCE STANDARDS (FOR VISUAL COMPARISON ONLY) ===\nThe following reference photos show an authentic product and complete set for visual comparison only. Do NOT count components shown in these reference photos as returned — only components visible in the Customer Return Evidence photos above were returned by the customer:",
      });
      input.reference_images.forEach((base64, i) => {
        parts.push({
          text: `[Catalogue Reference Standard #${i + 1}]`,
        });
        parts.push({
          inlineData: {
            mimeType: input.reference_image_mime_types?.[i] ?? "image/jpeg",
            data: base64,
          },
        });
      });
    }

    const model = this.genAI.getGenerativeModel({
      model: this.modelId,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const request: GenerateContentRequest = {
      contents: [{ role: "user", parts }],
    };

    // Call with retry on temporary 503 / 429 spikes
    let result: Awaited<ReturnType<typeof model.generateContent>> | undefined;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await model.generateContent(request);
        break;
      } catch (err: unknown) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        const isRetryable =
          msg.includes("503") ||
          msg.includes("429") ||
          msg.includes("high demand") ||
          msg.includes("Resource has been exhausted");
        if (isRetryable && attempt < 2) {
          await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }

    if (!result) {
      throw lastErr instanceof Error ? lastErr : new Error("Failed to generate content");
    }

    const latency_ms = Date.now() - startTime;

    const rawText = result.response.text();

    // Parse JSON — throws if malformed (caller handles fail-open)
    const rawJson = JSON.parse(rawText);

    // Safeguard: Ensure observed_state="damaged" with verdict="PASS" always includes grade="Used - Acceptable"
    if (
      rawJson &&
      typeof rawJson === "object" &&
      rawJson.condition?.verdict === "PASS" &&
      rawJson.condition?.observed_state === "damaged" &&
      !rawJson.condition?.grade
    ) {
      rawJson.condition.grade = "Used - Acceptable";
    }

    // Validate against InspectionObservation schema — throws ZodError if invalid
    const observation = InspectionObservation.parse(rawJson);

    return {
      observation,
      latency_ms,
      model_version: this.modelId,
    };
  }
}
