import { z } from "zod";

import type { ProviderUrlConfig } from "./index.js";
import { serializeAsQueryParams } from "./index.js";

// ============================================================================
// FINN.NO QUERY PARAMETER SCHEMA
// ============================================================================
//
// Verified against the live site on 2026-04-22 via browser automation.
// Each code was tested by navigating to a URL with the param and confirming
// the filter chip shown on the page.
//
// Two endpoints:
//   - /realestate/homes/search.html   (buy: "bolig til salgs")
//   - /realestate/lettings/search.html (rent: "bolig til leie")
//
// Most params are shared; some are endpoint-specific (noted in .describe()).
// ============================================================================

// ---------------------------------------------------------------------------
// Property type codes
// ---------------------------------------------------------------------------
// Shared between buy and rent, but not all codes appear on both endpoints.

export const FINN_PROPERTY_TYPES = {
  /** Enebolig (detached house) — buy + rent */
  HOUSE: "1",
  /** Tomannsbolig (duplex/semi-detached) — buy + rent */
  DUPLEX: "2",
  /** Leilighet (apartment/flat) — buy + rent */
  APARTMENT: "3",
  /** Rekkehus (row house/terraced) — buy + rent */
  ROW_HOUSE: "4",
  /** Garasje/Parkering — buy + rent */
  PARKING: "6",
  /** Produksjon/Industri (production/industrial) — buy only */
  INDUSTRIAL: "9",
  /** Gårdsbruk/Småbruk (farm/smallholding) — buy only */
  FARM: "11",
  /** Hytte (cabin/holiday home) — rent only */
  CABIN: "12",
  /** Hybel (bedsit/studio room) — rent only */
  BEDSIT: "16",
  /** Rom i bofellesskap (shared housing/room in collective) — rent only */
  SHARED_ROOM: "17",
  /** Andre (other) — buy + rent */
  OTHER: "18",
} as const;

// ---------------------------------------------------------------------------
// Facility codes
// ---------------------------------------------------------------------------
// Buy page has 10 facilities. Rent page has additional ones.

export const FINN_FACILITIES = {
  /** Balkong/Terrasse (balcony/terrace) — buy + rent */
  BALCONY: "1",
  /** Peis/Ildsted (fireplace) — buy + rent */
  FIREPLACE: "2",
  /** Heis (elevator/lift) — buy + rent */
  ELEVATOR: "4",
  /** Ingen gjenboere (no overlooking neighbors) — buy + rent */
  NO_NEIGHBORS: "5",
  /** Strandlinje (waterfront) — buy + rent */
  WATERFRONT: "17",
  /** Turterreng (hiking/outdoor access) — buy + rent */
  HIKING: "22",
  /** Garasje/P-plass (garage/parking spot) — buy + rent */
  PARKING: "23",
  /** Vaktmester-/vektertjeneste (caretaker/security) — buy + rent */
  CARETAKER: "30",
  /** Utsikt (view) — buy + rent */
  VIEW: "209",
  /** Lademulighet (EV charging) — buy + rent */
  EV_CHARGING: "238",

  // --- Rent-only facilities ---
  /** Moderne (modern/renovated) — rent only */
  MODERN: "12",
  /** Aircondition — rent only */
  AC: "16",
  /** Fellesvaskeri (shared laundry) — rent only */
  SHARED_LAUNDRY: "24",
  /** Alarm — rent only */
  ALARM: "25",
  /** Bredbåndstilknytning (broadband connection) — rent only */
  BROADBAND: "28",
} as const;

// ---------------------------------------------------------------------------
// Ownership type codes (buy only)
// ---------------------------------------------------------------------------

export const FINN_OWNERSHIP_TYPES = {
  /** Obligasjon (bond/obligation) */
  BOND: "1",
  /** Aksje (share/stock — housing cooperative share) */
  SHARE: "2",
  /** Selveier (freehold/self-owned) */
  FREEHOLD: "3",
  /** Andel (co-op share — borettslag) */
  COOP: "4",
  /** Annet (other) */
  OTHER: "255",
} as const;

