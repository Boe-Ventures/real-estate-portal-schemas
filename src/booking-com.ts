import { z } from "zod";

import type { ProviderUrlConfig } from "./index.js";

// ============================================================================
// BOOKING.COM QUERY PARAMETER SCHEMA
// ============================================================================
//
// Verified against live site URLs + Booking.com Connectivity API Facilities
// docs + Demand API v3.1/3.2 docs on 2026-05-14.
//
// URL format: /searchresults.html?ss={location}&checkin=YYYY-MM-DD&...
//   or: /searchresults.en-gb.html?dest_id={id}&dest_type=city&...
//
// Key insight: Booking.com uses `nflt` (nested filter) param for amenity/
// property type/facility filters. Format: nflt=key%3Dvalue%3Bkey%3Dvalue
// Semicolon-separated, URL-encoded. Example: nflt=class%3D4%3Bhotelfacility%3D11
//
// Booking.com is global — same URL format worldwide, language via subdomain
// path segment (e.g. /searchresults.en-gb.html).
//
// References:
//   - Facilities API: developers.booking.com/connectivity/docs/content-api-modules/facilities-api/property-room-facilities-list
//   - Demand API search: developers.booking.com/demand/docs/open-api/demand-api/accommodations/accommodations/search
//   - URL params observed from live site + StayAPI debug mode + Apify scrapers
// ============================================================================

// ---------------------------------------------------------------------------
// Property (hotel) facility IDs — from Booking.com Facilities API (Oct 2025)
// Subset most relevant for vacation rental / apartment search
// ---------------------------------------------------------------------------

export const BOOKING_PROPERTY_FACILITIES = {
  // --- Wellness & Recreation ---
  SAUNA: 10,
  FITNESS_ROOM: 11,
  GOLF_WITHIN_3KM: 12,
  GARDEN: 14,
  TERRACE: 15,
  FISHING: 19,
  GAME_ROOM: 29,
  CASINO: 30,
  SOLARIUM: 50,
  HOT_SPRING_BATH: 138,
  KIDS_CLUB: 144,
  SWIMMING_POOL: 433,
  KIDS_POOL: 258,
  INDOOR_POOL: 55, // via nflt
  OUTDOOR_POOL: 56, // via nflt

  // --- Services ---
  NON_SMOKING_ROOMS: 16,
  AIRPORT_SHUTTLE: 17,
  AIRPORT_SHUTTLE_FREE: 139,
  AIRPORT_SHUTTLE_SURCHARGE: 140,
  BABYSITTING: 21,
  LAUNDRY: 22,
  DRY_CLEANING: 23,
  IRONING_SERVICE: 44,
  BREAKFAST_IN_ROOM: 43,
  EXPRESS_CHECKIN: 49,
  CONTACTLESS_CHECKIN: 460,
  CASHLESS_PAYMENTS: 461,

  // --- Business ---
  BUSINESS_CENTER: 20,

  // --- Accessibility ---
  DISABLED_FACILITIES: 25,

  // --- Sports ---
  SKIING: 26,
  SKI_STORAGE: 99,
  SKI_SCHOOL: 100,
  BIKE_RENTAL: 447,

  // --- Family ---
  FAMILY_ROOMS: 28,

  // --- Tech ---
  INTERNET_SERVICES: 47,
  WIFI_FREE: 107, // via nflt: hotelfacility=107

  // --- Building ---
  ELEVATOR: 48,

  // --- Outdoor ---
  OUTDOOR_FURNITURE: 222,
  PICNIC_AREA: 224,
  OUTDOOR_FIREPLACE: 225,

  // --- Food & Drink ---
  RESTAURANT: 3, // via nflt
  BAR: 4, // via nflt
  SNACK_BAR: 117,
  BREAKFAST: 9111,

  // --- Spa ---
  SPA_WELLNESS: 54, // via nflt: hotelfacility=54
  STEAM_ROOM: 241,
  SPA_LOUNGE: 242,
  BEAUTY_SERVICES: 226,
  MASSAGE: 251, // full body

  // --- Safety ---
  ALLERGY_FREE_ROOM: 101,
  CARBON_MONOXIDE_DETECTOR: 437,
  FIRST_AID_KIT: 459,

  // --- Shared ---
  COMMUNAL_KITCHEN: 141,
  LOCKERS: 142,
  COMMUNAL_LOUNGE: 143,
  MINIMARKET: 145,

  // --- Air ---
  AIR_CONDITIONING: 109,
  DESIGNATED_SMOKING: 110,

  // --- Financial ---
  ATM_ON_SITE: 111,

  // --- Beach ---
  PRIVATE_BEACH: 114,

  // --- Parking ---
  PARKING: 2, // via nflt: hotelfacility=2
  FREE_PARKING: 46, // via nflt: hotelfacility=46

  // --- Misc ---
  PETS_ALLOWED: 5, // via nflt: hotelfacility=5
  INVOICES_PROVIDED: 465,
  INDOOR_FIREPLACE: 511,
} as const;

