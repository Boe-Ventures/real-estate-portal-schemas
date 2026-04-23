import { z } from "zod";

import type { ProviderUrlConfig } from "./index.js";

// ============================================================================
// PROPERTY24.COM QUERY PARAMETER SCHEMA
// ============================================================================
//
// Verified against the live site on 2026-04-22 via agent-browser automation.
// Property24 is South Africa's #1 property portal (~10M monthly visits).
//
// URL format: /{to-rent|for-sale}/{city}/{province}/{location-id}?params
//
// Uses a mix of:
// - Top-level query params: Bedrooms, PropertyType
// - Nested `sp` param with sub-params: sp=pmin=8000&pmax=15000&ptf=True
//   (the sp sub-params use = and & but URL-encoded as %3d and %26)
//
// Location is path-based with numeric IDs.
// ============================================================================

// ---------------------------------------------------------------------------
// Feature codes (in sp param, all use =True)
// ---------------------------------------------------------------------------

export const PROPERTY24_FEATURES = {
  /** Pet Friendly */
  PET_FRIENDLY: "ptf",
  /** Has Pool */
  POOL: "hp",
  /** Has Garden */
  GARDEN: "hg",
  /** Has Flatlet */
  FLATLET: "hf",
  /** Retirement Property */
  RETIREMENT: "rp",
  /** On Show */
  ON_SHOW: "os",
  /** Security Estate / Cluster */
  SECURITY_ESTATE: "sec", // TODO: verify this code
} as const;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

export const property24ParamsSchema = z.object({
  // --- Location (path-based) ---
  locationSlug: z
    .string()
    .describe(
      "Location path slug. Format: '{city}/{province}/{id}'. " +
        "Examples: 'cape-town/western-cape/432', " +
        "'johannesburg/gauteng/536', 'durban/kwazulu-natal/438'. " +
        "Use knownLocations for mappings.",
    ),

  // --- Bedrooms ---
  Bedrooms: z
    .number()
    .optional()
    .describe("Number of bedrooms. Integer value."),

  // --- Bathrooms ---
  Bathrooms: z
    .number()
    .optional()
    .describe("Number of bathrooms. Integer value."),

  // --- Property type ---
  PropertyType: z
    .string()
    .optional()
    .describe(
      "Property type. Values: 'Apartment', 'House', 'Townhouse', " +
        "'Vacant Land', 'Farm', 'Commercial', 'Industrial'. " +
        "TODO: verify all PropertyType values.",
    ),

  // --- Price (in sp sub-params) ---
  pmin: z
    .number()
    .optional()
    .describe("Minimum price in ZAR. Rent: monthly. Buy: total price."),
  pmax: z.number().optional().describe("Maximum price in ZAR."),

  // --- Floor size (in sp sub-params) ---
  fsmin: z
    .number()
    .optional()
    .describe("Minimum floor size in m². TODO: verify param name."),
  fsmax: z.number().optional().describe("Maximum floor size in m²."),

  // --- Erf size (in sp sub-params) ---
  esmin: z
    .number()
    .optional()
    .describe("Minimum erf/land size in m². TODO: verify param name."),
  esmax: z.number().optional().describe("Maximum erf/land size in m²."),

  // --- Parking ---
  parkingSpaces: z
    .number()
    .optional()
    .describe("Minimum parking/garage spaces."),

  // --- Furnished (rent only) ---
  furnished: z
    .enum(["furnished", "unfurnished", "partlyFurnished"])
    .optional()
    .describe("Rent only. Furnished status. TODO: verify param values."),

  // --- Features ---
  ptf: z.enum(["True"]).optional().describe("Pet friendly (dyrehold tillatt)."),
  hp: z.enum(["True"]).optional().describe("Has pool."),
  hg: z.enum(["True"]).optional().describe("Has garden."),
  hf: z.enum(["True"]).optional().describe("Has flatlet / granny flat."),
  rp: z.enum(["True"]).optional().describe("Retirement property only."),
  os: z.enum(["True"]).optional().describe("On show (open house) only."),

  // --- Pagination ---
  Page: z.number().optional().describe("Page number for paginated results."),
});

export type Property24Params = z.infer<typeof property24ParamsSchema>;

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

function serializeProperty24Url(baseUrl: string, params: unknown): string {
  const p = params as Property24Params & { locationSlug?: string };

  // Location goes in the path
  const location = p.locationSlug || "cape-town/western-cape/432";
  const path = `${baseUrl}/${location}`;

  // Top-level params
  const topLevel = new URLSearchParams();
  if (p.Bedrooms != null) topLevel.set("Bedrooms", String(p.Bedrooms));
  if (p.Bathrooms != null) topLevel.set("Bathrooms", String(p.Bathrooms));
  if (p.PropertyType) topLevel.set("PropertyType", p.PropertyType);
  if (p.Page != null) topLevel.set("Page", String(p.Page));

  // sp sub-params (price, features, etc.)
  const spParts: string[] = [];
  if (p.pmin != null) spParts.push(`pmin=${p.pmin}`);
  if (p.pmax != null) spParts.push(`pmax=${p.pmax}`);
  if (p.ptf) spParts.push(`ptf=True`);
  if (p.hp) spParts.push(`hp=True`);
  if (p.hg) spParts.push(`hg=True`);
  if (p.hf) spParts.push(`hf=True`);
  if (p.rp) spParts.push(`rp=True`);
  if (p.os) spParts.push(`os=True`);

  if (spParts.length > 0) {
    topLevel.set("sp", spParts.join("&"));
  }

  const qs = topLevel.toString();
  return qs ? `${path}?${qs}` : path;
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

export const property24Config: ProviderUrlConfig = {
  id: "property24.com",
  name: "Property24",
  baseUrls: {
    buy: "https://www.property24.com/for-sale",
    rent: "https://www.property24.com/to-rent",
  },
  params: property24ParamsSchema,
  serialize: serializeProperty24Url,
  knownLocations: {
    // Major South African cities — verified: Cape Town = 432
    "Cape Town": "cape-town/western-cape/432",
    Johannesburg: "johannesburg/gauteng/536",
    Pretoria: "pretoria/gauteng/634",
    Durban: "durban/kwazulu-natal/438",
    "Port Elizabeth": "port-elizabeth/eastern-cape/625",
    Bloemfontein: "bloemfontein/free-state/435",
    Stellenbosch: "stellenbosch/western-cape/656",
    Sandton: "sandton/gauteng/642",
    // TODO: verify all location IDs beyond Cape Town
  },
};
