import type { NormalizedSearchParams, SearchIntent } from "../taxonomy.js";
import { build as buildFinnNo } from "./finn-no.js";
import { build as buildZillow } from "./zillow-com.js";

// ============================================================================
// ADAPTER REGISTRY
// ============================================================================

export type SupportedPortal = "finn.no" | "zillow";

const ADAPTERS: Record<SupportedPortal, (intent: SearchIntent, params: NormalizedSearchParams) => string> = {
  "finn.no": buildFinnNo,
  zillow: buildZillow,
};

/**
 * Build a search URL for any supported portal from normalized Homi parameters.
 *
 * @param portal - Portal identifier ("finn.no" or "zillow")
 * @param intent - "buy" or "rent"
 * @param params - Normalized search parameters
 * @returns Full URL string for the portal
 *
 * @example
 * ```ts
 * import { build } from "@use_homi/real-estate-portal-schemas/build";
 *
 * const url = build("finn.no", "rent", {
 *   location: "Oslo",
 *   maxPrice: 15000,
 *   bedrooms: { min: 2 },
 *   amenities: ["balcony", "elevator"],
 *   pets: true,
 * });
 * ```
 */
export function build(
  portal: SupportedPortal,
  intent: SearchIntent,
  params: NormalizedSearchParams,
): string {
  const adapter = ADAPTERS[portal];
  if (!adapter) {
    throw new Error(
      `Unsupported portal: ${portal}. Supported: ${Object.keys(ADAPTERS).join(", ")}`,
    );
  }
  return adapter(intent, params);
}

// Re-export individual adapters for direct use
export { build as buildFinnNo } from "./finn-no.js";
export { build as buildZillow } from "./zillow-com.js";
