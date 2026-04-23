import { z } from "zod";

import type { ProviderUrlConfig } from "./index.js";
import { serializeAsQueryParams } from "./index.js";

// ============================================================================
// HYBEL.NO QUERY PARAMETER SCHEMA
// ============================================================================
//
// Verified against the live site on 2026-04-22 via browser automation.
// Hybel.no uses clean, readable query params with Django-style _gte/_lte
// suffixes for ranges, and `=on` for boolean toggles.
//
// URL format: /bolig-til-leie/{City}--{Country}/?key=value&key=value
// Location is path-based (e.g. Oslo--Norge, Bergen--Norge).
// All filters are query params.
//
// This is the cleanest URL format of all portals mapped so far.
// ============================================================================

// ---------------------------------------------------------------------------
// Housing type codes
// ---------------------------------------------------------------------------

export const HYBEL_HOUSING_TYPES = {
  /** Hus (house) */
  HOUSE: "1",
  /** Leilighet (apartment) */
  APARTMENT: "2",
  /** Hybel (bedsit/studio room) */
  BEDSIT: "3",
  /** Rom i bofellesskap (room in shared housing) */
  SHARED_ROOM: "4",
  /** Rom i leilighet (room in apartment) */
  ROOM_IN_APARTMENT: "5",
  /** Parkering (parking) */
  PARKING: "6",
} as const;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

export const hybelNoParamsSchema = z.object({
  // --- Location (path-based, not query param) ---
  location: z
    .string()
    .default("Oslo--Norge")
    .describe(
      "Location slug in the URL path. Format: '{City}--{Country}'. " +
        "Examples: 'Oslo--Norge', 'Bergen--Norge', 'Trondheim--Norge', " +
        "'Stavanger--Norge', 'Tromsø--Norge'. " +
        "City name uses Norwegian spelling with dashes for spaces.",
    ),

  // --- Rent range ---
  rent_gte: z.number().optional().describe("Minimum monthly rent in NOK."),
  rent_lte: z.number().optional().describe("Maximum monthly rent in NOK."),

  // --- Utilities included in rent ---
  is_power_included: z
    .enum(["on"])
    .optional()
    .describe("Electricity/power included in rent (strøm)."),
  is_heating_included: z
    .enum(["on"])
    .optional()
    .describe("Heating included in rent (oppvarming)."),
  is_hot_water_included: z
    .enum(["on"])
    .optional()
    .describe("Hot water included in rent (varmtvann)."),
  is_internet_included: z
    .enum(["on"])
    .optional()
    .describe("Internet included in rent."),
  is_tv_included: z
    .enum(["on"])
    .optional()
    .describe("TV package included in rent (TV-pakke)."),

  // --- Availability dates ---
  available_from_gte: z
    .string()
    .optional()
    .describe("Available from date (earliest). Format: YYYY-MM-DD."),
  available_from_lte: z
    .string()
    .optional()
    .describe("Available from date (latest). Format: YYYY-MM-DD."),

  // --- Housing type ---
  housing_in: z
    .array(z.enum(["1", "2", "3", "4", "5", "6"]))
    .optional()
    .describe(
      "Housing type codes (can select multiple, repeated param). " +
        "1=house (hus), 2=apartment (leilighet), 3=bedsit (hybel), " +
        "4=shared room (rom i bofellesskap), 5=room in apartment (rom i leilighet), " +
        "6=parking (parkering).",
    ),

  // --- Student housing ---
  is_studenthousing: z
    .enum(["on"])
    .optional()
    .describe("Filter for student housing only (studentbolig)."),

  // --- Room count ---
  rooms_in: z
    .array(z.string())
    .optional()
    .describe(
      "Number of rooms (can select multiple, repeated param). " +
        "Values: '1' through '10', or '0' for other/annet. " +
        "Note: this is total rooms, not bedrooms.",
    ),

  // --- Furnished status ---
  furniture_furnished: z
    .enum(["on"])
    .optional()
    .describe("Fully furnished (møblert)."),
  furniture_partly_furnished: z
    .enum(["on"])
    .optional()
    .describe("Partially furnished (delvis møblert)."),
  furniture_unfurnished: z
    .enum(["on"])
    .optional()
    .describe("Unfurnished (umøblert)."),

  // --- Facilities / amenities ---
  has_air_conditioning: z
    .enum(["on"])
    .optional()
    .describe("Air conditioning (airconditioning)."),
  has_alarm: z.enum(["on"]).optional().describe("Alarm system."),
  is_balcony: z.enum(["on"]).optional().describe("Balcony (balkong)."),
  is_child_friendly: z
    .enum(["on"])
    .optional()
    .describe("Child-friendly (barnevennlig)."),
  is_internet: z
    .enum(["on"])
    .optional()
    .describe("Broadband/internet connection (bredbåndstilknytning)."),
  is_pets_allowed: z
    .enum(["on"])
    .optional()
    .describe("Pets allowed (dyrehold tillatt)."),
  has_shared_laundry: z
    .enum(["on"])
    .optional()
    .describe("Shared laundry (fellesvaskeri)."),
  is_parking: z
    .enum(["on"])
    .optional()
    .describe("Garage or parking spot (garasje/p-plass)."),
  is_garden: z.enum(["on"]).optional().describe("Garden (hage)."),
  has_elevator: z.enum(["on"]).optional().describe("Elevator (heis)."),
  is_refugees_welcome: z
    .enum(["on"])
    .optional()
    .describe("FINN hjerterom / refugees welcome (hjerterom)."),
  is_el_apps: z
    .enum(["on"])
    .optional()
    .describe("White goods / appliances included (hvitevarer)."),
  is_not_overlooked: z
    .enum(["on"])
    .optional()
    .describe("No overlooking neighbors (ingen gjenboere)."),
  is_cable_tv: z.enum(["on"]).optional().describe("Cable TV (kabel-TV)."),
  has_charger: z
    .enum(["on"])
    .optional()
    .describe("EV charging (lademulighet)."),
  is_modern: z
    .enum(["on"])
    .optional()
    .describe("Modern / recently renovated (moderne)."),
  has_parquet: z
    .enum(["on"])
    .optional()
    .describe("Parquet flooring (parkett)."),
  has_fireplace: z
    .enum(["on"])
    .optional()
    .describe("Fireplace (peis/ildsted)."),
  is_calm: z.enum(["on"]).optional().describe("Quiet/calm area (rolig)."),
  is_central: z
    .enum(["on"])
    .optional()
    .describe("Central location (sentralt)."),
  is_terrace: z.enum(["on"]).optional().describe("Terrace (terrasse)."),
  is_close_to_hiking: z
    .enum(["on"])
    .optional()
    .describe("Close to hiking trails (turterreng)."),
  has_views: z.enum(["on"]).optional().describe("View (utsikt)."),
  has_caretaker: z
    .enum(["on"])
    .optional()
    .describe("Caretaker / security service (vaktmester-/vektertjeneste)."),

  // --- Sort ---
  order_by: z
    .enum(["-created_at", "created_at", "rent", "-rent", "area", "-area"])
    .optional()
    .describe(
      "Sort order. Prefix '-' = descending. " +
        "'-created_at' = newest first (default), 'rent' = cheapest first, " +
        "'-rent' = most expensive first, 'area' = smallest first, " +
        "'-area' = largest first. " +
        "TODO: verify all sort values — these are inferred from Django conventions.",
    ),

  // --- Pagination ---
  page: z.number().optional().describe("Page number for paginated results."),

  // --- District (bydel) ---
  // TODO: verify bydel param name and location code format
  // The "Bydel" dropdown shows Oslo districts — need to click through
  // to determine if it uses path-based or query-param location filtering.
});