// ---------------------------------------------------------------------------
// Room facility IDs — from Booking.com Facilities API
// Subset most relevant for apartment/home search
// ---------------------------------------------------------------------------

export const BOOKING_ROOM_FACILITIES = {
  // --- Kitchen ---
  COFFEE_TEA_MAKER: 1,
  KITCHENETTE: 16,
  KITCHEN: 45,
  REFRIGERATOR: 22,
  MICROWAVE: 32,
  OVEN: 96,
  STOVE: 97,
  TOASTER: 98,
  DISHWASHER: 33,
  KITCHENWARE: 89,
  ELECTRIC_KETTLE: 86,
  COFFEE_MACHINE: 120,
  DINING_AREA: 85,
  DINING_TABLE: 126,

  // --- Bathroom ---
  SHOWER: 4,
  BATH: 5,
  BATH_OR_SHOWER: 69,
  HOT_TUB: 14,
  SPA_BATH: 20,
  BIDET: 100,
  FREE_TOILETRIES: 27,
  HAIR_DRYER: 12,
  BATHROBE: 19,
  SLIPPERS: 43,

  // --- Comfort ---
  AIR_CONDITIONING: 11,
  HEATING: 40,
  FAN: 30,
  SOUNDPROOFING: 79,
  FIREPLACE: 71,
  SOFA: 77,
  SOFA_BED: 146,
  EXTRA_LONG_BEDS: 39,

  // --- Tech ---
  TV: 8,
  FLAT_SCREEN_TV: 75,
  SATELLITE_CHANNELS: 44,
  CABLE_CHANNELS: 68,
  MINIBAR: 3,
  TELEPHONE: 9,
  LAPTOP: 114,
  COMPUTER: 101,
  IPAD: 102,
  IPOD_DOCK: 88,

  // --- Office ---
  DESK: 23,
  IRONING_FACILITIES: 25,
  IRON: 15,

  // --- Safety ---
  SAFE: 6,
  LAPTOP_SAFE: 74,

  // --- Laundry ---
  WASHING_MACHINE: 34,
  TUMBLE_DRYER: 94,
  DRYING_RACK: 140,
  CLOTHES_RACK: 138,

  // --- Outdoor ---
  BALCONY: 17,
  PATIO: 37,
  TERRACE: 123,
  OUTDOOR_FURNITURE: 129,
  OUTDOOR_DINING: 130,
  BARBECUE: 99,
  PRIVATE_POOL: 93,

  // --- Views ---
  SEA_VIEW: 108,
  LAKE_VIEW: 109,
  GARDEN_VIEW: 110,
  POOL_VIEW: 111,
  MOUNTAIN_VIEW: 112,
  LANDMARK_VIEW: 113,
  CITY_VIEW: 121,
  RIVER_VIEW: 122,

  // --- Floor/Structure ---
  CARPETED: 70,
  TILED_MARBLE: 80,
  WOODEN_PARQUET: 82,
  PRIVATE_ENTRANCE: 76,
  ENTIRE_ON_GROUND_FLOOR: 131,
  UPPER_FLOOR_LIFT: 132,
  UPPER_FLOOR_STAIRS_ONLY: 133,
  WHEELCHAIR_ACCESSIBLE: 134,
  DETACHED: 135,

  // --- Misc ---
  SEATING_AREA: 26,
  WARDROBE: 95,
  MOSQUITO_NET: 90,
  CHILDREN_HIGHCHAIR: 127,
  TOILET: 31,
  GUEST_TOILET: 42,

  // --- Accessibility ---
  TOILET_GRAB_RAILS: 147,
  ADAPTED_BATH: 148,
  ROLL_IN_SHOWER: 149,
  WALK_IN_SHOWER: 150,
  SHOWER_CHAIR: 154,

  // --- Pool types ---
  ROOFTOP_POOL: 157,
  INFINITY_POOL: 158,
  POOL_WITH_VIEW: 159,
} as const;