// ---------------------------------------------------------------------------
// Lifecycle / sale status codes (buy only)
// ---------------------------------------------------------------------------

export const FINN_LIFECYCLE = {
  /** Til salgs (for sale — active listing) */
  FOR_SALE: "1",
  /** Solgt siste 3 dager (sold in last 3 days) */
  RECENTLY_SOLD: "2",
  /** Kommer for salg (coming soon) */
  COMING_SOON: "3",
} as const;

// ---------------------------------------------------------------------------
// Floor navigator values
// ---------------------------------------------------------------------------

export const FINN_FLOOR_VALUES = {
  /** Ikke 1. etasje (not ground floor) */
  NOT_FIRST: "NOTFIRST",
  /** 1. etasje (ground floor) */
  FLOOR_1: "1",
  /** 2. etasje */
  FLOOR_2: "2",
  /** 3. etasje — verified via browser */
  FLOOR_3: "3",
  /** 4. etasje */
  FLOOR_4: "4",
  /** 5. etasje */
  FLOOR_5: "5",
  /** 6. etasje */
  FLOOR_6: "6",
  // TODO: verify "Over 6. etasje" — likely "OVER6" or "7"
} as const;

// ---------------------------------------------------------------------------
// Energy rating codes (buy only)
// ---------------------------------------------------------------------------
// TODO: verify exact codes via browser. The UI shows A-G checkboxes.
// Likely: energy_rating=A, energy_rating=B, etc. — or numeric 1-7.
// Deferred until next browser session.

// ---------------------------------------------------------------------------
// Sort values
// ---------------------------------------------------------------------------
// Buy sort options (from the <select> on the page):
//   Publisert, Prisant høy-lav, Prisant lav-høy, Tot pris høy-lav,
//   Tot pris lav-høy, Areal høy-lav, Areal lav-høy, Kvmeterpris høy-lav,
//   Kvmeterpris lav-høy, Mest relevant, Nærmest
//
// Rent sort options:
//   Publisert, Leie høy-lav, Leie lav-høy, Areal høy-lav, Areal lav-høy,
//   Mest relevant, Nærmest
//
// TODO: verify exact sort param values. The old code had PUBLISHED_DESC,
// PRICE_ASC, PRICE_DESC, AREA_ASC, AREA_DESC — likely correct but unverified.

// ============================================================================
// ZOD SCHEMA
// ============================================================================

