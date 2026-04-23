import { z } from "zod";

import type { ProviderUrlConfig } from "./index.js";

// ============================================================================
// STREETEASY QUERY PARAMETER SCHEMA
// ============================================================================
//
// Verified against the live site on 2026-04-22 via web_fetch + title checking.
//
// StreetEasy uses a path-based DSL for filters:
//   /for-rent/nyc/type:D1,X|price:2000-4000|beds:1-2|amenities:washer_dryer
//
// Format: /{for-rent|for-sale}/{location}/{filter1|filter2|...}?sort_by=...
//
// Filters are pipe-delimited. Each filter is `key:value` or `key>=value`.
// Multi-value filters use comma-separated values (e.g. `type:D1,X`).
// ============================================================================

// ---------------------------------------------------------------------------
// Neighborhood area codes — verified via live title checking
// ---------------------------------------------------------------------------

export const STREETEASY_AREAS = {
  // === Manhattan ===
  /** All Manhattan */
  MANHATTAN: "100",
  /** Roosevelt Island */
  ROOSEVELT_ISLAND: "101",
  /** All Downtown Manhattan */
  DOWNTOWN: "102",
  /** Civic Center */
  CIVIC_CENTER: "103",
  /** Financial District */
  FINANCIAL_DISTRICT: "104",
  /** Tribeca */
  TRIBECA: "105",
  /** Stuyvesant Town / Peter Cooper Village */
  STUYVESANT_TOWN: "106",
  /** Soho */
  SOHO: "107",
  /** Little Italy */
  LITTLE_ITALY: "108",
  /** Lower East Side */
  LOWER_EAST_SIDE: "109",
  /** Chinatown */
  CHINATOWN: "110",
  /** Two Bridges */
  TWO_BRIDGES: "111",
  /** Battery Park City */
  BATTERY_PARK_CITY: "112",
  /** Gramercy Park */
  GRAMERCY_PARK: "113",
  /** Fulton / Seaport */
  FULTON_SEAPORT: "114",
  /** Chelsea */
  CHELSEA: "115",
  /** Greenwich Village */
  GREENWICH_VILLAGE: "116",
  /** East Village */
  EAST_VILLAGE: "117",
  /** Noho */
  NOHO: "118",
  /** All Midtown */
  ALL_MIDTOWN: "119",
  /** Midtown */
  MIDTOWN: "120",
  /** Central Park South */
  CENTRAL_PARK_SOUTH: "121",
  /** Midtown South */
  MIDTOWN_SOUTH: "122",
  /** Midtown East */
  MIDTOWN_EAST: "123",
  /** Midtown West */
  MIDTOWN_WEST: "124",

  // === Upper Manhattan — IDs need verification (125-160 range) ===
  // Rate-limited before completing. Known to include:
  // Upper West Side, Upper East Side, Harlem, Hell's Kitchen,
  // Murray Hill, Flatiron, Nolita, West Village, Kips Bay, etc.
  // TODO: verify remaining Manhattan IDs (125-160)

  // === Brooklyn — need full verification ===
  // Old code had 301=Williamsburg but actual is 301=Greenpoint, 302=Williamsburg.
  // All Brooklyn IDs (300+) need re-verification.
  // TODO: verify Brooklyn neighborhood IDs

  // === Queens — need full verification ===
  // TODO: verify Queens neighborhood IDs (400+)
} as const;

// ---------------------------------------------------------------------------
// Property type codes — from old code, verified via URL acceptance
// ---------------------------------------------------------------------------

export const STREETEASY_PROPERTY_TYPES = {
  /** Condo */
  CONDO: "D1",
  /** Co-op */
  COOP: "X",
  /** Condop */
  CONDOP: "D9",
  /** Rental building */
  RENTAL_BUILDING: "R1",
  /** Townhouse */
  TOWNHOUSE: "D2",
  /** Multi-family */
  MULTI_FAMILY: "D4",
  /** House */
  HOUSE: "D3",
} as const;

// ---------------------------------------------------------------------------
// Amenity codes — verified via URL + title confirmation
// ---------------------------------------------------------------------------

export const STREETEASY_AMENITIES = {
  /** No broker fee */
  NO_FEE: "no_fee",
  /** Pets allowed */
  PETS: "pets",
  /** Doorman building */
  DOORMAN: "doorman",
  /** Elevator */
  ELEVATOR: "elevator",
  /** In-unit washer/dryer */
  WASHER_DRYER: "washer_dryer",
  /** Dishwasher */
  DISHWASHER: "dishwasher",
  /** Gym / fitness center */
  GYM: "gym",
  /** Swimming pool */
  POOL: "pool",
  /** Roof deck */
  ROOF_DECK: "roof_deck",
  /** Private outdoor space */
  PRIVATE_OUTDOOR_SPACE: "private_outdoor_space",
  /** Parking available */
  PARKING: "parking",
  /** Storage available */
  STORAGE: "storage",
  /** Furnished */
  FURNISHED: "furnished",

  // TODO: verify additional amenity codes via browser UI:
  // laundry_in_building, concierge, bike_room, live_in_super,
  // central_air, fireplace, terrace, balcony, high_ceilings
} as const;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

