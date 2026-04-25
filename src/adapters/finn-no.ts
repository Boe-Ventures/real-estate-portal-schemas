import {
  finnNoConfig,
  type FinnNoParams,
  FINN_PROPERTY_TYPES,
  FINN_FACILITIES,
  FINN_OWNERSHIP_TYPES,
} from "../finn-no.js";
import type {
  NormalizedSearchParams,
  SearchIntent,
  HomiAmenity,
  HomiPropertyType,
  HomiOwnershipType,
  HomiFurnishedStatus,
  HomiSortOption,
} from "../taxonomy.js";

// ============================================================================
// FINN.NO ADAPTER
// ============================================================================
//
// Maps normalized Homi taxonomy → Finn.no raw codes.
// Uses the existing finnNoConfig for serialization.
// ============================================================================

// ---------------------------------------------------------------------------
// Amenity mapping
// ---------------------------------------------------------------------------

const AMENITY_MAP: Partial<Record<HomiAmenity, string>> = {
  balcony: FINN_FACILITIES.BALCONY,
  terrace: FINN_FACILITIES.BALCONY, // Finn groups balcony/terrace together
  fireplace: FINN_FACILITIES.FIREPLACE,
  elevator: FINN_FACILITIES.ELEVATOR,
  "no-overlooking-neighbors": FINN_FACILITIES.NO_NEIGHBORS,
  waterfront: FINN_FACILITIES.WATERFRONT,
  "hiking-access": FINN_FACILITIES.HIKING,
  parking: FINN_FACILITIES.PARKING,
  garage: FINN_FACILITIES.PARKING, // Finn groups garage/parking
  caretaker: FINN_FACILITIES.CARETAKER,
  security: FINN_FACILITIES.CARETAKER,
  view: FINN_FACILITIES.VIEW,
  "ev-charging": FINN_FACILITIES.EV_CHARGING,
  // Rent-only facilities
  "modern-renovated": FINN_FACILITIES.MODERN,
  "air-conditioning": FINN_FACILITIES.AC,
  "shared-laundry": FINN_FACILITIES.SHARED_LAUNDRY,
  alarm: FINN_FACILITIES.ALARM,
  broadband: FINN_FACILITIES.BROADBAND,
  "high-speed-internet": FINN_FACILITIES.BROADBAND,
};

// ---------------------------------------------------------------------------
// Property type mapping
// ---------------------------------------------------------------------------

const PROPERTY_TYPE_MAP: Partial<Record<HomiPropertyType, string>> = {
  house: FINN_PROPERTY_TYPES.HOUSE,
  duplex: FINN_PROPERTY_TYPES.DUPLEX,
  apartment: FINN_PROPERTY_TYPES.APARTMENT,
  studio: FINN_PROPERTY_TYPES.APARTMENT, // Finn doesn't have a separate studio type
  condo: FINN_PROPERTY_TYPES.APARTMENT, // Condos → apartment on Finn
  "row-house": FINN_PROPERTY_TYPES.ROW_HOUSE,
  townhouse: FINN_PROPERTY_TYPES.ROW_HOUSE,
  parking: FINN_PROPERTY_TYPES.PARKING,
  industrial: FINN_PROPERTY_TYPES.INDUSTRIAL,
  farm: FINN_PROPERTY_TYPES.FARM,
  cabin: FINN_PROPERTY_TYPES.CABIN,
  room: FINN_PROPERTY_TYPES.BEDSIT,
  "shared-room": FINN_PROPERTY_TYPES.SHARED_ROOM,
  other: FINN_PROPERTY_TYPES.OTHER,
};

// ---------------------------------------------------------------------------
// Ownership type mapping
// ---------------------------------------------------------------------------

const OWNERSHIP_MAP: Partial<Record<HomiOwnershipType, string>> = {
  freehold: FINN_OWNERSHIP_TYPES.FREEHOLD,
  cooperative: FINN_OWNERSHIP_TYPES.COOP,
  share: FINN_OWNERSHIP_TYPES.SHARE,
  bond: FINN_OWNERSHIP_TYPES.BOND,
  other: FINN_OWNERSHIP_TYPES.OTHER,
};

