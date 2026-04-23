import { z } from "zod";

import type { ProviderUrlConfig } from "./index.js";

// ============================================================================
// DOMAIN.COM.AU QUERY PARAMETER SCHEMA
// ============================================================================
//
// Verified against the live site on 2026-04-23 via web_fetch URL testing.
// Domain.com.au is Australia's leading property portal.
//
// URL format: /rent/ or /sale/ + query params
// Location uses suburb param: suburb={name}-{state}-{postcode}
// Range params use "min-max" or "min-any" format.
// ============================================================================

// ---------------------------------------------------------------------------
// Property type values
// ---------------------------------------------------------------------------

export const DOMAIN_PROPERTY_TYPES = {
  APARTMENT: "apartment",
  HOUSE: "house",
  TOWNHOUSE: "townhouse",
  VILLA: "villa",
  UNIT: "unit",
  LAND: "land",
  ACREAGE: "acreage",
  RURAL: "rural",
  BLOCK_OF_UNITS: "blockofunits",
  RETIREMENT: "retirement",
} as const;

// ---------------------------------------------------------------------------
// Feature values
// ---------------------------------------------------------------------------

export const DOMAIN_FEATURES = {
  PETS_ALLOWED: "petsallowed",
  AIR_CONDITIONING: "airconditioning",
  BALCONY: "balconydeck",
  POOL: "pool",
  GYM: "gym",
  PARKING: "parking",
  GARAGE: "garage",
  STORAGE: "storage",
  GARDEN: "garden",
  INTERNAL_LAUNDRY: "internallaundry",
  STUDY: "study",
  DISHWASHER: "dishwasher",
  BUILT_IN_WARDROBES: "builtinwardrobes",
  FURNISHED: "furnished",
  ENSUITE: "ensuite",
} as const;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

export const domainAuParamsSchema = z.object({
  // --- Location ---
  suburb: z
    .string()
    .describe(
      "Suburb slug. Format: '{name}-{state}-{postcode}'. " +
        "Examples: 'sydney-nsw-2000', 'melbourne-vic-3000', " +
        "'brisbane-city-qld-4000', 'perth-wa-6000'. " +
        "Use knownLocations for mappings.",
    ),

  // --- Price (range format: "min-max" or just a number for rent) ---
  price: z
    .string()
    .optional()
    .describe(
      "Price range. Format: '{min}-{max}'. " +
        "Rent: AUD per week (e.g. '500-800'). " +
        "Buy: AUD total (e.g. '800000-1500000').",
    ),

  // --- Bedrooms (range format) ---
  bedrooms: z
    .string()
    .optional()
    .describe(
      "Bedroom range. Format: '{min}-{max}' or '{min}-any'. " +
        "Examples: '2-3', '2-any' (2+), 'studio'.",
    ),

  // --- Bathrooms (range format) ---
  bathrooms: z
    .string()
    .optional()
    .describe(
      "Bathroom range. Format: '{min}-{max}' or '{min}-any'. " +
        "Examples: '1-any' (1+), '2-3'.",
    ),

  // --- Property type ---
  ptype: z
    .string()
    .optional()
    .describe(
      "Property types (comma-separated). Values: " +
        "'apartment', 'house', 'townhouse', 'villa', 'unit', " +
        "'land', 'acreage', 'rural', 'blockofunits', 'retirement'. " +
        "Example: 'apartment,unit' for apartments and units.",
    ),

  // --- Car spaces ---
  carspaces: z
    .string()
    .optional()
    .describe(
      "Car/parking spaces range. Format: '{min}-any'. " +
        "Example: '1-any' for at least 1 parking space.",
    ),

  // --- Features ---
  features: z
    .string()
    .optional()
    .describe(
      "Features (comma-separated). Values: " +
        "'petsallowed', 'airconditioning', 'balconydeck', 'pool', " +
        "'gym', 'parking', 'garage', 'storage', 'garden', " +
        "'internallaundry', 'study', 'dishwasher', 'builtinwardrobes', " +
        "'furnished', 'ensuite'. " +
        "Example: 'petsallowed,airconditioning,pool'.",
    ),

  // --- Land size ---
  landsize: z
    .string()
    .optional()
    .describe(
      "Land size range in m². Format: '{min}-{max}'. " +
        "Must be used with landsizeunit.",
    ),
  landsizeunit: z
    .enum(["m2"])
    .optional()
    .describe("Land size unit. Set to 'm2'."),

  // --- Sale-specific ---
  excludeunderoffer: z
    .enum(["1"])
    .optional()
    .describe("Buy only. Exclude listings under offer. Set to '1'."),

  // --- Rent-specific ---
  excludedeposittaken: z
    .enum(["1"])
    .optional()
    .describe("Rent only. Exclude listings with deposit taken. Set to '1'."),
  availableto: z
    .string()
    .optional()
    .describe("Rent only. Available by date. Format: YYYY-MM-DD."),

  // --- Sort ---
  sort: z
    .string()
    .optional()
    .describe(
      "Sort order. Common values: 'default', 'price-asc', 'price-desc', " +
        "'date-new-old', 'date-old-new'.",
    ),

  // --- Pagination ---
  page: z
    .number()
    .optional()
    .describe("Page number."),
});

