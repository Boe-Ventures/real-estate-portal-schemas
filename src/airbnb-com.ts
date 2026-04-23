import { z } from "zod";

import type { ProviderUrlConfig } from "./index.js";

// ============================================================================
// AIRBNB QUERY PARAMETER SCHEMA
// ============================================================================
//
// Verified against live site + SearchAPI docs + CustomBNB amenity guide on
// 2026-04-22. Airbnb uses path-based location + query params.
//
// URL format: /s/{City-Name--Region}/homes?checkin=YYYY-MM-DD&checkout=...
//
// Key insight: Airbnb has 591 internal amenity codes, but only ~24 are
// exposed in the standard filter UI. All codes work via URL params.
// Reference: https://custombnb.app/guides/amenity-codes
//
// Airbnb is global — the same URL format works across all countries.
// The domain may redirect based on user location (e.g. airbnb.co.za)
// but params remain consistent.
// ============================================================================

// ---------------------------------------------------------------------------
// Amenity codes — verified subset most relevant for apartment/home search
// ---------------------------------------------------------------------------

export const AIRBNB_AMENITIES = {
  // --- Essentials ---
  TV: 1,
  WIFI: 4,
  AC: 5,
  POOL: 7,
  KITCHEN: 8,
  FREE_PARKING: 9,
  PAID_PARKING: 10,
  PETS_ALLOWED: 12,
  GYM: 15,
  ELEVATOR: 21,
  HOT_TUB: 25,
  INDOOR_FIREPLACE: 27,
  HEATING: 30,
  WASHER: 33,
  DRYER: 34,
  SMOKE_ALARM: 35,
  ESSENTIALS: 40,
  HAIR_DRYER: 45,
  IRON: 46,
  DEDICATED_WORKSPACE: 47,
  SELF_CHECK_IN: 51,

  // --- Kitchen ---
  MICROWAVE: 89,
  COFFEE_MAKER: 90,
  REFRIGERATOR: 91,
  DISHWASHER: 92,
  DISHES_AND_SILVERWARE: 93,
  OVEN: 95,
  STOVE: 96,

  // --- Outdoor ---
  EV_CHARGER: 97,
  BBQ_GRILL: 99,
  PATIO_OR_BALCONY: 100,
  WATERFRONT: 132,
  BEACHFRONT: 134,
  SKI_IN_SKI_OUT: 135,

  // --- Views ---
  MOUNTAIN_VIEW: 154,
  BEACH_VIEW: 155,

  // --- Comfort ---
  SMART_TV: 151,
  BATHTUB: 61,

  // --- Safety ---
  CARBON_MONOXIDE_ALARM: 36,
  FIRE_EXTINGUISHER: 39,
  FIRST_AID_KIT: 37,

  // --- Wellness ---
  SAUNA: 223,
  EXERCISE_EQUIPMENT: 227,

  // --- Unique ---
  GARDEN: 255,
  FIRE_PIT: 219,
  OUTDOOR_SHOWER: 210,
  PRIVATE_POOL: 258,
  SHARED_POOL: 259,
} as const;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

