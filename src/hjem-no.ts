import { z } from "zod";

import type { ProviderUrlConfig } from "./index.js";
import { serializeAsQueryParams } from "./index.js";

// ============================================================================
// HJEM.NO QUERY PARAMETER SCHEMA
// ============================================================================
//
// Verified against the live site on 2026-04-26 via browser automation.
// Param names discovered by interacting with the filter UI and observing
// URL changes. Unlike Finn.no (numeric codes), hjem.no uses English
// string identifiers for most filter values.
//
// Two modes:
//   - Til salgs (buy): /list?address=...
//   - Til leie (rent): /list?acquisition=rent&address=...
//
// Base URL: https://hjem.no/list
// ============================================================================

// ---------------------------------------------------------------------------
// Property type codes (from data-test attributes)
// ---------------------------------------------------------------------------

export const HJEM_PROPERTY_TYPES = {
  /** Alle (all types) */
  ALL: "all",
  /** Enebolig (detached house / single dwelling) */
  SINGLE_DWELLING: "single_dwelling",
  /** Tomannsbolig (duplex / twin dwelling) */
  TWIN_DWELLING: "twin_dwelling",
  /** Leilighet (apartment) */
  APARTMENT: "apartment",
  /** Rekkehus (townhouse / row house) */
  TOWNHOUSE: "townhouse",
  /** Garasje / Parkeringsplass */
  GARAGE_PARKING: "garage_parking",
} as const;

// ---------------------------------------------------------------------------
// Boligannonse (listing category) codes
// ---------------------------------------------------------------------------
// These are the top-level icon tabs: Alle, Bolig, Hytte og fritid, Nybygg, Kontor og næring

export const HJEM_LISTING_CATEGORIES = {
  ALL: "all",
  RESIDENTIAL: "residential",
  CABIN_LEISURE: "cabin_leisure",
  NEW_BUILD: "new_build",
  COMMERCIAL: "commercial",
} as const;

// ---------------------------------------------------------------------------
// Sale status codes
// ---------------------------------------------------------------------------

export const HJEM_SALE_STATUS = {
  /** Til salgs (for sale — active listing) */
  AVAILABLE: "available",
  /** Solgt (sold) */
  SOLD: "sold",
  /** Kommer for salg (coming soon / future) */
  FUTURE: "future",
} as const;

// ---------------------------------------------------------------------------
// Property condition
// ---------------------------------------------------------------------------

export const HJEM_PROPERTY_CONDITION = {
  /** Brukt (used / existing) */
  USED: "used",
  /** Nytt (new construction) */
  NEW: "new",
} as const;

// ---------------------------------------------------------------------------
// Ownership type codes
// ---------------------------------------------------------------------------

export const HJEM_OWNERSHIP_TYPES = {
  /** Aksje (share/stock — housing cooperative share) */
  STOCK: "stock",
  /** Andel (co-op share — borettslag) */
  SHARE: "share",
  /** Eier / Selveier (freehold / self-owned) */
  FREEHOLD: "freehold",
  /** Obligasjon (bond/obligation) */
  COOPERATIVE: "cooperative",
  /** Annet (other) */
  OTHER: "other",
} as const;

// ---------------------------------------------------------------------------
// Floor filter values
// ---------------------------------------------------------------------------

export const HJEM_FLOOR_VALUES = {
  /** Alle (all floors) */
  ALL: "all",
  /** Ikke 1. etasje (not ground floor) */
  NOT_FIRST: "not-first",
  /** 1. etasje */
  FLOOR_1: "1",
  /** 2. etasje */
  FLOOR_2: "2",
} as const;

// ---------------------------------------------------------------------------
// Facilities codes
// ---------------------------------------------------------------------------

export const HJEM_FACILITIES = {
  /** Balkong/Terrasse (balcony/terrace) */
  BALCONY: "balcony",
  /** Garasje/Parkering (garage/parking) */
  GARAGE_PARKING: "garageParking",
  /** Heis (elevator/lift) */
  ELEVATOR: "elevator",
  /** Peis/Ildsted (fireplace) */
  FIREPLACE: "fireplace",
} as const;

// ---------------------------------------------------------------------------
// Sold by type
// ---------------------------------------------------------------------------

export const HJEM_SOLD_BY = {
  /** Privat (private / FSBO) */
  PRIVATE: "user",
  /** Megler (broker/agent) */
  BROKER: "api",
} as const;

// ---------------------------------------------------------------------------
// Transportation distance
// ---------------------------------------------------------------------------

export const HJEM_TRANSPORT_DISTANCE = {
  ANY: "any",
  M100: "100",
  M250: "250",
  M500: "500",
  M750: "750",
  KM1: "1000",
} as const;

// ============================================================================
// ZOD SCHEMA
// ============================================================================

