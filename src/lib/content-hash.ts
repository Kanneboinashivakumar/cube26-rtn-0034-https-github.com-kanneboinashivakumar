/**
 * content-hash.ts
 *
 * SHA-256 hash of the canonical evidence record for tamper-evidence.
 * The hash is computed over the record with content_hash set to null,
 * so the hash field itself is not part of the hashed content.
 */

import { createHash } from "crypto";
import type { EvidenceRecord } from "@/lib/schemas";

/**
 * Compute a stable SHA-256 hash of the evidence record.
 * Keys are sorted for canonical JSON serialization.
 */
export function computeContentHash(
  record: Omit<EvidenceRecord, "content_hash">
): string {
  const canonical = canonicalJson(record);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/** Recursively sort object keys for stable serialization. */
function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (typeof value === "object") {
    const sorted = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((k) => {
        const v = (value as Record<string, unknown>)[k];
        return JSON.stringify(k) + ":" + canonicalJson(v);
      });
    return "{" + sorted.join(",") + "}";
  }
  return JSON.stringify(value);
}