export const airbnbParamsSchema = z.object({
  // --- Location (path-based) ---
  locationSlug: z
    .string()
    .describe(
      "Location slug for the URL path. Format: '{City-Name--Region}'. " +
        "Examples: 'New-York--NY', 'San-Francisco--CA', 'Oslo--Norway', " +
        "'London--United-Kingdom', 'Paris--France'. " +
        "US cities use state abbreviation. International cities use country name. " +
        "Words separated by hyphens, city and region separated by double-dash.",
    ),

  // --- Dates ---
  checkin: z
    .string()
    .optional()
    .describe("Check-in date in YYYY-MM-DD format."),
  checkout: z
    .string()
    .optional()
    .describe("Check-out date in YYYY-MM-DD format."),
  flexible_trip_lengths: z
    .array(z.enum(["weekend_trip", "one_week", "one_month"]))
    .optional()
    .describe(
      "Flexible trip length. Use instead of exact dates. " +
        "'weekend_trip' = 2 nights, 'one_week' = 5 nights, 'one_month' = 28 nights. " +
        "Param format: flexible_trip_lengths[]=one_week",
    ),

  // --- Guests ---
  adults: z
    .number()
    .optional()
    .describe(
      "Number of adults (ages 13+). Max 16. Defaults to 1 if other guest fields are set.",
    ),
  children: z
    .number()
    .optional()
    .describe("Number of children (ages 2-12). Max 15."),
  infants: z
    .number()
    .optional()
    .describe("Number of infants (under 2). Max 5."),
  pets: z
    .number()
    .optional()
    .describe("Number of pets. Set to 1+ to filter for pet-friendly listings."),

  // --- Price ---
  price_min: z
    .number()
    .optional()
    .describe("Minimum price per night in the listing's currency."),
  price_max: z.number().optional().describe("Maximum price per night."),

  // --- Accommodations ---
  min_bedrooms: z
    .number()
    .optional()
    .describe("Minimum number of bedrooms (0-8). 0 = studio."),
  min_beds: z.number().optional().describe("Minimum number of beds (0-8)."),
  min_bathrooms: z
    .number()
    .optional()
    .describe("Minimum number of bathrooms (0-8)."),

  // --- Type of place ---
  room_types: z
    .array(
      z.enum(["Entire home/apt", "Private room", "Shared room", "Hotel room"]),
    )
    .optional()
    .describe(
      "Type of place filter. Param format: room_types[]=Entire home/apt. " +
        "Multiple values allowed.",
    ),

  // --- Property type ---
  property_type_id: z
    .array(z.string())
    .optional()
    .describe(
      "Property type IDs. Param format: property_type_id[]=1. " +
        "Common IDs: house, apartment, guesthouse, hotel. " +
        "TODO: verify numeric IDs for each property type.",
    ),

  // --- Amenities ---
  amenities: z
    .array(z.number())
    .optional()
    .describe(
      "Amenity code numbers. Param format: amenities[]=4&amenities[]=33. " +
        "Key codes: 4=Wifi, 5=AC, 7=Pool, 8=Kitchen, 9=Free parking, " +
        "12=Pets allowed, 15=Gym, 21=Elevator, 25=Hot tub, " +
        "33=Washer, 34=Dryer, 47=Workspace, 92=Dishwasher, 97=EV charger, " +
        "100=Patio/balcony, 132=Waterfront, 223=Sauna, 255=Garden. " +
        "Full list: 591 codes at custombnb.app/guides/amenity-codes",
    ),

  // --- Booking options ---
  instant_book: z
    .enum(["true"])
    .optional()
    .describe("Only show listings with Instant Book enabled."),

  // --- Superhost ---
  superhost: z
    .enum(["true"])
    .optional()
    .describe("Only show Superhost listings."),

  // --- Accessibility ---
  // TODO: verify accessibility param format (step_free_access, etc.)

  // --- Host language ---
  host_languages: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by host language. Param format: host_languages[]=en. " +
        "ISO 639-1 codes: en, es, fr, de, no, sv, etc.",
    ),

  // --- Pagination ---
  cursor: z
    .string()
    .optional()
    .describe(
      "Pagination cursor (base64-encoded). From the previous page's pagination.next_page_token.",
    ),

  // --- Sort ---
  // Note: Airbnb doesn't expose sort as a URL param in the standard UI.
  // The API uses internal ranking. No sort param needed.

  // --- Search metadata ---
  search_type: z
    .string()
    .optional()
    .describe("Search type. Usually 'AUTOSUGGEST' or 'filter_change'."),
  query: z
    .string()
    .optional()
    .describe("Search query text (displayed in search bar)."),
  place_id: z
    .string()
    .optional()
    .describe("Google Place ID for precise location matching."),
});

export type AirbnbParams = z.infer<typeof airbnbParamsSchema>;

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

