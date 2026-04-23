import { z } from "zod";

import type { ProviderUrlConfig } from "./index.js";
import { serializeAsQueryParams } from "./index.js";

// ============================================================================
// CRAIGSLIST QUERY PARAMETER SCHEMA
// ============================================================================
//
// Verified against the live site on 2026-04-23 via web_fetch URL testing.
// Craigslist uses city-specific subdomains + simple query params.
//
// URL format: https://{city}.craigslist.org/search/{category}?params
//
// Categories: apa = apartments, rea = real estate (for sale),
//   sub = sublets, roo = rooms, hhh = housing (all)
//
// Simple, minimal filters. No SPA, no auth, no captcha.
// ============================================================================

// ---------------------------------------------------------------------------
// Housing type codes
// ---------------------------------------------------------------------------

export const CRAIGSLIST_HOUSING_TYPES = {
  /** Apartment */
  APARTMENT: "1",
  /** Condo */
  CONDO: "2",
  /** Cottage/Cabin */
  COTTAGE: "3",
  /** Duplex */
  DUPLEX: "4",
  /** Flat */
  FLAT: "5",
  /** House */
  HOUSE: "6",
  /** In-law */
  IN_LAW: "7",
  /** Loft */
  LOFT: "8",
  /** Townhouse */
  TOWNHOUSE: "9",
  /** Manufactured */
  MANUFACTURED: "10",
  /** Assisted living */
  ASSISTED_LIVING: "11",
  /** Land */
  LAND: "12",
} as const;

// ---------------------------------------------------------------------------
// Laundry options
// ---------------------------------------------------------------------------

export const CRAIGSLIST_LAUNDRY = {
  /** W/D in unit */
  IN_UNIT: "1",
  /** W/D hookups */
  HOOKUPS: "2",
  /** Laundry in building */
  IN_BUILDING: "3",
  /** Laundry on site */
  ON_SITE: "4",
  /** No laundry on site */
  NONE: "5",
} as const;

// ---------------------------------------------------------------------------
// Parking options
// ---------------------------------------------------------------------------

export const CRAIGSLIST_PARKING = {
  /** Carport */
  CARPORT: "1",
  /** Attached garage */
  ATTACHED_GARAGE: "2",
  /** Detached garage */
  DETACHED_GARAGE: "3",
  /** Off-street parking */
  OFF_STREET: "4",
  /** Street parking */
  STREET: "5",
  /** Valet parking */
  VALET: "6",
  /** No parking */
  NONE: "7",
} as const;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