// ---------------------------------------------------------------------------
// Accommodation type IDs — used in nflt=ht_id={id}
// From Booking.com site observation
// ---------------------------------------------------------------------------

export const BOOKING_ACCOMMODATION_TYPES = {
  HOTEL: 204,
  APARTMENT: 201,
  RESORT: 206,
  VILLA: 213,
  HOSTEL: 203,
  MOTEL: 205,
  BNB: 208, // Bed & Breakfast
  GUESTHOUSE: 216,
  HOLIDAY_HOME: 220,
  HOMESTAY: 222,
  CAMPSITE: 214,
  FARM_STAY: 210,
  BOAT: 215,
  LUXURY_TENT: 225,
  CAPSULE_HOTEL: 228,
  LOVE_HOTEL: 226,
  RYOKAN: 224,
  RIAD: 227,
  LODGE: 221,
  COUNTRY_HOUSE: 223,
  CHALET: 228, // shares with capsule in some regions
  CONDO: 212, // Condo Hotel
  INN: 209,
} as const;

// ---------------------------------------------------------------------------
// nflt filter categories — the key part of the URL
// ---------------------------------------------------------------------------

export const BOOKING_NFLT_KEYS = {
  /** Star rating (1-5) */
  CLASS: "class",
  /** Property/hotel facility IDs */
  HOTEL_FACILITY: "hotelfacility",
  /** Room facility IDs */
  ROOM_FACILITY: "roomfacility",
  /** Property type / accommodation type IDs */
  ACCOMMODATION_TYPE: "ht_id",
  /** Minimum review score: 60=Pleasant(6+), 70=Good(7+), 80=VeryGood(8+), 90=Superb(9+) */
  REVIEW_SCORE: "review_score",
  /** Distance from center in meters: 1000, 3000, 5000 */
  DISTANCE: "distance",
  /** Number of bedrooms */
  BEDROOMS: "nrm",
  /** Free cancellation */
  FREE_CANCELLATION: "fc",
  /** No prepayment */
  NO_PREPAYMENT: "hotelfacility", // value 34
  /** Meal plan: breakfast_included, self_catering, all_inclusive */
  MEAL_PLAN: "mealplan",
  /** Price range per night (in local currency) */
  PRICE: "pri",
} as const;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