export type HybelNoParams = z.infer<typeof hybelNoParamsSchema>;

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

function serializeHybelNoUrl(baseUrl: string, params: unknown): string {
  const p = params as HybelNoParams & { location?: string };

  // Location goes in the path
  const location = p.location || "Oslo--Norge";
  const urlBase = `${baseUrl}/${location}/`;

  // Build query params (exclude location)
  const queryParams: Record<string, unknown> = { ...p };
  delete queryParams.location;

  return serializeAsQueryParams(urlBase, queryParams);
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

export const hybelNoConfig: ProviderUrlConfig = {
  id: "hybel.no",
  name: "Hybel.no",
  baseUrls: {
    rent: "https://hybel.no/bolig-til-leie",
    // buy: not supported — hybel.no is rental-only
    // rent_short: not supported
  },
  params: hybelNoParamsSchema,
  serialize: serializeHybelNoUrl,
  knownLocations: {
    // Norwegian cities — location slug format: {City}--Norge
    Oslo: "Oslo--Norge",
    Bergen: "Bergen--Norge",
    Trondheim: "Trondheim--Norge",
    Stavanger: "Stavanger--Norge",
    Tromsø: "Tromsø--Norge",
    Drammen: "Drammen--Norge",
    Kristiansand: "Kristiansand--Norge",
    Fredrikstad: "Fredrikstad--Norge",
    Bodø: "Bodø--Norge",
    Ålesund: "Ålesund--Norge",
    // TODO: verify these slug formats — may need encoding for Norwegian characters
  },
};
