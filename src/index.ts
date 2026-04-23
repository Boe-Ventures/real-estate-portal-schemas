import type { z } from "zod";

export interface ProviderUrlConfig {
  /** Unique provider identifier (e.g. "finn.no", "zillow.com") */
  id: string;
  /** Human-readable provider name */
  name: string;
  /** Base URLs keyed by collection intention — no AI needed for these */
  baseUrls: Partial<Record<"buy" | "rent" | "rent_short", string>>;
  /** Zod schema for URL params — AI fills this in using .describe() hints */
  params: z.ZodType;
  /** Serialize base URL + parsed params into a full URL string */
  serialize: (baseUrl: string, params: unknown) => string;
  /** Reference location codes for AI context */
  knownLocations?: Record<string, string>;
}

/**
 * Default serializer for providers that use simple query-string params.
 * Handles arrays (appends each value) and skips null/undefined.
 */
export function serializeAsQueryParams(
  baseUrl: string,
  params: Record<string, unknown>,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        searchParams.append(key, String(v));
      }
    } else if (typeof value === "boolean") {
      searchParams.set(key, String(value));
    } else if (typeof value === "object") {
      searchParams.set(key, JSON.stringify(value));
    } else {
      searchParams.set(key, String(value as string | number | bigint));
    }
  }
  const qs = searchParams.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

// Re-export provider configs
export { finnNoConfig, finnNoParamsSchema } from "./finn-no.js";
export {
  zillowConfig,
  zillowParamsSchema,
  zillowFilterStateSchema,
} from "./zillow-com.js";
export { streetEasyConfig, streetEasyParamsSchema } from "./streeteasy-com.js";
export { hybelNoConfig, hybelNoParamsSchema } from "./hybel-no.js";
export { airbnbConfig, airbnbParamsSchema } from "./airbnb-com.js";
export { rightmoveConfig, rightmoveParamsSchema } from "./rightmove-co-uk.js";
export { property24Config, property24ParamsSchema } from "./property24-com.js";
export { craigslistConfig, craigslistParamsSchema } from "./craigslist-org.js";
export { domainAuConfig, domainAuParamsSchema } from "./domain-com-au.js";
export {
  ALL_PROVIDERS,
  NORWAY_PROVIDERS,
  US_PROVIDERS,
  UK_PROVIDERS,
  AU_PROVIDERS,
  SE_PROVIDERS,
  DE_PROVIDERS,
  NL_PROVIDERS,
  ES_PROVIDERS,
  PT_PROVIDERS,
  GLOBAL_PROVIDERS,
  getProviderBaseUrls,
  getProvidersByCountry,
} from "./base-urls.js";
export type { ProviderBaseUrls } from "./base-urls.js";