export const bookingComParamsSchema = z.object({
  // --- Location ---
  ss: z
    .string()
    .describe(
      "Search string / destination name. Free text. " +
        "Examples: 'New York', 'Oslo, Norway', 'Bali', 'Manhattan, New York'. " +
        "Booking.com resolves this to dest_id internally.",
    ),
  dest_id: z
    .string()
    .optional()
    .describe(
      "Destination ID (signed integer as string). Negative = city, positive = region/other. " +
        "Examples: '-2088239'=Amsterdam, '-2601889'=New York. " +
        "If unknown, omit — Booking.com resolves from `ss`.",
    ),
  dest_type: z
    .enum(["city", "region", "district", "landmark", "airport", "country"])
    .optional()
    .describe("Destination type. Usually 'city' or 'region'."),

  // --- Dates ---
  checkin: z
    .string()
    .optional()
    .describe("Check-in date in YYYY-MM-DD format. Required for availability/pricing."),
  checkout: z
    .string()
    .optional()
    .describe(
      "Check-out date in YYYY-MM-DD format. Must be 1-90 days after checkin. " +
        "Max 500 days in the future.",
    ),

  // --- Guests ---
  group_adults: z
    .number()
    .optional()
    .describe("Number of adults (default 2)."),
  group_children: z
    .number()
    .optional()
    .describe("Number of children (default 0)."),
  no_rooms: z
    .number()
    .optional()
    .describe("Number of rooms needed (default 1)."),
  age: z
    .array(z.number())
    .optional()
    .describe(
      "Children's ages. One value per child. " +
        "Param format: age=5&age=8 (for 2 children aged 5 and 8).",
    ),

  // --- Filters (nflt encoded) ---
  nflt_class: z
    .array(z.number())
    .optional()
    .describe("Star rating filter. Values: 1, 2, 3, 4, 5. Multiple allowed."),
  nflt_hotelfacility: z
    .array(z.number())
    .optional()
    .describe(
      "Property facility filter IDs. " +
        "Key codes: 2=Parking, 5=Pets allowed, 11=Fitness, 46=Free parking, " +
        "54=Spa, 107=Free WiFi, 109=AC, 433=Pool, 139=Free airport shuttle. " +
        "Full list at developers.booking.com facilities API.",
    ),
  nflt_roomfacility: z
    .array(z.number())
    .optional()
    .describe(
      "Room facility filter IDs. " +
        "Key codes: 11=AC, 16=Kitchenette, 17=Balcony, 22=Fridge, 34=Washing machine, " +
        "45=Kitchen, 75=Flat-screen TV, 93=Private pool, 108=Sea view. " +
        "Full list at developers.booking.com facilities API.",
    ),
  nflt_ht_id: z
    .array(z.number())
    .optional()
    .describe(
      "Accommodation type IDs. " +
        "201=Apartment, 204=Hotel, 206=Resort, 208=B&B, 213=Villa, " +
        "216=Guesthouse, 220=Holiday home, 222=Homestay. Multiple allowed.",
    ),
  nflt_review_score: z
    .number()
    .optional()
    .describe(
      "Minimum review score filter. Values: 60=Pleasant(6+), 70=Good(7+), " +
        "80=Very Good(8+), 90=Superb(9+).",
    ),
  nflt_mealplan: z
    .enum(["breakfast_included", "self_catering", "all_inclusive", "half_board", "full_board"])
    .optional()
    .describe("Meal plan filter."),
  nflt_fc: z
    .enum(["1"])
    .optional()
    .describe("Free cancellation filter. Set to '1' to enable."),
  nflt_distance: z
    .number()
    .optional()
    .describe(
      "Distance from center in meters. Common values: 1000, 3000, 5000.",
    ),
  nflt_pri: z
    .number()
    .optional()
    .describe(
      "Price range filter per night. Encoding: 1=0-50, 2=50-100, 3=100-150, " +
        "4=150-200, 5=200+. Observed from live URLs.",
    ),

  // --- Sort ---
  order: z
    .enum([
      "popularity",
      "class_asc",
      "class",
      "score",
      "price",
      "distance",
      "review_score_and_price",
      "bayesian_review_score",
    ])
    .optional()
    .describe(
      "Sort order. 'price' = lowest first, 'class' = stars desc, " +
        "'class_asc' = stars asc, 'score' = review score, " +
        "'distance' = closest to center, 'bayesian_review_score' = top reviewed.",
    ),

  // --- Display ---
  selected_currency: z
    .string()
    .optional()
    .describe("Currency code (ISO 4217). E.g. 'USD', 'EUR', 'NOK'."),
  lang: z
    .string()
    .optional()
    .describe("Language code for the page. E.g. 'en-us', 'en-gb', 'no'."),

  // --- Pagination ---
  offset: z
    .number()
    .optional()
    .describe("Results offset for pagination. Increments of 25."),
});

export type BookingComParams = z.infer<typeof bookingComParamsSchema>;

// ---------------------------------------------------------------------------
// Serializer — builds the nflt param from structured filters
// ---------------------------------------------------------------------------

