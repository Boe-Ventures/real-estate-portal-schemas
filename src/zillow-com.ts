import { z } from "zod";

import type { ProviderUrlConfig } from "./index.js";

// ============================================================================
// ZILLOW QUERY PARAMETER SCHEMA
// ============================================================================
//
// Verified against the live site on 2026-04-22 via browser automation.
// Zillow encodes all filters as a JSON `searchQueryState` URL parameter.
// Most filter fields use a `{ value: X }` wrapper pattern.
// Range fields use `{ min?: number, max?: number }`.
//
// Endpoints:
//   - /{city-slug}/         (buy)
//   - /{city-slug}/rentals/ (rent)
//
// The filterState JSON is the same structure for both; different keys are
// present depending on buy vs rent mode.
// ============================================================================

// ---------------------------------------------------------------------------
// Helper schemas
// ---------------------------------------------------------------------------

const valueWrapper = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({ value: inner });

const rangeSchema = z.object({
  min: z.number().nullable().optional(),
  max: z.number().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Filter state schema
// ---------------------------------------------------------------------------

export const zillowFilterStateSchema = z.object({
  // === Search mode ===
  fr: valueWrapper(z.boolean())
    .optional()
    .describe("For rent mode. Set { value: true } for rental searches."),

  // === Sale type flags ===
  // IMPORTANT: Omit these entirely unless the user explicitly asks to filter
  // by sale type. Zillow's defaults handle the common case. Only set to
  // { value: true } to include a specific type, or { value: false } to exclude it.
  fsba: valueWrapper(z.boolean())
    .optional()
    .describe("For sale by agent. Omit to use default (included for buy, excluded for rent)."),
  fsbo: valueWrapper(z.boolean())
    .optional()
    .describe("For sale by owner. Omit to use default."),
  nc: valueWrapper(z.boolean())
    .optional()
    .describe("New construction only. Omit unless user specifically wants new builds."),
  cmsn: valueWrapper(z.boolean())
    .optional()
    .describe("Coming soon listings. Omit unless user specifically wants pre-market."),
  auc: valueWrapper(z.boolean())
    .optional()
    .describe("Auction listings. Omit unless user specifically wants auctions."),
  fore: valueWrapper(z.boolean())
    .optional()
    .describe("Foreclosures. Omit unless user specifically wants foreclosures."),

  // === Price ===
  price: rangeSchema
    .optional()
    .describe(
      "Buy only. Asking price range in USD. Example: { min: 300000, max: 800000 }.",
    ),
  mp: rangeSchema
    .optional()
    .describe(
      "Rent only. Monthly rent range in USD. Example: { min: 1500, max: 4000 }.",
    ),

  // === Beds & Baths ===
  beds: rangeSchema
    .optional()
    .describe("Bedroom count range. Example: { min: 2 } for 2+ beds."),
  baths: rangeSchema
    .optional()
    .describe(
      "Bathroom count range. Supports decimals like 1.5. Example: { min: 1 }.",
    ),

  // === Home size ===
  sqft: rangeSchema
    .optional()
    .describe(
      "Square footage range. Example: { min: 800, max: 2000 }. " +
        "Convert from metric: 1 m² ≈ 10.764 sqft.",
    ),

  // === Sort ===
  sort: valueWrapper(z.string())
    .optional()
    .describe(
      "Sort order. Common values: " +
        "'priorityscore' (default rental), 'personalizedsort' (personalized), " +
        "'days' (newest), 'priced' (price desc), 'pricea' (price asc), " +
        "'globalrelevanceex' (relevance).",
    ),

  // === Property type (rental) ===
  // Zillow uses exclusion-based property filtering — omit = include.
  // "Houses" selected → set apa, con, apco, tow to false
  // "Apartments/Condos" selected → set tow to false
  // "Townhomes" → set apa, con, apco to false
  tow: valueWrapper(z.boolean())
    .optional()
    .describe("Include townhomes. Omit or true = include, false = exclude."),
  con: valueWrapper(z.boolean())
    .optional()
    .describe("Include condos. Omit or true = include, false = exclude."),
  apa: valueWrapper(z.boolean())
    .optional()
    .describe("Include apartments. Omit or true = include, false = exclude."),
  apco: valueWrapper(z.boolean())
    .optional()
    .describe(
      "Include apartments/condos combined. Omit or true = include, false = exclude.",
    ),
  mf: valueWrapper(z.boolean())
    .optional()
    .describe("Include multi-family properties. Omit to use default."),
  land: valueWrapper(z.boolean())
    .optional()
    .describe("Include land/lots. Omit to use default."),
  manu: valueWrapper(z.boolean())
    .optional()
    .describe("Include manufactured homes. Omit to use default."),

  // === Space type (rental) ===
  r4r: valueWrapper(z.boolean())
    .optional()
    .describe(
      "Room for rent. Set { value: true } to show rooms instead of whole units.",
    ),
  r4re: valueWrapper(z.boolean())
    .optional()
    .describe(
      "Entire place. Set { value: false } when room-for-rent is selected.",
    ),

  // === Pets ===
  sdog: valueWrapper(z.boolean()).optional().describe("Allows small dogs."),
  ldog: valueWrapper(z.boolean()).optional().describe("Allows large dogs."),
  cat: valueWrapper(z.boolean()).optional().describe("Allows cats."),
  np: valueWrapper(z.boolean())
    .optional()
    .describe("No pets allowed (filter for pet-free buildings)."),

  // === Popular amenities ===
  lau: valueWrapper(z.boolean()).optional().describe("In-unit laundry."),
  ac: valueWrapper(z.boolean())
    .optional()
    .describe("Must have A/C (air conditioning)."),
  parka: valueWrapper(z.boolean()).optional().describe("On-site parking."),

  // === Standard amenities ===
  eaa: valueWrapper(z.boolean()).optional().describe("Elevator."),
  pool: valueWrapper(z.boolean()).optional().describe("Pool."),
  wat: valueWrapper(z.boolean()).optional().describe("Waterfront."),
  fur: valueWrapper(z.boolean()).optional().describe("Furnished."),
  hsia: valueWrapper(z.boolean()).optional().describe("High speed internet."),
  // Basement triggers 3 keys simultaneously
  hbas: valueWrapper(z.boolean())
    .optional()
    .describe("Has basement (part 1 of 3 — set hbas, basf, basu together)."),
  basf: valueWrapper(z.boolean())
    .optional()
    .describe("Basement finished (part 2 of 3 — set with hbas and basu)."),
  basu: valueWrapper(z.boolean())
    .optional()
    .describe("Basement unfinished (part 3 of 3 — set with hbas and basf)."),
  uti: valueWrapper(z.boolean()).optional().describe("Utilities included."),
  hrdwd: valueWrapper(z.boolean()).optional().describe("Hardwood floors."),
  fit: valueWrapper(z.boolean()).optional().describe("Fitness center."),
  os: valueWrapper(z.boolean()).optional().describe("Outdoor space."),
  dish: valueWrapper(z.boolean()).optional().describe("Dishwasher."),

  // === Views ===
  cityv: valueWrapper(z.boolean()).optional().describe("City view."),
  mouv: valueWrapper(z.boolean()).optional().describe("Mountain view."),
  parkv: valueWrapper(z.boolean()).optional().describe("Park view."),
  watv: valueWrapper(z.boolean()).optional().describe("Water view."),

  // === Property details ===
  sto: valueWrapper(z.boolean()).optional().describe("Single-story only."),

  // === Accessibility & community ===
  disac: valueWrapper(z.boolean())
    .optional()
    .describe("Disabled access / ADA accessible."),
  inc: valueWrapper(z.boolean())
    .optional()
    .describe("Income restricted / affordable housing."),
  fmfb: valueWrapper(z.boolean())
    .optional()
    .describe("Apartment community (featured multi-family building)."),
  ca: valueWrapper(z.boolean())
    .optional()
    .describe("Controlled access / gated entry."),

  // === Listing details ===
  "3d": valueWrapper(z.boolean())
    .optional()
    .describe("Has 3D tour / virtual tour."),
  app: valueWrapper(z.boolean())
    .optional()
    .describe("Accepts Zillow applications (rental)."),
  ita: valueWrapper(z.boolean())
    .optional()
    .describe("Instant tour available (rental)."),
  stl: valueWrapper(z.boolean())
    .optional()
    .describe("Short term lease available (rental)."),

  // === Time on Zillow ===
  doz: valueWrapper(z.string())
    .optional()
    .describe(
      "Days on Zillow. String values: " +
        "'1' (1 day), '7' (7 days), '14' (14 days), '30' (30 days), " +
        "'90' (90 days), '180' (6 months), '365' (12 months), " +
        "'730' (24 months), '1095' (36 months).",
    ),

  // === Move-in date (rental) ===
  rad: valueWrapper(z.string())
    .optional()
    .describe("Move-in date as ISO date string 'YYYY-MM-DD'."),

  // === 55+ Communities ===
  // pmf and pf appear in default state — likely related to senior communities
  pmf: valueWrapper(z.boolean())
    .optional()
    .describe("Exclude park/mobile/manufactured homes. Omit to use default."),
  pf: valueWrapper(z.boolean())
    .optional()
    .describe("Pre-foreclosure. Omit to use default."),

  // === Keywords ===
  // Keywords are passed as a separate param, not in filterState
  // TODO: verify how keywords param appears in the URL

  // === Buy-specific filters ===
  // TODO: verify these on the buy page
  // lot: rangeSchema — lot size
  // built: rangeSchema — year built
  // hoa: rangeSchema — HOA max
  // gar: valueWrapper(z.boolean()) — garage
  // ah: valueWrapper(z.boolean()) — accessible home
  // sf: valueWrapper(z.boolean()) — single family
  // att: valueWrapper(z.boolean()) — attached
});

export type ZillowFilterState = z.infer<typeof zillowFilterStateSchema>;

// ---------------------------------------------------------------------------
// Top-level search state schema
// ---------------------------------------------------------------------------

export const zillowParamsSchema = z.object({
  citySlug: z
    .string()
    .describe(
      "City slug for the URL path. Format: 'city-name-state' lowercase. " +
        "Examples: 'new-york-ny', 'san-francisco-ca', 'miami-fl', 'los-angeles-ca'. " +
        "Use knownLocations for common mappings.",
    ),
  regionSelection: z
    .array(
      z.object({
        regionId: z.number().describe("Zillow region ID number."),
        regionType: z
          .number()
          .optional()
          .describe("Region type. 6 = city, 7 = neighborhood."),
      }),
    )
    .optional()
    .describe(
      "Region selection for map-based results. " +
        "Use knownLocations to find regionIds for major cities.",
    ),
  usersSearchTerm: z
    .string()
    .optional()
    .describe(
      "Search term displayed to user. Usually 'City, ST'. " +
        "Example: 'New York, NY' or 'Brooklyn, NY'.",
    ),
  filterState: zillowFilterStateSchema.describe(
    "Filter state object. Contains all search filters.",
  ),
  mapBounds: z
    .object({
      north: z.number(),
      south: z.number(),
      east: z.number(),
      west: z.number(),
    })
    .optional()
    .describe(
      "Map viewport bounds. Usually omitted — Zillow auto-derives from region.",
    ),
  keywords: z
    .string()
    .optional()
    .describe(
      "Free-text keyword search. E.g. 'short term', 'furnished', 'rooftop'.",
    ),
});

export type ZillowParams = z.infer<typeof zillowParamsSchema>;

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

function serializeZillowUrl(baseUrl: string, params: unknown): string {
  const p = params as ZillowParams;

  // Build the path: /{city-slug} for buy, /{city-slug}/rentals for rent
  const isRental = p.filterState.fr?.value === true;
  const pathSuffix = isRental ? "/rentals/" : "/";
  const urlPath = `${baseUrl}/${p.citySlug}${pathSuffix}`;

  // Build searchQueryState
  const searchQueryState: Record<string, unknown> = {
    pagination: {},
    isMapVisible: true,
    isListVisible: true,
    filterState: p.filterState,
  };

  if (p.regionSelection) {
    searchQueryState.regionSelection = p.regionSelection;
  }
  if (p.usersSearchTerm) {
    searchQueryState.usersSearchTerm = p.usersSearchTerm;
  }
  if (p.mapBounds) {
    searchQueryState.mapBounds = p.mapBounds;
  }

  const qs = new URLSearchParams();
  qs.set("searchQueryState", JSON.stringify(searchQueryState));
  return `${urlPath}?${qs.toString()}`;
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

export const zillowConfig: ProviderUrlConfig = {
  id: "zillow.com",
  name: "Zillow",
  baseUrls: {
    buy: "https://www.zillow.com",
    rent: "https://www.zillow.com",
    // rent_short: not supported on Zillow
  },
  params: zillowParamsSchema,
  serialize: serializeZillowUrl,
  knownLocations: {
    // City slug → regionId mappings (regionType: 6 = city)
    "New York, NY (new-york-ny)": "6181",
    "Brooklyn, NY (brooklyn-new-york-ny)": "37607",
    "Manhattan, NY (manhattan-new-york-ny)": "12530",
    "San Francisco, CA (san-francisco-ca)": "20330",
    "Los Angeles, CA (los-angeles-ca)": "12447",
    "Miami, FL (miami-fl)": "12700",
    "Chicago, IL (chicago-il)": "17426",
    "Seattle, WA (seattle-wa)": "16037",
    "Austin, TX (austin-tx)": "10221",
    "Boston, MA (boston-ma)": "44269",
    "Denver, CO (denver-co)": "11093",
    "Portland, OR (portland-or)": "13373",
    "Washington, DC (washington-dc)": "41070",
    // TODO: verify all regionIds — these are from old code, not yet re-confirmed
  },
};
