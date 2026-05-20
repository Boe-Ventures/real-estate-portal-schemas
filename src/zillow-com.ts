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
    // === Cities (regionType: 6) ===
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

    // === NYC — Manhattan neighborhoods (regionType: 7) — verified 2026-05-11 via Zillow autocomplete API ===
    "Upper East Side, Manhattan": "270957",
    "Upper West Side, Manhattan": "270958",
    "Hell's Kitchen, Manhattan": "778997",
    "Chelsea, Manhattan": "838067",
    "East Village, Manhattan": "270829",
    "West Village, Manhattan": "270964",
    "Greenwich Village, Manhattan": "195133",
    "SoHo, Manhattan": "270928",
    "Tribeca, Manhattan": "270951",
    "Lower East Side, Manhattan": "270875",
    "Financial District, Manhattan": "270835",
    "Midtown, Manhattan": "270885",
    "Murray Hill, Manhattan": "274627",
    "Gramercy, Manhattan": "273860",
    "Flatiron District, Manhattan": "403206",
    "Nolita, Manhattan": "838311",
    "Chinatown, Manhattan": "193821",
    "Little Italy, Manhattan": "270873",
    "Battery Park, Manhattan": "272869",
    "Hudson Yards, Manhattan": "778998",
    "Harlem, Manhattan": "195267",
    "East Harlem, Manhattan": "270828",
    "Morningside Heights, Manhattan": "270891",
    "Washington Heights, Manhattan": "198687",
    "Inwood, Manhattan": "195576",
    "Kips Bay, Manhattan": "838304",
    "Turtle Bay, Manhattan": "270953",
    "Sutton Place, Manhattan": "270946",
    "Roosevelt Island, Manhattan": "20239",
    "Stuyvesant Town, Manhattan": "403205",

    // === NYC — Brooklyn neighborhoods (regionType: 7) — verified 2026-05-11 ===
    "Williamsburg, Brooklyn": "199001",
    "Greenpoint, Brooklyn": "270848",
    "Brooklyn Heights, Brooklyn": "403122",
    "DUMBO, Brooklyn": "270841",
    "Park Slope, Brooklyn": "197044",
    "Prospect Heights, Brooklyn": "403220",
    "Crown Heights, Brooklyn": "403222",
    "Bushwick, Brooklyn": "193587",
    "Bedford-Stuyvesant, Brooklyn": "272902",
    "Fort Greene, Brooklyn": "273766",
    "Clinton Hill, Brooklyn": "270815",
    "Cobble Hill, Brooklyn": "270816",
    "Carroll Gardens, Brooklyn": "270811",
    "Boerum Hill, Brooklyn": "272994",
    "Red Hook, Brooklyn": "197427",
    "Gowanus, Brooklyn": "270846",
    "Sunset Park, Brooklyn": "270945",
    "Bay Ridge, Brooklyn": "193189",
    "Flatbush, Brooklyn": "194737",
    "Ditmas Park, Brooklyn": "838383",
    "Prospect Lefferts Gardens, Brooklyn": "403221",
    "Windsor Terrace, Brooklyn": "270968",
    "Kensington, Brooklyn": "403217",
    "Bensonhurst, Brooklyn": "193285",
    "Downtown Brooklyn": "270825",
    "Prospect Park South, Brooklyn": "270914",
    "Columbia St Waterfront, Brooklyn": "403219",

    // === NYC — Queens neighborhoods (regionType: 7) — verified 2026-05-11 ===
    "Astoria, Queens": "272816",
    "Long Island City, Queens": "46301",
    "Sunnyside, Queens": "275620",
    "Jackson Heights, Queens": "274117",
    "Flushing, Queens": "18131",
    "Forest Hills, Queens": "273757",
    "Ridgewood, Queens": "275173",
    "Bayside, Queens": "37309",
    "Woodside, Queens": "199091",

    // === NYC — Bronx neighborhoods (regionType: 7) — verified 2026-05-11 ===
    "Mott Haven, Bronx": "343204",

    // === San Francisco neighborhoods (regionType: 7) — verified 2026-05-11 via Zillow autocomplete API ===
    "Mission, San Francisco": "274552",
    "Castro, San Francisco": "786313",
    "Hayes Valley, San Francisco": "268206",
    "South of Market (SOMA), San Francisco": "268491",
    "Marina District, San Francisco": "274422",
    "Noe Valley, San Francisco": "268338",
    "Pacific Heights, San Francisco": "268385",
    "Russian Hill, San Francisco": "268450",
    "North Beach, San Francisco": "116918",
    "Nob Hill, San Francisco": "268337",
    "Inner Sunset, San Francisco": "268220",
    "Outer Sunset, San Francisco": "268384",
    "Inner Richmond, San Francisco": "268219",
    "Outer Richmond, San Francisco": "268383",
    "Potrero Hill, San Francisco": "268414",
    "Dogpatch, San Francisco": "786298",
    "Bernal Heights, San Francisco": "268020",
    "Tenderloin, San Francisco": "417493",
    "Financial District, San Francisco": "268156",
    "Cow Hollow, San Francisco": "268096",
    "Haight, San Francisco": "268201",
    "Lower Haight, San Francisco": "786317",
    "Japantown, San Francisco": "786318",
    "Glen Park, San Francisco": "268177",
    "Excelsior, San Francisco": "268150",
    "Bayview, San Francisco": "272885",
    "Mission Bay, San Francisco": "268305",
    "South Beach, San Francisco": "207518",
    "Presidio Heights, San Francisco": "268419",
    "Laurel Heights, San Francisco": "417520",
    "Cole Valley, San Francisco": "786328",
    "Duboce Triangle, San Francisco": "417518",
    "Western Addition, San Francisco": "118904",
    "West of Twin Peaks, San Francisco": "268589",
    "Forest Hill, San Francisco": "255961",
    "Lake, San Francisco": "256657",
    "Visitacion Valley, San Francisco": "268570",
    "Portola, San Francisco": "117447",
    "Crocker Amazon, San Francisco": "273404",
    "Alamo Square, San Francisco": "417523",
    "Chinatown, San Francisco": "114291",
    "Civic Center, San Francisco": "786323",
    "Hunters Point, San Francisco": "268218",
    "Diamond Heights, San Francisco": "268110",
    "Telegraph Hill, San Francisco": "268517",
  },
  multiNeighborhoodSupport: "single",
  jsonLd: {
    types: ["RealEstateListing", "Product", "BreadcrumbList"],
    available: true,
    fieldMap: {
      "name": "title",
      "url": "listingUrl",
      "offers.itemOffered.@type": "propertyType",
      "offers.itemOffered.floorSize": "floorSize",
      "offers.itemOffered.numberOfBedrooms": "bedrooms",
      "offers.itemOffered.address": "address",
      "BreadcrumbList.itemListElement": "locationHierarchy",
    },
    notes:
      "Bot-protected by PerimeterX — JSON-LD is only present when the HTML " +
      "is successfully fetched (requires residential proxy or browser session). " +
      "RealEstateListing contains the main listing data; BreadcrumbList " +
      "provides the location hierarchy (state → city → neighborhood).",
  },
  promptGuidance: [
    "- `knownLocations` mixes two types: whole-city entries (format like 'San Francisco, CA (san-francisco-ca): 20330') and neighborhood entries (format like 'Marina District, San Francisco: 274422'). They are NOT interchangeable.",
    "- `citySlug` is REQUIRED — read it from the parenthetical of the city entry (e.g. 'san-francisco-ca' from 'San Francisco, CA (san-francisco-ca)').",
    "- `regionSelection` is REQUIRED — never omit it. Without a region, Zillow has no geographic anchor and returns zero listings.",
    "- **One neighborhood per URL.** Zillow's multi-region URL does NOT actually filter — passing 3 neighborhoods in `regionSelection` falls back to city-wide. The caller is responsible for fanning out to N URLs when the collection has N neighborhoods; you will be invoked once per neighborhood with a single entry in `Preferred neighborhoods`. Build `regionSelection` with that single neighborhood (`regionType: 7`).",
    "- When the context still arrives with multiple neighborhoods (caller forgot to fan out), pick the first one — do NOT multi-region.",
    "- When no preferred neighborhoods are listed: use the whole-city entry with `regionType: 6`.",
    "- For property-type flags (`tow`, `con`, `apa`, `apco`, `mf`): OMIT them entirely to include all types (Zillow's default). Only set to `false` to EXCLUDE a type.",
    "- **Amenity filters (`lau`, `ac`, `os`, `pool`, `parka`, `dish`, `hrdwd`, `fit`, etc.) are EXTREMELY aggressive at neighborhood level — each one cuts inventory by 50-80%.** Verified empirically: `lau: { value: true }` on Hell's Kitchen (thousands of rentals) returned zero results. Set at most 1 amenity flag, and only when the user named it as an absolute dealbreaker. For nice-to-haves, OMIT them entirely — post-import scoring against the story handles them more accurately than portal filters do.",
    "- For STUDIOS, set `beds: { min: 0, max: 0 }` explicitly. A missing `min` defaults to 'any' and breaks the filter. Same shape for '1BR only': `{ min: 1, max: 1 }`.",
  ].join("\n"),
  examples: [
    {
      description: "Rent in SF, 2BR, max $4,200/mo, neighborhood = ['Marina District']",
      params: {
        citySlug: "san-francisco-ca",
        usersSearchTerm: "San Francisco, CA",
        regionSelection: [{ regionId: 274422, regionType: 7 }],
        filterState: {
          fr: { value: true },
          mp: { max: 4200 },
          beds: { min: 2 },
          sort: { value: "days" },
        },
      },
    },
    {
      description: "Buy in NYC, no neighborhoods specified, budget $1.5M",
      params: {
        citySlug: "new-york-ny",
        usersSearchTerm: "New York, NY",
        regionSelection: [{ regionId: 6181, regionType: 6 }],
        filterState: {
          price: { max: 1500000 },
          beds: { min: 1 },
        },
      },
    },
    {
      description: "Rent in SF, single neighborhood = ['Cow Hollow']",
      params: {
        citySlug: "san-francisco-ca",
        usersSearchTerm: "San Francisco, CA",
        regionSelection: [{ regionId: 268096, regionType: 7 }],
        filterState: {
          fr: { value: true },
          mp: { max: 4200 },
          beds: { min: 2 },
        },
      },
    },
  ],
};