function serializeBookingUrl(baseUrl: string, params: unknown): string {
  const p = params as BookingComParams;

  const qs = new URLSearchParams();

  // Core params
  if (p.ss) qs.set("ss", p.ss);
  if (p.dest_id) qs.set("dest_id", p.dest_id);
  if (p.dest_type) qs.set("dest_type", p.dest_type);
  if (p.checkin) qs.set("checkin", p.checkin);
  if (p.checkout) qs.set("checkout", p.checkout);
  if (p.group_adults != null) qs.set("group_adults", String(p.group_adults));
  if (p.group_children != null) qs.set("group_children", String(p.group_children));
  if (p.no_rooms != null) qs.set("no_rooms", String(p.no_rooms));
  if (p.age && p.age.length > 0) {
    for (const a of p.age) {
      qs.append("age", String(a));
    }
  }
  if (p.order) qs.set("order", p.order);
  if (p.selected_currency) qs.set("selected_currency", p.selected_currency);
  if (p.offset != null) qs.set("offset", String(p.offset));

  // Build nflt compound filter
  const nfltParts: string[] = [];

  if (p.nflt_class && p.nflt_class.length > 0) {
    for (const c of p.nflt_class) {
      nfltParts.push(`class=${c}`);
    }
  }
  if (p.nflt_hotelfacility && p.nflt_hotelfacility.length > 0) {
    for (const f of p.nflt_hotelfacility) {
      nfltParts.push(`hotelfacility=${f}`);
    }
  }
  if (p.nflt_roomfacility && p.nflt_roomfacility.length > 0) {
    for (const f of p.nflt_roomfacility) {
      nfltParts.push(`roomfacility=${f}`);
    }
  }
  if (p.nflt_ht_id && p.nflt_ht_id.length > 0) {
    for (const t of p.nflt_ht_id) {
      nfltParts.push(`ht_id=${t}`);
    }
  }
  if (p.nflt_review_score != null) {
    nfltParts.push(`review_score=${p.nflt_review_score}`);
  }
  if (p.nflt_mealplan) {
    nfltParts.push(`mealplan=${p.nflt_mealplan}`);
  }
  if (p.nflt_fc) {
    nfltParts.push(`fc=1`);
  }
  if (p.nflt_distance != null) {
    nfltParts.push(`distance=${p.nflt_distance}`);
  }
  if (p.nflt_pri != null) {
    nfltParts.push(`pri=${p.nflt_pri}`);
  }

  if (nfltParts.length > 0) {
    qs.set("nflt", nfltParts.join(";"));
  }

  // Language — Booking.com supports it in both URL path and query
  if (p.lang) qs.set("lang", p.lang);

  const qsStr = qs.toString();
  const searchPath = `${baseUrl}/searchresults.html`;
  return qsStr ? `${searchPath}?${qsStr}` : searchPath;
}

// ---------------------------------------------------------------------------
// Known destination IDs (city dest_ids are negative on Booking.com)
// ---------------------------------------------------------------------------

const KNOWN_DEST_IDS: Record<string, { dest_id: string; dest_type: string }> = {
  // US
  "New York, NY": { dest_id: "-2601889", dest_type: "city" },
  "Los Angeles, CA": { dest_id: "-1363125", dest_type: "city" },
  "San Francisco, CA": { dest_id: "-1829149", dest_type: "city" },
  "Miami, FL": { dest_id: "-2748220", dest_type: "city" },
  "Chicago, IL": { dest_id: "-1725019", dest_type: "city" },
  "Austin, TX": { dest_id: "-1700957", dest_type: "city" },

  // Norway
  "Oslo, Norway": { dest_id: "-273837", dest_type: "city" },
  "Bergen, Norway": { dest_id: "-261309", dest_type: "city" },
  "Trondheim, Norway": { dest_id: "-290901", dest_type: "city" },

  // Europe
  "London, UK": { dest_id: "-2601889", dest_type: "city" },
  "Paris, France": { dest_id: "-1456928", dest_type: "city" },
  "Amsterdam, Netherlands": { dest_id: "-2088239", dest_type: "city" },
  "Berlin, Germany": { dest_id: "-1746443", dest_type: "city" },
  "Barcelona, Spain": { dest_id: "-372490", dest_type: "city" },
  "Lisbon, Portugal": { dest_id: "-2167973", dest_type: "city" },
  "Stockholm, Sweden": { dest_id: "-269862", dest_type: "city" },
  "Copenhagen, Denmark": { dest_id: "-2745636", dest_type: "city" },

  // Asia-Pacific
  "Tokyo, Japan": { dest_id: "-246227", dest_type: "city" },
  "Bangkok, Thailand": { dest_id: "-3414440", dest_type: "city" },
  "Bali, Indonesia": { dest_id: "835", dest_type: "region" },
  "Sydney, Australia": { dest_id: "-1603135", dest_type: "city" },

  // Other
  "Dubai, UAE": { dest_id: "-782831", dest_type: "city" },
  "Toronto, Canada": { dest_id: "-574890", dest_type: "city" },
  "Cape Town, South Africa": { dest_id: "-1217214", dest_type: "city" },
};

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