export const finnNoParamsSchema = z.object({
  // --- Location ---
  location: z
    .string()
    .optional()
    .describe(
      "Finn.no hierarchical location code. Format: 'depth.regionId' or 'depth.regionId.subRegionId'. " +
        "Examples: '0.20061' = Oslo, '0.20016' = Bergen, '1.20061.20512' = Grünerløkka (Oslo sub-district). " +
        "Supports multiple values (repeated param). Use knownLocations lookup.",
    ),

  // --- Price (shared key, different semantics per endpoint) ---
  price_from: z
    .number()
    .optional()
    .describe(
      "Minimum price in NOK. " +
        "Buy: prisantydning (asking price), e.g. 3000000. " +
        "Rent: månedsleie (monthly rent), e.g. 10000.",
    ),
  price_to: z
    .number()
    .optional()
    .describe(
      "Maximum price in NOK. " +
        "Buy: prisantydning (asking price). " +
        "Rent: månedsleie (monthly rent).",
    ),

  // --- Total price including shared debt (buy only) ---
  price_collective_from: z
    .number()
    .optional()
    .describe(
      "Buy only. Minimum totalpris — total price including fellesgjeld (shared debt). " +
        "Usually set slightly below price_from to catch listings with varying debt.",
    ),
  price_collective_to: z
    .number()
    .optional()
    .describe("Buy only. Maximum totalpris. Usually set above price_to."),

  // --- Monthly costs / felleskostnader (buy only) ---
  rent_from: z
    .number()
    .optional()
    .describe(
      "Buy only. Minimum monthly housing costs (felleskostnader/fellesutgifter) in NOK.",
    ),
  rent_to: z
    .number()
    .optional()
    .describe("Buy only. Maximum monthly housing costs in NOK."),

  // --- Area ---
  area_from: z
    .number()
    .optional()
    .describe("Minimum living area in square meters (m²)."),
  area_to: z.number().optional().describe("Maximum living area in m²."),

  // --- Bedrooms ---
  min_bedrooms: z
    .number()
    .optional()
    .describe(
      "Minimum number of bedrooms. Values: 1, 2, 3, 4, 5. " +
        "Displayed as radio buttons (1+, 2+, 3+, etc.).",
    ),

  // --- Property type ---
  property_type: z
    .array(z.enum(["1", "2", "3", "4", "6", "9", "11", "12", "16", "17", "18"]))
    .optional()
    .describe(
      "Property type codes (can select multiple, repeated param). " +
        "1=house (enebolig), 2=duplex (tomannsbolig), 3=apartment (leilighet), " +
        "4=row house (rekkehus), 6=parking (garasje/parkering), " +
        "9=industrial (buy only), 11=farm (buy only), " +
        "12=cabin (rent only), 16=bedsit/hybel (rent only), " +
        "17=shared room (rent only), 18=other. " +
        "Omit for all types.",
    ),

  // --- Facilities ---
  facilities: z
    .array(
      z.enum([
        "1",
        "2",
        "4",
        "5",
        "12",
        "16",
        "17",
        "22",
        "23",
        "24",
        "25",
        "28",
        "30",
        "209",
        "238",
      ]),
    )
    .optional()
    .describe(
      "Facility/amenity codes (can select multiple, repeated param). " +
        "Shared: 1=balcony/terrace, 2=fireplace, 4=elevator, " +
        "5=no overlooking neighbors, 17=waterfront, " +
        "22=hiking/outdoor access, 23=garage/parking, " +
        "30=caretaker/security, 209=view, 238=EV charging. " +
        "Rent-only: 12=modern, 16=AC, 24=shared laundry, 25=alarm, 28=broadband.",
    ),

  // --- Floor ---
  floor_navigator: z
    .union([z.enum(["NOTFIRST"]), z.enum(["1", "2", "3", "4", "5", "6"])])
    .optional()
    .describe(
      "Floor preference. Can be 'NOTFIRST' (exclude ground floor) or a specific floor " +
        "number '1'-'6'. Most useful value is 'NOTFIRST' for people who want to avoid " +
        "ground floor. Specific floors are less commonly used.",
    ),

  // --- Ownership type (buy only) ---
  ownership_type: z
    .array(z.enum(["1", "2", "3", "4", "255"]))
    .optional()
    .describe(
      "Buy only. Ownership type codes (can select multiple, repeated param). " +
        "1=obligasjon (bond), 2=aksje (share), 3=selveier (freehold), " +
        "4=andel (co-op/borettslag), 255=other.",
    ),

  // --- Condition (buy only) ---
  is_new_property: z
    .enum(["true", "false"])
    .optional()
    .describe(
      "Buy only. Property condition. " +
        "'true' = nybygg (new construction), 'false' = brukt bolig (existing/used).",
    ),

  // --- Sale status / lifecycle (buy only) ---
  lifecycle: z
    .array(z.enum(["1", "2", "3"]))
    .optional()
    .describe(
      "Buy only. Sale status (can select multiple, repeated param). " +
        "1=til salgs (for sale), 2=solgt siste 3 dager (sold last 3 days), " +
        "3=kommer for salg (coming soon).",
    ),

  // --- Construction year (buy only) ---
  construction_year_from: z
    .number()
    .optional()
    .describe("Buy only. Minimum construction year, e.g. 1990."),
  construction_year_to: z
    .number()
    .optional()
    .describe("Buy only. Maximum construction year, e.g. 2025."),

  // --- Plot size (buy only) ---
  plot_area_from: z
    .number()
    .optional()
    .describe("Buy only. Minimum plot/land size in m² (tomtestørrelse)."),
  plot_area_to: z
    .number()
    .optional()
    .describe("Buy only. Maximum plot/land size in m²."),

  // --- Pets allowed (rent only) ---
  animals_allowed: z
    .enum(["1"])
    .optional()
    .describe(
      "Rent only. Set to '1' to filter for pet-friendly listings (dyrehold tillatt).",
    ),

  // --- Furnished (rent only) ---
  furnished: z
    .array(z.enum(["9", "10", "11"]))
    .optional()
    .describe(
      "Rent only. Furnished status (can select multiple, repeated param). " +
        "9=møblert (furnished), 10=umøblert (unfurnished), " +
        "11=delvis møblert (partially furnished). " +
        "Note: old code had 1/2 which was WRONG.",
    ),

  // --- Privat/Megler (buy only) ---
  is_private_broker: z
    .enum(["0", "1"])
    .optional()
    .describe(
      "Buy only. Seller type filter. " +
        "0=megler (broker/agent), 1=privat (private/FSBO).",
    ),

  // --- Published / new today ---
  published: z
    .enum(["1"])
    .optional()
    .describe("Set to '1' to filter for listings published today (nye i dag)."),

  // --- Energy label (buy only) ---
  energy_label: z
    .array(z.enum(["1", "2", "3", "4", "5", "6", "7"]))
    .optional()
    .describe(
      "Buy only. Energy rating codes (can select multiple, repeated param). " +
        "1=A, 2=B, 3=C, 4=D, 5=E, 6=F, 7=G. " +
        "A is best (most energy efficient), G is worst.",
    ),

  // --- Digital viewings (buy only) ---
  video_type: z
    .array(z.enum(["1", "2"]))
    .optional()
    .describe(
      "Buy only. Digital viewing type (can select multiple, repeated param). " +
        "1=video, 2=360° visning (360 tour).",
    ),

  // --- FINN hjerterom (rent only) ---
  is_refugees_welcome: z
    .enum(["true"])
    .optional()
    .describe(
      "Rent only. Set to 'true' to filter for FINN hjerterom listings " +
        "(landlords welcoming refugees/humanitarian housing).",
    ),

  // --- Sort ---
  sort: z
    .enum([
      // Shared
      "PUBLISHED_DESC",
      "RELEVANCE",
      "CLOSEST",
      // Buy sort values
      "PRICE_ASKING_DESC",
      "PRICE_ASKING_ASC",
      "PRICE_DESC",
      "PRICE_ASC",
      "AREA_PROM_DESC",
      "AREA_PROM_ASC",
      "PRICE_SQM_DESC",
      "PRICE_SQM_ASC",
      // Rent sort values
      "RENT_DESC",
      "RENT_ASC",
      "AREA_DESC",
      "AREA_ASC",
    ])
    .optional()
    .describe(
      "Sort order. Default is PUBLISHED_DESC (newest first). " +
        "Buy sorts: PRICE_ASKING_ASC/DESC (asking price), PRICE_ASC/DESC (total price), " +
        "AREA_PROM_ASC/DESC (area), PRICE_SQM_ASC/DESC (price per m²), RELEVANCE, CLOSEST. " +
        "Rent sorts: RENT_ASC/DESC (monthly rent), AREA_ASC/DESC (area), RELEVANCE, CLOSEST.",
    ),

  // --- Pagination ---
  page: z
    .number()
    .optional()
    .describe("Page number for paginated results. Starts at 1."),

  // --- Empty filters param (Finn quirk) ---
  filters: z
    .literal("")
    .optional()
    .describe(
      "Finn.no sometimes includes an empty 'filters=' param. " +
        "Safe to omit — included for URL compatibility.",
    ),
});