// ---------------------------------------------------------------------------
// Furnished mapping
// ---------------------------------------------------------------------------

const FURNISHED_MAP: Record<HomiFurnishedStatus, string> = {
  furnished: "9",
  unfurnished: "10",
  "partially-furnished": "11",
};

// ---------------------------------------------------------------------------
// Sort mapping
// ---------------------------------------------------------------------------

const SORT_MAP_BUY: Partial<Record<HomiSortOption, string>> = {
  newest: "PUBLISHED_DESC",
  "price-asc": "PRICE_ASKING_ASC",
  "price-desc": "PRICE_ASKING_DESC",
  "area-asc": "AREA_PROM_ASC",
  "area-desc": "AREA_PROM_DESC",
  relevance: "RELEVANCE",
  closest: "CLOSEST",
};

const SORT_MAP_RENT: Partial<Record<HomiSortOption, string>> = {
  newest: "PUBLISHED_DESC",
  "price-asc": "RENT_ASC",
  "price-desc": "RENT_DESC",
  "area-asc": "AREA_ASC",
  "area-desc": "AREA_DESC",
  relevance: "RELEVANCE",
  closest: "CLOSEST",
};

// ---------------------------------------------------------------------------
// Location resolver
// ---------------------------------------------------------------------------

function resolveLocation(location: string): string | undefined {
  const known = finnNoConfig.knownLocations;
  if (!known) return undefined;

  // Exact match
  if (known[location]) return known[location];

  const lower = location.toLowerCase().trim();
  const entries = Object.entries(known);

  // Pass 1: case-insensitive exact, base name, or first-part match
  for (const [name, code] of entries) {
    const nameLower = name.toLowerCase();
    if (nameLower === lower) return code;
    // "Oslo (county)" → "oslo" matches "oslo"
    const baseName = nameLower.split("(")[0]!.trim();
    if (baseName === lower) return code;
    // "Grünerløkka - Sofienberg (Oslo)" → "grünerløkka" matches "grünerløkka"
    const firstName = baseName.split(" - ")[0]!.trim();
    if (firstName === lower) return code;
  }

  // Pass 2: compound input — split on ", " or " - " and try each part
  // e.g. "Grünerløkka, Oslo" → try "Grünerløkka" then "Oslo"
  const parts = lower.split(/[,\-]+/).map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    // Try the most specific part first (first part is usually neighborhood)
    for (const part of parts) {
      for (const [name, code] of entries) {
        const nameLower = name.toLowerCase();
        const baseName = nameLower.split("(")[0]!.trim();
        const firstName = baseName.split(" - ")[0]!.trim();
        if (firstName === part || baseName === part || nameLower === part) return code;
      }
    }
  }

  // Pass 3: substring match — "grünerløkka" found inside "grünerløkka - sofienberg (oslo)"
  for (const [name, code] of entries) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes(lower)) return code;
  }
  // And reverse: input contains a known name
  for (const [name, code] of entries) {
    const baseName = name.toLowerCase().split("(")[0]!.trim().split(" - ")[0]!.trim();
    if (baseName.length > 2 && lower.includes(baseName)) return code;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Floor mapping
// ---------------------------------------------------------------------------

function resolveFloor(
  floor: "not-ground" | number,
): string | undefined {
  if (floor === "not-ground") return "NOTFIRST";
  if (typeof floor === "number" && floor >= 1 && floor <= 6) return String(floor);
  return undefined;
}

// ---------------------------------------------------------------------------
// build()
// ---------------------------------------------------------------------------

/**
 * Build a Finn.no search URL from normalized Homi search parameters.
 *
 * @param intent - "buy" or "rent"
 * @param params - Normalized search parameters
 * @returns Full Finn.no URL string
 *
 * @example
 * ```ts
 * const url = build("rent", {
 *   location: "Oslo",
 *   maxPrice: 15000,
 *   bedrooms: { min: 2 },
 *   amenities: ["balcony", "elevator"],
 *   pets: true,
 * });
 * ```
 */
export function build(
  intent: SearchIntent,
  params: NormalizedSearchParams,
): string {
  const baseUrl = finnNoConfig.baseUrls[intent];
  if (!baseUrl) {
    throw new Error(`Finn.no does not support intent: ${intent}`);
  }

  const finnParams: Partial<FinnNoParams> = {};

  // Location
  if (params.location) {
    const code = resolveLocation(params.location);
    if (code) finnParams.location = code;
  }

  // Price
  if (params.minPrice != null) finnParams.price_from = params.minPrice;
  if (params.maxPrice != null) finnParams.price_to = params.maxPrice;

  // Area
  if (params.minArea != null) finnParams.area_from = params.minArea;
  if (params.maxArea != null) finnParams.area_to = params.maxArea;

  // Bedrooms (Finn only supports min_bedrooms)
  if (params.bedrooms?.min != null) {
    finnParams.min_bedrooms = params.bedrooms.min;
  }

  // Property types
  if (params.propertyType?.length) {
    const codes = params.propertyType
      .map((pt) => PROPERTY_TYPE_MAP[pt])
      .filter((c): c is string => c != null);
    // Deduplicate (e.g. studio + apartment both map to "3")
    const unique = [...new Set(codes)];
    if (unique.length > 0) {
      finnParams.property_type = unique as FinnNoParams["property_type"];
    }
  }

  // Amenities → facilities
  if (params.amenities?.length) {
    const codes = params.amenities
      .map((a) => AMENITY_MAP[a])
      .filter((c): c is string => c != null);
    const unique = [...new Set(codes)];
    if (unique.length > 0) {
      finnParams.facilities = unique as FinnNoParams["facilities"];
    }
  }

  // Pets (rent only)
  if (params.pets === true && intent === "rent") {
    finnParams.animals_allowed = "1";
  }

  // Furnished (rent only)
  if (params.furnished?.length && intent === "rent") {
    const codes = params.furnished.map((f) => FURNISHED_MAP[f]);
    finnParams.furnished = codes as FinnNoParams["furnished"];
  }

  // Ownership type (buy only)
  if (params.ownershipType?.length && intent === "buy") {
    const codes = params.ownershipType
      .map((o) => OWNERSHIP_MAP[o])
      .filter((c): c is string => c != null);
    if (codes.length > 0) {
      finnParams.ownership_type = codes as FinnNoParams["ownership_type"];
    }
  }

  // Energy rating (buy only)
  if (params.energyRating?.length && intent === "buy") {
    const ratingMap: Record<string, string> = {
      A: "1", B: "2", C: "3", D: "4", E: "5", F: "6", G: "7",
    };
    const codes = params.energyRating
      .map((r) => ratingMap[r])
      .filter((c): c is string => c != null);
    if (codes.length > 0) {
      finnParams.energy_label = codes as FinnNoParams["energy_label"];
    }
  }

  // Floor
  if (params.floor != null) {
    const code = resolveFloor(params.floor);
    if (code) finnParams.floor_navigator = code as FinnNoParams["floor_navigator"];
  }

  // Construction year (buy only)
  if (params.constructionYearMin != null && intent === "buy") {
    finnParams.construction_year_from = params.constructionYearMin;
  }
  if (params.constructionYearMax != null && intent === "buy") {
    finnParams.construction_year_to = params.constructionYearMax;
  }

  // New construction (buy only)
  if (params.newConstruction != null && intent === "buy") {
    finnParams.is_new_property = params.newConstruction ? "true" : "false";
  }

  // Sort
  if (params.sort) {
    const sortMap = intent === "buy" ? SORT_MAP_BUY : SORT_MAP_RENT;
    const code = sortMap[params.sort];
    if (code) finnParams.sort = code as FinnNoParams["sort"];
  }

  // Page
  if (params.page != null) finnParams.page = params.page;

  return finnNoConfig.serialize(baseUrl, finnParams);
}
