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

Report: verdict, confidence, grade (if PASS), observed_state, observation strings, evidence image labels.

=== VISIBLE IDENTIFIERS ===
If a model number, SKU, ASIN, serial number, or product label is CLEARLY READABLE in any photo, report it.
Do NOT report partially visible or guessed identifiers.

=== CRITICAL RULES ===
1. Each check is INDEPENDENT. A damaged item can still have PASS identity. A wrong product can still have an assessable condition.
2. If evidence is insufficient for any check, return UNCERTAIN — never guess or infer what you cannot see.
3. Never output a disposition (restock/refurbish/liquidate/dispose). That is not your job.
4. Never decide whether a component is "essential". Report only what you observe.
5. Never add fields not in the schema below.
6. Return ONLY valid JSON. No commentary, no markdown, no explanation outside the JSON.`;

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

    // Build parts: context text + image parts
    const parts: Part[] = [
      {
        text: `Return inspection context:\n${JSON.stringify(contextPayload, null, 2)}\n\nAnalyze the attached photos and return your inspection results as JSON.`,
      },
      ...input.images.map((base64, i) => ({
        inlineData: {
          mimeType: input.image_mime_types[i],
          data: base64,
        },
      })),
    ];

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

    // Single call — measure latency
    const result = await model.generateContent(request);
    const latency_ms = Date.now() - startTime;

    const rawText = result.response.text();

    // Parse JSON — throws if malformed (caller handles fail-open)
    const rawJson = JSON.parse(rawText);

    // Validate against InspectionObservation schema — throws ZodError if invalid
    const observation = InspectionObservation.parse(rawJson);

    return {
      observation,
      latency_ms,
      model_version: this.modelId,
    };
  }
}