function serializeAirbnbUrl(baseUrl: string, params: unknown): string {
  const p = params as AirbnbParams;

  // Build path: /s/{location}/homes
  const path = `${baseUrl}/s/${p.locationSlug}/homes`;

  // Build query params
  const qs = new URLSearchParams();

  if (p.checkin) qs.set("checkin", p.checkin);
  if (p.checkout) qs.set("checkout", p.checkout);
  if (p.adults != null) qs.set("adults", String(p.adults));
  if (p.children != null) qs.set("children", String(p.children));
  if (p.infants != null) qs.set("infants", String(p.infants));
  if (p.pets != null) qs.set("pets", String(p.pets));
  if (p.price_min != null) qs.set("price_min", String(p.price_min));
  if (p.price_max != null) qs.set("price_max", String(p.price_max));
  if (p.min_bedrooms != null) qs.set("min_bedrooms", String(p.min_bedrooms));
  if (p.min_beds != null) qs.set("min_beds", String(p.min_beds));
  if (p.min_bathrooms != null) qs.set("min_bathrooms", String(p.min_bathrooms));
  if (p.instant_book) qs.set("instant_book", "true");
  if (p.superhost) qs.set("superhost", "true");
  if (p.search_type) qs.set("search_type", p.search_type);
  if (p.query) qs.set("query", p.query);
  if (p.place_id) qs.set("place_id", p.place_id);

  // Array params use [] suffix
  if (p.amenities && p.amenities.length > 0) {
    for (const code of p.amenities) {
      qs.append("amenities[]", String(code));
    }
  }

  if (p.room_types && p.room_types.length > 0) {
    for (const type of p.room_types) {
      qs.append("room_types[]", type);
    }
  }

  if (p.flexible_trip_lengths && p.flexible_trip_lengths.length > 0) {
    for (const length of p.flexible_trip_lengths) {
      qs.append("flexible_trip_lengths[]", length);
    }
  }

  if (p.property_type_id && p.property_type_id.length > 0) {
    for (const id of p.property_type_id) {
      qs.append("property_type_id[]", id);
    }
  }

  if (p.host_languages && p.host_languages.length > 0) {
    for (const lang of p.host_languages) {
      qs.append("host_languages[]", lang);
    }
  }

  const qsStr = qs.toString();
  return qsStr ? `${path}?${qsStr}` : path;
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

export const airbnbConfig: ProviderUrlConfig = {
  id: "airbnb.com",
  name: "Airbnb",
  baseUrls: {
    rent_short: "https://www.airbnb.com",
    // Airbnb also supports monthly stays (rent) via the same URL with longer dates
    rent: "https://www.airbnb.com",
  },
  params: airbnbParamsSchema,
  serialize: serializeAirbnbUrl,
  knownLocations: {
    // US cities
    "New York, NY": "New-York--NY",
    "San Francisco, CA": "San-Francisco--CA",
    "Los Angeles, CA": "Los-Angeles--CA",
    "Miami, FL": "Miami--FL",
    "Chicago, IL": "Chicago--IL",
    "Austin, TX": "Austin--TX",
    "Seattle, WA": "Seattle--WA",
    "Boston, MA": "Boston--MA",
    "Denver, CO": "Denver--CO",
    "Portland, OR": "Portland--OR",
    "Washington, DC": "Washington--DC",

    // Norway
    "Oslo, Norway": "Oslo--Norway",
    "Bergen, Norway": "Bergen--Norway",
    "Trondheim, Norway": "Trondheim--Norway",

    // Europe
    "London, UK": "London--United-Kingdom",
    "Paris, France": "Paris--France",
    "Berlin, Germany": "Berlin--Germany",
    "Amsterdam, Netherlands": "Amsterdam--Netherlands",
    "Barcelona, Spain": "Barcelona--Spain",
    "Lisbon, Portugal": "Lisbon--Portugal",
    "Stockholm, Sweden": "Stockholm--Sweden",
    "Copenhagen, Denmark": "Copenhagen--Denmark",

    // Asia-Pacific
    "Tokyo, Japan": "Tokyo--Japan",
    "Bangkok, Thailand": "Bangkok--Thailand",
    "Bali, Indonesia": "Bali--Indonesia",
    "Sydney, Australia": "Sydney--Australia",
    "Melbourne, Australia": "Melbourne--Australia",

    // Other
    "Dubai, UAE": "Dubai--United-Arab-Emirates",
    "Toronto, Canada": "Toronto--Canada",
    "Mexico City, Mexico": "Mexico-City--Mexico",
  },
};
