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
  /**
   * Provider-specific guidance appended to the URL-generation prompt.
   *
   * Free-form markdown. Use this to encode hard-won knowledge about how the
   * portal actually behaves — filter aggression, mandatory fields, semantic
   * quirks, anything the bare schema description can't capture.
   *
   * Consumed by LLM-driven URL generators (e.g. Homi's source-url-generator).
   */
  promptGuidance?: string;
  /**
   * Worked examples — concrete params objects with a short description.
   *
   * Rendered as JSON code blocks in the URL-generation prompt to anchor the
   * model on real expected outputs. Each `params` must be a valid value for
   * the provider's `params` schema (typed as `unknown` here so this
   * interface stays portable, but you should construct them against the
   * provider-specific param type).
   */
  examples?: Array<{ description: string; params: unknown }>;
  /**
   * How this provider handles multi-neighborhood searches in one URL.
   *
   * - `'union'`: passing N neighborhoods in one URL unions them correctly.
   *   StreetEasy (`area: [...]`), Finn (repeated `location`), default safe.
   * - `'single'`: only ONE neighborhood per URL filters effectively. Zillow:
   *   multi-region falls back to city-wide. Callers should emit N URLs.
   * - `'none'`: the portal doesn't have neighborhood-level filters at all
   *   (e.g. Airbnb-style "search radius from a point").
   *
   * Used by callers to decide whether to fan out a multi-neighborhood
   * collection into multiple saved searches. Optional with implicit
   * default `'union'` for back-compat — declare explicitly for clarity.
   */
  multiNeighborhoodSupport?: "union" | "single" | "none";
  /**
   * JSON-LD structured data extraction metadata for listing detail pages.
   *
   * Many property portals embed schema.org JSON-LD in their HTML, enabling
   * structured data extraction with zero AI cost. This field describes what
   * JSON-LD types are available and how their fields map to common listing
   * properties.
   */
  jsonLd?: {
    /** schema.org @type(s) to look for (e.g. 'VacationRental', 'Product') */
    types: string[];
    /** Whether this provider reliably serves JSON-LD on listing detail pages */
    available: boolean;
    /** Field mapping: JSON-LD path → common listing field name */
    fieldMap?: Record<string, string>;
    /** Notes about availability, quirks, bot protection, etc. */
    notes?: string;
  };
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
export {
  bookingComConfig,
  bookingComParamsSchema,
  BOOKING_PROPERTY_FACILITIES,
  BOOKING_ROOM_FACILITIES,
  BOOKING_ACCOMMODATION_TYPES,
  BOOKING_DEST_IDS,
} from "./booking-com.js";
export { rightmoveConfig, rightmoveParamsSchema } from "./rightmove-co-uk.js";
export { property24Config, property24ParamsSchema } from "./property24-com.js";
export { craigslistConfig, craigslistParamsSchema } from "./craigslist-org.js";
export { domainAuConfig, domainAuParamsSchema } from "./domain-com-au.js";
export { hjemNoConfig, hjemNoParamsSchema } from "./hjem-no.js";
export {
  liveohanaConfig,
  liveohanaParamsSchema,
} from "./liveohana-ai.js";
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

// Normalized taxonomy
export {
  HOMI_AMENITIES,
  HomiAmenitySchema,
  HOMI_PROPERTY_TYPES,
  HomiPropertyTypeSchema,
  HOMI_OWNERSHIP_TYPES,
  HomiOwnershipTypeSchema,
  HOMI_ENERGY_RATINGS,
  HomiEnergyRatingSchema,
  HOMI_FURNISHED_STATUS,
  HomiFurnishedStatusSchema,
  HOMI_SORT_OPTIONS,
  HomiSortOptionSchema,
  NormalizedSearchParamsSchema,
} from "./taxonomy.js";
export type {
  HomiAmenity,
  HomiPropertyType,
  HomiOwnershipType,
  HomiEnergyRating,
  HomiFurnishedStatus,
  HomiSortOption,
  NormalizedSearchParams,
  SearchIntent,
} from "./taxonomy.js";

// JSON-LD extraction utilities
export { extractJsonLd, findJsonLdByType } from "./json-ld.js";
export type { JsonLdBlock } from "./json-ld.js";

// Adapter / build API — import from subpaths to avoid circular deps:
//   import { build } from "@use_homi/real-estate-portal-schemas/build"
//   import { NormalizedSearchParamsSchema } from "@use_homi/real-estate-portal-schemas/taxonomy"
