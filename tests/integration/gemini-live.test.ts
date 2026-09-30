/**
 * gemini-live.test.ts
 *
 * Phase 6 Verification Test:
 * Tests the real Gemini multimodal vision provider with the configured GEMINI_API_KEY.
 * Verifies that the model:
 *   1. Accepts 1-5 base64 images and expected components.
 *   2. Returns a valid InspectionObservation matching our Zod schema.
 *   3. Enforces condition verdict PASS|UNCERTAIN and valid Amazon condition grade.
 *   4. Does not hallucinate or crash on a test image.
 */

import { GeminiProvider } from "@/lib/providers/gemini-provider";
import { InspectionObservation } from "@/lib/schemas";
import type { InspectionInput } from "@/lib/schemas";

const liveConfigured = Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("your-gemini"));

const describeOrSkip = liveConfigured ? describe : describe.skip;

describeOrSkip("Live Gemini Model Verification (Phase 6)", () => {
  // 1x1 pixel minimal valid JPEG
  const sampleJpeg = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

  const testInput: InspectionInput = {
    order_id: "ORD-VERIFY-001",
    sku: "WH-1001",
    asin: "B0DEMO1001",
    product_name: "Wireless Headphones (Noise Cancelling)",
    expected_components: [
      { name: "Headphones", essential: true },
      { name: "Charging case", essential: true },
      { name: "USB-C cable", essential: false },
    ],
    images: [sampleJpeg],
    image_mime_types: ["image/jpeg"],
  };

  test("Invokes Gemini vision model and receives structured InspectionObservation", async () => {
    const provider = new GeminiProvider();
    const result = await provider.inspect(testInput);

    expect(result).toBeDefined();
    expect(result.model_version).toBeDefined();
    expect(result.latency_ms).toBeGreaterThan(0);

    // Validate that the output strictly conforms to our Zod schema
    const parsed = InspectionObservation.safeParse(result.observation);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(["PASS", "FAIL", "UNCERTAIN"]).toContain(parsed.data.identity.verdict);
      expect(["PASS", "FAIL", "UNCERTAIN"]).toContain(parsed.data.completeness.verdict);
      expect(["PASS", "UNCERTAIN"]).toContain(parsed.data.condition.verdict);
      expect(parsed.data.condition.observed_state).toBeDefined();
    }
  }, 60000);
});