export const streetEasyParamsSchema = z.object({
  location: z
    .string()
    .default("nyc")
    .describe(
      "Location slug in the URL path. Default 'nyc' (all NYC + NJ). " +
        "Other values: 'manhattan', 'brooklyn', 'queens', 'bronx', " +
        "'staten-island', 'new-jersey', 'jersey-city-nj', 'hoboken-nj'.",
    ),

  type: z
    .array(z.string())
    .optional()
    .describe(
      "Property type codes (comma-separated in URL). " +
        "D1=condo, X=co-op, D9=condop, R1=rental building, " +
        "D2=townhouse, D4=multi-family, D3=house. " +
        "Example: ['D1', 'X'] for condos and co-ops.",
    ),

  priceMin: z
    .number()
    .optional()
    .describe("Minimum price in USD. Rent: monthly. Buy: total price."),
  priceMax: z.number().optional().describe("Maximum price in USD."),

  bedsMin: z.number().optional().describe("Minimum bedrooms. 0 = studio."),
  bedsMax: z
    .number()
    .optional()
    .describe("Maximum bedrooms. Omit for no upper limit."),

  bathsMin: z
    .number()
    .optional()
    .describe("Minimum bathrooms. Supports decimals (1.5)."),

  areaSqftMin: z
    .number()
    .optional()
    .describe("Minimum area in sqft. Convert from m²: 1 m² ≈ 10.764 sqft."),

  amenities: z
    .array(z.string())
    .optional()
    .describe(
      "Amenity codes (comma-separated in URL). " +
        "Verified: 'no_fee', 'pets', 'doorman', 'elevator', 'washer_dryer', " +
        "'dishwasher', 'gym', 'pool', 'roof_deck', 'private_outdoor_space', " +
        "'parking', 'storage', 'furnished'.",
    ),

  area: z
    .array(z.string())
    .optional()
    .describe(
      "Neighborhood area codes (comma-separated in URL). " +
        "Verified Manhattan: 100=all Manhattan, 104=FiDi, 105=Tribeca, " +
        "107=Soho, 109=LES, 113=Gramercy, 115=Chelsea, 116=Greenwich Village, " +
        "117=East Village, 120=Midtown, 123=Midtown East, 124=Midtown West. " +
        "Use STREETEASY_AREAS constant for full mapping.",
    ),

  sortBy: z
    .enum([
      "se_score",
      "price_asc",
      "price_desc",
      "listed_desc",
      "size_desc",
      "size_asc",
    ])
    .optional()
    .describe(
      "Sort order (query param, not path filter). " +
        "se_score=StreetEasy score (default), " +
        "price_asc/desc=by price, listed_desc=newest, size_asc/desc=by size.",
    ),
});

export type StreetEasyParams = z.infer<typeof streetEasyParamsSchema>;

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

function serializeStreetEasyUrl(baseUrl: string, params: unknown): string {
  const p = params as StreetEasyParams;

  // Build filter segments
  const filters: string[] = [];

  if (p.type && p.type.length > 0) {
    filters.push(`type:${p.type.join(",")}`);
  }

  if (p.priceMin != null || p.priceMax != null) {
    const min = p.priceMin ?? "";
    const max = p.priceMax ?? "";
    filters.push(`price:${min}-${max}`);
  }

  if (p.bedsMin != null || p.bedsMax != null) {
    if (p.bedsMax != null) {
      filters.push(`beds:${p.bedsMin ?? 0}-${p.bedsMax}`);
    } else {
      filters.push(`beds:${p.bedsMin ?? 0}`);
    }
  }

  if (p.bathsMin != null) {
    filters.push(`baths>=${p.bathsMin}`);
  }

  if (p.areaSqftMin != null) {
    filters.push(`area_sqft>=${p.areaSqftMin}`);
  }

  if (p.area && p.area.length > 0) {
    filters.push(`area:${p.area.join(",")}`);
  }

  if (p.amenities && p.amenities.length > 0) {
    filters.push(`amenities:${p.amenities.join(",")}`);
  }

  // Build path
  const location = p.location || "nyc";
  const filtersString = filters.length > 0 ? `/${filters.join("|")}` : "";
  const path = `${baseUrl}/${location}${filtersString}`;

  // Query params (sort)
  if (p.sortBy) {
    return `${path}?sort_by=${p.sortBy}`;
  }
  return path;
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

export const streetEasyConfig: ProviderUrlConfig = {
  id: "streeteasy.com",
  name: "StreetEasy",
  baseUrls: {
    buy: "https://streeteasy.com/for-sale",
    rent: "https://streeteasy.com/for-rent",
    // rent_short: not supported on StreetEasy
  },
  params: streetEasyParamsSchema,
  serialize: serializeStreetEasyUrl,
  knownLocations: {
    // === Manhattan — verified 2026-04-22 ===
    "Manhattan (all)": "100",
    "Roosevelt Island": "101",
    "Downtown (all)": "102",
    "Civic Center": "103",
    "Financial District": "104",
    Tribeca: "105",
    "Stuyvesant Town / PCV": "106",
    Soho: "107",
    "Little Italy": "108",
    "Lower East Side": "109",
    Chinatown: "110",
    "Two Bridges": "111",
    "Battery Park City": "112",
    "Gramercy Park": "113",
    "Fulton / Seaport": "114",
    Chelsea: "115",
    "Greenwich Village": "116",
    "East Village": "117",
    Noho: "118",
    "Midtown (all)": "119",
    Midtown: "120",
    "Central Park South": "121",
    "Midtown South": "122",
    "Midtown East": "123",
    "Midtown West": "124",

    // === Brooklyn — verified IDs ===
    Greenpoint: "301", // ✅ verified (old code had this as Williamsburg — wrong)
    Williamsburg: "302", // ✅ verified

    // TODO: verify remaining Brooklyn (303-320) and Queens (400+) IDs
  },
};