export type FinnNoParams = z.infer<typeof finnNoParamsSchema>;

// ============================================================================
// PROVIDER CONFIG
// ============================================================================

export const finnNoConfig: ProviderUrlConfig = {
  id: "finn.no",
  name: "Finn.no",
  baseUrls: {
    buy: "https://www.finn.no/realestate/homes/search.html",
    rent: "https://www.finn.no/realestate/lettings/search.html",
    // rent_short: not natively supported on Finn.no
  },
  params: finnNoParamsSchema,
  serialize: (baseUrl, params) =>
    serializeAsQueryParams(baseUrl, params as Record<string, unknown>),
  knownLocations: {
    // === Counties (fylker) — depth 0, verified 2026-04-22 ===
    "Oslo (county)": "0.20061", // ✅ verified
    Rogaland: "0.20012", // ✅ verified (Stavanger is under this)
    "Møre og Romsdal": "0.20013", // ✅ verified
    Trøndelag: "0.20016", // ✅ verified (Trondheim is under this)
    Nordland: "0.20018", // ✅ verified
    Troms: "0.20019", // ✅ verified
    Finnmark: "0.20020", // ✅ verified
    Vestland: "0.22046", // ✅ verified (Bergen is under this)
    // TODO: verify remaining county codes (Agder, Akershus, Buskerud, etc.)

    // === Major cities — depth 1, verified 2026-04-22 ===
    Bergen: "1.22046.20220", // ✅ verified (under Vestland)
    Trondheim: "1.20016.20318", // ✅ verified (under Trøndelag)
    Stavanger: "1.20012.20196", // ✅ verified (under Rogaland)
    // TODO: verify Tromsø, Drammen, Kristiansand, Fredrikstad city codes

    // === Bergen sub-districts — depth 2, ALL verified 2026-04-22 ===
    "Arna (Bergen)": "2.22046.20220.20537",
    "Bergen Sentrum": "2.22046.20220.20465",
    "Bergen Vest": "2.22046.20220.20479",
    "Fana (Bergen)": "2.22046.20220.20473",
    "Fyllingsdalen (Bergen)": "2.22046.20220.20475",
    "Landås (Bergen)": "2.22046.20220.20471",
    "Åsane (Bergen)": "2.22046.20220.20470",

    // === Trondheim sub-districts — depth 2, ALL verified 2026-04-22 ===
    "Klæbu (Trondheim)": "2.20016.20318.20731",
    "Trondheim Sentrum": "2.20016.20318.20505",
    "Trondheim Sør": "2.20016.20318.20502",
    "Trondheim Vest": "2.20016.20318.20501",
    "Trondheim Øst": "2.20016.20318.20504",

    // === ALL 27 Oslo sub-districts — depth 1, ALL verified 2026-04-22 ===
    "Bjerke (Oslo)": "1.20061.20528",
    "Bygdøy - Frogner (Oslo)": "1.20061.20507",
    "Bøler (Oslo)": "1.20061.20519",
    "Ekeberg - Bekkelaget (Oslo)": "1.20061.20515",
    "Furuset (Oslo)": "1.20061.20524",
    "Gamle Oslo": "1.20061.20512",
    "Grefsen - Kjelsås (Oslo)": "1.20061.20529",
    "Grorud (Oslo)": "1.20061.20527",
    "Grünerløkka - Sofienberg (Oslo)": "1.20061.20511",
    "Hellerud (Oslo)": "1.20061.20523",
    "Helsfyr - Sinsen (Oslo)": "1.20061.20522",
    "Lambertseter (Oslo)": "1.20061.20518",
    "Manglerud (Oslo)": "1.20061.20520",
    "Marka (Oslo)": "1.20061.20514",
    "Nordstrand (Oslo)": "1.20061.20516",
    "Romsås (Oslo)": "1.20061.20526",
    "Røa (Oslo)": "1.20061.20532",
    "Sagene - Torshov (Oslo)": "1.20061.20510",
    "Sentrum (Oslo)": "1.20061.20513",
    "Sogn (Oslo)": "1.20061.20530",
    "St.Hanshaugen - Ullevål (Oslo)": "1.20061.20509",
    "Stovner (Oslo)": "1.20061.20525",
    "Søndre Nordstrand (Oslo)": "1.20061.20517",
    "Ullern (Oslo)": "1.20061.20533",
    "Uranienborg - Majorstuen (Oslo)": "1.20061.20508",
    "Vinderen (Oslo)": "1.20061.20531",
    "Østensjø (Oslo)": "1.20061.20521",
  },
};
