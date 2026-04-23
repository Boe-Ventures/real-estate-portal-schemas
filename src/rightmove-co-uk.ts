import { z } from "zod";

import type { ProviderUrlConfig } from "./index.js";
import { serializeAsQueryParams } from "./index.js";

// ============================================================================
// RIGHTMOVE QUERY PARAMETER SCHEMA
// ============================================================================
//
// Verified against the live site on 2026-04-22 via agent-browser automation.
// Rightmove uses clean, readable query params on a server-rendered page.
//
// URL format: /property-to-{rent|sale}/find.html?locationIdentifier=REGION^{id}&...
//
// Location uses REGION^{id} format (URL-encoded as REGION%5E{id}).
// All filters are simple query params with human-readable names.
// ============================================================================

// ---------------------------------------------------------------------------
// Property type values
// ---------------------------------------------------------------------------

export const RIGHTMOVE_PROPERTY_TYPES = {
  DETACHED: "detached",
  SEMI_DETACHED: "semi-detached",
  TERRACED: "terraced",
  FLAT: "flat",
  BUNGALOW: "bungalow",
  LAND: "land",
  PARK_HOME: "park-home",
  STUDENT_HALLS: "student-halls",
} as const;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

export const rightmoveParamsSchema = z.object({
  // --- Location ---
  locationIdentifier: z
    .string()
    .describe(
      "Location identifier. Format: 'REGION^{id}' for regions/cities. " +
        "Examples: 'REGION^87490' = London, 'REGION^475' = Manchester, " +
        "'REGION^904' = Edinburgh, 'REGION^219' = Birmingham. " +
        "Use knownLocations for mappings.",
    ),

  // --- Price ---
  minPrice: z
    .number()
    .optional()
    .describe(
      "Minimum price. Rent: per calendar month (PCM) in GBP. " +
        "Buy: total price in GBP.",
    ),
  maxPrice: z.number().optional().describe("Maximum price in GBP."),

  // --- Bedrooms ---
  minBedrooms: z
    .number()
    .optional()
    .describe("Minimum bedrooms (0=studio, 1-10)."),
  maxBedrooms: z
    .number()
    .optional()
    .describe("Maximum bedrooms (0=studio, 1-10)."),

  // --- Bathrooms ---
  minBathrooms: z.number().optional().describe("Minimum bathrooms (1-5)."),
  maxBathrooms: z.number().optional().describe("Maximum bathrooms (1-5)."),

  // --- Property type ---
  propertyTypes: z
    .string()
    .optional()
    .describe(
      "Property types (comma-separated). Values: " +
        "'detached', 'semi-detached', 'terraced', 'flat', " +
        "'bungalow', 'land', 'park-home', 'student-halls'. " +
        "Example: 'flat,terraced' for flats and terraced houses.",
    ),

  // --- Furnished type (rent only) ---
  furnishTypes: z
    .string()
    .optional()
    .describe(
      "Rent only. Furnished status (comma-separated). Values: " +
        "'furnished', 'partFurnished', 'unfurnished'.",
    ),

  // --- Let type (rent only) ---
  letType: z
    .enum(["longTerm", "shortTerm"])
    .optional()
    .describe("Rent only. Lease type. 'longTerm' or 'shortTerm'."),

  // --- Must have ---
  mustHave: z
    .string()
    .optional()
    .describe(
      "Required features (comma-separated). Values: " + "'garden', 'parking'.",
    ),

  // --- Don't show ---
  dontShow: z
    .string()
    .optional()
    .describe(
      "Exclude listing types (comma-separated). Values: " +
        "'houseShare', 'retirement', 'student'.",
    ),

  // --- Radius ---
  radius: z
    .number()
    .optional()
    .describe(
      "Search radius in miles. Values: 0 (this area only), " +
        "0.25, 0.5, 1, 3, 5, 10, 15, 20, 30, 40.",
    ),

  // --- Date added ---
  maxDaysSinceAdded: z
    .number()
    .optional()
    .describe(
      "Maximum days since listing was added. Values: " +
        "1 (24 hours), 3, 7, 14. Omit for 'anytime'.",
    ),

  // --- Include let agreed ---
  includeLetAgreed: z
    .enum(["true", "false"])
    .optional()
    .describe("Rent only. Include listings already let agreed. Default false."),

  // --- Sort ---
  sortType: z
    .enum(["1", "2", "6", "10", "12"])
    .optional()
    .describe(
      "Sort order. 1=highest price, 2=lowest price, " +
        "6=newest listed, 10=oldest listed, 12=most reduced. " +
        "Default is newest listed.",
    ),

  // --- Keywords ---
  keywords: z
    .string()
    .optional()
    .describe("Free-text keyword search. E.g. 'balcony', 'concierge', 'gym'."),

  // --- Pagination ---
  index: z
    .number()
    .optional()
    .describe(
      "Pagination offset. 0 for first page, 24 for second page, etc. (24 per page).",
    ),
});

export type RightmoveParams = z.infer<typeof rightmoveParamsSchema>;

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

export const rightmoveConfig: ProviderUrlConfig = {
  id: "rightmove.co.uk",
  name: "Rightmove",
  baseUrls: {
    buy: "https://www.rightmove.co.uk/property-for-sale/find.html",
    rent: "https://www.rightmove.co.uk/property-to-rent/find.html",
  },
  params: rightmoveParamsSchema,
  serialize: (baseUrl, params) =>
    serializeAsQueryParams(baseUrl, params as Record<string, unknown>),
  knownLocations: {
    // Major UK cities — REGION^{id} format
    // Verified: London = 87490 (confirmed via URL test returning 29,787 results)
    London: "REGION^87490",
    // TODO: verify remaining city codes via search
    Manchester: "REGION^475",
    Birmingham: "REGION^219",
    Edinburgh: "REGION^904",
    Glasgow: "REGION^1364",
    Liverpool: "REGION^1260",
    Bristol: "REGION^267",
    Leeds: "REGION^1255",
    Sheffield: "REGION^1395",
    Newcastle: "REGION^1318",
    Cambridge: "REGION^300",
    Oxford: "REGION^1354",
    Brighton: "REGION^1521",
    Bath: "REGION^185",
    Cardiff: "REGION^313",
    Belfast: "REGION^197",
    Nottingham: "REGION^1344",
  },
};