export const hjemNoParamsSchema = z.object({
  // --- Acquisition type ---
  acquisition: z
    .enum(["buy", "rent"])
    .optional()
    .describe(
      "Acquisition type. 'buy' = til salgs (default), 'rent' = til leie. " +
        "Omit or set to 'buy' for sale listings.",
    ),

  // --- Location ---
  address: z
    .string()
    .optional()
    .describe(
      "Location search string. Examples: 'oslo', 'bergen', 'trondheim', " +
        "'frogner', 'grünerløkka'. Free-text, matched by hjem.no's search.",
    ),

  // --- Property type ---
  propertyType: z
    .enum([
      "all",
      "single_dwelling",
      "twin_dwelling",
      "apartment",
      "townhouse",
      "garage_parking",
    ])
    .optional()
    .describe(
      "Property type filter. " +
        "all=alle, single_dwelling=enebolig, twin_dwelling=tomannsbolig, " +
        "apartment=leilighet, townhouse=rekkehus, garage_parking=garasje/parkering.",
    ),

  // --- Sale status ---
  saleStatus: z
    .enum(["available", "sold", "future"])
    .optional()
    .describe(
      "Sale status filter. " +
        "available=til salgs, sold=solgt, future=kommer for salg.",
    ),

  // --- Property condition ---
  propertyCondition: z
    .enum(["used", "new"])
    .optional()
    .describe("Property condition. used=brukt bolig, new=nybygg."),

  // --- Price (prisantydning / asking price for buy, monthly for rent) ---
  priceMin: z
    .number()
    .optional()
    .describe("Minimum price in NOK."),
  priceMax: z
    .number()
    .optional()
    .describe("Maximum price in NOK."),

  // --- Total price (totalpris including shared debt, buy only) ---
  totalPriceMin: z
    .number()
    .optional()
    .describe("Buy only. Minimum totalpris (including fellesgjeld)."),
  totalPriceMax: z
    .number()
    .optional()
    .describe("Buy only. Maximum totalpris."),

  // --- Monthly costs (felleskostnader, buy only) ---
  monthlyExpenseMin: z
    .number()
    .optional()
    .describe("Buy only. Minimum monthly housing costs (felleskostnader) in NOK."),
  monthlyExpenseMax: z
    .number()
    .optional()
    .describe("Buy only. Maximum monthly housing costs in NOK."),

  // --- Bedrooms ---
  bedroomMin: z
    .enum(["1", "2", "3", "4", "5"])
    .optional()
    .describe(
      "Minimum number of bedrooms. Values: '1', '2', '3', '4', '5'. " +
        "Displayed as 1+, 2+, 3+, etc.",
    ),

  // --- Area ---
  areaMin: z
    .number()
    .optional()
    .describe("Minimum living area in square meters (m²)."),
  areaMax: z
    .number()
    .optional()
    .describe("Maximum living area in m²."),

  // --- Ownership type (buy only) ---
  ownerType: z
    .enum(["stock", "share", "freehold", "cooperative", "other"])
    .optional()
    .describe(
      "Buy only. Ownership type. " +
        "stock=aksje, share=andel (borettslag), freehold=eier (selveier), " +
        "cooperative=obligasjon, other=annet.",
    ),

  // --- Construction year ---
  yearBuiltMin: z
    .number()
    .optional()
    .describe("Minimum construction year."),
  yearBuiltMax: z
    .number()
    .optional()
    .describe("Maximum construction year."),

  // --- Sold by ---
  soldBy: z
    .enum(["user", "api"])
    .optional()
    .describe("Seller type. user=privat, api=megler (broker)."),

  // --- Floor ---
  floor: z
    .enum(["all", "not-first", "1", "2"])
    .optional()
    .describe(
      "Floor preference. all=alle, not-first=ikke 1. etasje, " +
        "'1'=1. etasje, '2'=2. etasje.",
    ),

  // --- Facilities ---
  facilities: z
    .array(z.enum(["balcony", "garageParking", "elevator", "fireplace"]))
    .optional()
    .describe(
      "Facility/amenity filters. " +
        "balcony=balkong/terrasse, garageParking=garasje/parkering, " +
        "elevator=heis, fireplace=peis/ildsted.",
    ),

  // --- Transportation distance ---
  transportDistance: z
    .enum(["100", "250", "500", "750", "1000"])
    .optional()
    .describe(
      "Maximum distance to public transport stop in meters. " +
        "100, 250, 500, 750, or 1000.",
    ),

  // --- Map view ---
  view: z
    .enum(["map", "list"])
    .optional()
    .describe("View mode. 'map' for map view, 'list' for list view (default)."),

  // --- Viewing dates (buy only) ---
  viewDate: z
    .string()
    .optional()
    .describe(
      "Filter by viewing date. Uses Unix timestamp (seconds). " +
        "Multiple dates can be specified.",
    ),
});

export type HjemNoParams = z.infer<typeof hjemNoParamsSchema>;

// ============================================================================
// PROVIDER CONFIG
// ============================================================================

export const hjemNoConfig: ProviderUrlConfig = {
  id: "hjem.no",
  name: "Hjem.no",
  baseUrls: {
    buy: "https://hjem.no/list",
    rent: "https://hjem.no/list",
  },
  params: hjemNoParamsSchema,
  serialize: (baseUrl, params) => {
    const p = params as Record<string, unknown>;
    // For rent, add acquisition=rent
    if (baseUrl.includes("rent") || p.acquisition === "rent") {
      p.acquisition = "rent";
    }
    return serializeAsQueryParams(baseUrl, p);
  },
  knownLocations: {
    Oslo: "oslo",
    Bergen: "bergen",
    Trondheim: "trondheim",
    Stavanger: "stavanger",
    Tromsø: "tromsø",
    Drammen: "drammen",
    Kristiansand: "kristiansand",
    Fredrikstad: "fredrikstad",
    Frogner: "frogner",
    "Grünerløkka": "grünerløkka",
    Majorstuen: "majorstuen",
    "St. Hanshaugen": "st. hanshaugen",
    Sagene: "sagene",
    Tøyen: "tøyen",
    Bøler: "bøler",
  },
};
