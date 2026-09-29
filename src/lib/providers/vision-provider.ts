/**
 * vision-provider.ts
 *
 * VisionProvider interface — only GeminiProvider is implemented.
 * The interface exists for clean architecture only; no second provider is built.
 */

import type { InspectionInput, InspectionObservation } from "@/lib/schemas";

export interface VisionProviderResult {
  observation: InspectionObservation;
  latency_ms: number;
  model_version: string;
}

export interface VisionProvider {
  inspect(input: InspectionInput): Promise<VisionProviderResult>;
}