export type DomainAuParams = z.infer<typeof domainAuParamsSchema>;

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

function serializeDomainAuUrl(baseUrl: string, params: unknown): string {
  const p = params as DomainAuParams & { suburb?: string };

  const qs = new URLSearchParams();

  if (p.suburb) qs.set("suburb", p.suburb);
  if (p.price) qs.set("price", p.price);
  if (p.bedrooms) qs.set("bedrooms", p.bedrooms);
  if (p.bathrooms) qs.set("bathrooms", p.bathrooms);
  if (p.ptype) qs.set("ptype", p.ptype);
  if (p.carspaces) qs.set("carspaces", p.carspaces);
  if (p.features) qs.set("features", p.features);
  if (p.landsize) qs.set("landsize", p.landsize);
  if (p.landsizeunit) qs.set("landsizeunit", p.landsizeunit);
  if (p.excludeunderoffer) qs.set("excludeunderoffer", p.excludeunderoffer);
  if (p.excludedeposittaken) qs.set("excludedeposittaken", p.excludedeposittaken);
  if (p.availableto) qs.set("availableto", p.availableto);
  if (p.sort) qs.set("sort", p.sort);
  if (p.page != null) qs.set("page", String(p.page));

  const qsStr = qs.toString();
  return qsStr ? `${baseUrl}?${qsStr}` : baseUrl;
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

export const domainAuConfig: ProviderUrlConfig = {
  id: "domain.com.au",
  name: "Domain",
  baseUrls: {
    buy: "https://www.domain.com.au/sale/",
    rent: "https://www.domain.com.au/rent/",
  },
  params: domainAuParamsSchema,
  serialize: serializeDomainAuUrl,
  knownLocations: {
    // Major Australian cities — suburb slug format
    "Sydney": "sydney-nsw-2000",
    "Melbourne": "melbourne-vic-3000",
    "Brisbane": "brisbane-city-qld-4000",
    "Perth": "perth-wa-6000",
    "Adelaide": "adelaide-sa-5000",
    "Hobart": "hobart-tas-7000",
    "Canberra": "canberra-act-2601",
    "Darwin": "darwin-city-nt-0800",
    "Gold Coast": "gold-coast-city-qld-4217",
    "Newcastle": "newcastle-nsw-2300",
    "Wollongong": "wollongong-nsw-2500",
    // Popular Sydney suburbs
    "Bondi": "bondi-nsw-2026",
    "Surry Hills": "surry-hills-nsw-2010",
    "Newtown": "newtown-nsw-2042",
    "Manly": "manly-nsw-2095",
    // Popular Melbourne suburbs
    "St Kilda": "st-kilda-vic-3182",
    "Fitzroy": "fitzroy-vic-3065",
    "South Yarra": "south-yarra-vic-3141",
    "Richmond": "richmond-vic-3121",
  },
};