export const craigslistParamsSchema = z.object({
  // --- City subdomain ---
  city: z
    .string()
    .describe(
      "City subdomain. Examples: 'newyork', 'sfbay', 'losangeles', 'chicago', " +
        "'seattle', 'boston', 'miami', 'denver', 'portland', 'austin', 'washingtondc'. " +
        "Use knownLocations for the full mapping.",
    ),

  // --- Category ---
  category: z
    .enum(["apa", "rea", "sub", "roo", "hhh"])
    .default("apa")
    .describe(
      "Search category. 'apa' = apartments/housing for rent (default), " +
        "'rea' = real estate for sale, 'sub' = sublets/temporary, " +
        "'roo' = rooms/shared, 'hhh' = all housing.",
    ),

  // --- Price ---
  min_price: z
    .number()
    .optional()
    .describe("Minimum price. Rent: monthly. Sale: total price."),
  max_price: z
    .number()
    .optional()
    .describe("Maximum price."),

  // --- Bedrooms ---
  min_bedrooms: z
    .number()
    .optional()
    .describe("Minimum bedrooms (1-8)."),
  max_bedrooms: z
    .number()
    .optional()
    .describe("Maximum bedrooms (1-8)."),

  // --- Bathrooms ---
  min_bathrooms: z
    .number()
    .optional()
    .describe("Minimum bathrooms (1-8)."),

  // --- Square footage ---
  min_sqft: z
    .number()
    .optional()
    .describe("Minimum square footage. May be silently ignored by some city pages."),
  max_sqft: z
    .number()
    .optional()
    .describe("Maximum square footage."),

  // --- Housing type ---
  housing_type: z
    .array(z.string())
    .optional()
    .describe(
      "Housing type codes (can select multiple, repeated param). " +
        "1=apartment, 2=condo, 3=cottage, 4=duplex, 5=flat, " +
        "6=house, 7=in-law, 8=loft, 9=townhouse, 10=manufactured, " +
        "11=assisted living, 12=land.",
    ),

  // --- Pets ---
  pets_cat: z
    .enum(["1"])
    .optional()
    .describe("Cats allowed. Set to '1' to filter."),
  pets_dog: z
    .enum(["1"])
    .optional()
    .describe("Dogs allowed. Set to '1' to filter."),

  // --- Laundry ---
  laundry: z
    .array(z.string())
    .optional()
    .describe(
      "Laundry options (can select multiple, repeated param). " +
        "1=W/D in unit, 2=W/D hookups, 3=laundry in bldg, " +
        "4=laundry on site, 5=no laundry.",
    ),

  // --- Parking ---
  parking: z
    .array(z.string())
    .optional()
    .describe(
      "Parking options (can select multiple, repeated param). " +
        "1=carport, 2=attached garage, 3=detached garage, " +
        "4=off-street, 5=street, 6=valet, 7=no parking.",
    ),

  // --- Other filters ---
  no_smoking: z
    .enum(["1"])
    .optional()
    .describe("No smoking. Set to '1'."),
  is_furnished: z
    .enum(["1"])
    .optional()
    .describe("Furnished only. Set to '1'."),
  wheelchaccess: z
    .enum(["1"])
    .optional()
    .describe("Wheelchair accessible. Set to '1'."),
  airconditioning: z
    .enum(["1"])
    .optional()
    .describe("Has air conditioning. Set to '1'."),
  ev_charging: z
    .enum(["1"])
    .optional()
    .describe("Has EV charging. Set to '1'."),

  // --- Availability ---
  availabilityMode: z
    .enum(["0"])
    .optional()
    .describe("Set to '0' to show listings with specific availability dates."),

  // --- Search query ---
  query: z
    .string()
    .optional()
    .describe("Free-text keyword search."),

  // --- Sort & pagination ---
  sort: z
    .enum(["date", "priceasc", "pricedsc"])
    .optional()
    .describe("Sort order. 'date' = newest, 'priceasc' = cheapest, 'pricedsc' = most expensive."),

  postedToday: z
    .enum(["1"])
    .optional()
    .describe("Only show listings posted today. Set to '1'."),
});

export type CraigslistParams = z.infer<typeof craigslistParamsSchema>;

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

function serializeCraigslistUrl(baseUrl: string, params: unknown): string {
  const p = params as CraigslistParams & { city?: string; category?: string };

  const city = p.city || "newyork";
  const category = p.category || "apa";
  const urlBase = `https://${city}.craigslist.org/search/${category}`;

  // Build query params (exclude city and category)
  const queryParams: Record<string, unknown> = { ...p };
  delete queryParams.city;
  delete queryParams.category;

  return serializeAsQueryParams(urlBase, queryParams);
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

export const craigslistConfig: ProviderUrlConfig = {
  id: "craigslist.org",
  name: "Craigslist",
  baseUrls: {
    rent: "https://craigslist.org",
    buy: "https://craigslist.org",
  },
  params: craigslistParamsSchema,
  serialize: serializeCraigslistUrl,
  knownLocations: {
    // Major US cities — city subdomain mapping
    "New York": "newyork",
    "San Francisco": "sfbay",
    "Los Angeles": "losangeles",
    "Chicago": "chicago",
    "Seattle": "seattle",
    "Boston": "boston",
    "Miami": "miami",
    "Denver": "denver",
    "Portland": "portland",
    "Austin": "austin",
    "Washington DC": "washingtondc",
    "Houston": "houston",
    "Dallas": "dallas",
    "Philadelphia": "philadelphia",
    "Phoenix": "phoenix",
    "San Diego": "sandiego",
    "San Jose": "sanjose",
    "Atlanta": "atlanta",
    "Minneapolis": "minneapolis",
    "Nashville": "nashville",
    "Detroit": "detroit",
    "Las Vegas": "lasvegas",
    "Baltimore": "baltimore",
    "Raleigh": "raleigh",
    "Tampa": "tampa",
    "Honolulu": "honolulu",
    "New Orleans": "neworleans",
    "Salt Lake City": "saltlakecity",
    "Pittsburgh": "pittsburgh",
    "Columbus": "columbus",
    "Charlotte": "charlotte",
    "Indianapolis": "indianapolis",
    "Orlando": "orlando",
    "St. Louis": "stlouis",
    "Cincinnati": "cincinnati",
    "Cleveland": "cleveland",
    "Kansas City": "kansascity",
    "Milwaukee": "milwaukee",
    "Tucson": "tucson",
    "Sacramento": "sacramento",
    "Boulder": "boulder",
  },
};