export const bookingComConfig: ProviderUrlConfig = {
  id: "booking.com",
  name: "Booking.com",
  baseUrls: {
    rent_short: "https://www.booking.com",
    // Booking.com also lists apartments for longer stays
    rent: "https://www.booking.com",
  },
  params: bookingComParamsSchema,
  serialize: serializeBookingUrl,
  knownLocations: Object.fromEntries(
    Object.entries(KNOWN_DEST_IDS).map(([name, { dest_id }]) => [name, dest_id]),
  ),
  multiNeighborhoodSupport: "none",
  jsonLd: {
    types: ["Hotel", "LodgingBusiness", "Product", "BreadcrumbList"],
    available: true,
    fieldMap: {
      "name": "title",
      "description": "description",
      "image": "imageUrls",
      "address.addressLocality": "locality",
      "address.addressCountry": "country",
      "geo.latitude": "latitude",
      "geo.longitude": "longitude",
      "aggregateRating.ratingValue": "ratingValue",
      "aggregateRating.reviewCount": "reviewCount",
      "offers.priceSpecification.price": "price",
      "offers.priceSpecification.priceCurrency": "currency",
    },
    notes:
      "Rich JSON-LD on property detail pages. Works with plain fetch — no proxy needed. " +
      "Hotel type contains location, rating, and description. Product has pricing. " +
      "BreadcrumbList provides location hierarchy (Country → City → Property).",
  },
  promptGuidance: [
    "- **Booking.com resolves location from `ss` (search string).** You don't need `dest_id` — just pass the city/region name. Booking will autocomplete it.",
    "- **Dates are required for pricing.** Without checkin/checkout, results show but without prices. Always include dates when possible.",
    "- **The `nflt` param is the filter powerhouse.** It encodes ALL filters as semicolon-separated key=value pairs. The schema flattens these into `nflt_*` fields for type safety, then the serializer recombines them.",
    "- **Accommodation types matter more than on Airbnb.** Booking.com mixes hotels, apartments, villas, hostels. For home-search context, filter to: 201=Apartment, 213=Villa, 220=Holiday home, 222=Homestay.",
    "- **Don't stack facility filters aggressively.** Each filter narrows results significantly. 2-3 facility filters max. Let post-import scoring handle nice-to-haves.",
    "- **Room facility vs hotel facility:** `roomfacility` = in the room (kitchen, AC, balcony). `hotelfacility` = property-wide (pool, parking, gym). Use the right category.",
    "- **Review score encoding:** 60=6+, 70=7+, 80=8+, 90=9+. These are x10 of the display score. A score of 80 (Very Good 8+) is a solid default quality filter.",
    "- **For apartments/homes,** set `nflt_ht_id` to [201] (Apartment) or [201, 213, 220] (Apartment + Villa + Holiday home) to exclude hotels and hostels.",
    "- **Free WiFi (107) is near-universal** on Booking.com — don't waste a filter slot on it.",
    "- **Currency:** Use `selected_currency` to force display currency (e.g. 'USD', 'EUR'). Otherwise Booking.com geo-detects.",
  ].join("\n"),
  examples: [
    {
      description: "Apartment in New York, 2 adults, 1 week in June, with kitchen",
      params: {
        ss: "New York",
        dest_id: "-2601889",
        dest_type: "city",
        checkin: "2026-06-15",
        checkout: "2026-06-22",
        group_adults: 2,
        no_rooms: 1,
        nflt_ht_id: [201],
        nflt_roomfacility: [45], // kitchen
        selected_currency: "USD",
      },
    },
    {
      description: "Villa or holiday home in Bali, pool, 4 adults, highly rated",
      params: {
        ss: "Bali",
        dest_id: "835",
        dest_type: "region",
        checkin: "2026-07-01",
        checkout: "2026-07-14",
        group_adults: 4,
        no_rooms: 2,
        nflt_ht_id: [213, 220], // Villa + Holiday home
        nflt_hotelfacility: [433], // Pool
        nflt_review_score: 80, // 8+
      },
    },
  ],
};

export { KNOWN_DEST_IDS as BOOKING_DEST_IDS };
