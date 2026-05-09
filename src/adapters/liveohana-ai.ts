import {
  liveohanaConfig,
  type LiveOhanaParams,
  OHANA_PROPERTY_TYPES,
  OHANA_PLACE_TYPES,
  OHANA_AMENITIES,
  OHANA_PET_POLICY,
  OHANA_FURNISHED_STATUS,
} from "../liveohana-ai.js";
import type {
  NormalizedSearchParams,
  SearchIntent,
  HomiAmenity,
  HomiPropertyType,
  HomiFurnishedStatus,
} from "../taxonomy.js";

// ============================================================================
// LIVEOHANA ADAPTER
// ============================================================================
//
// Maps normalized Homi taxonomy → LiveOhana URL params.
// LiveOhana only supports rent (mid-term rentals).
// Primary markets: NYC and SF.
// ============================================================================

// ---------------------------------------------------------------------------
// Amenity mapping
// ---------------------------------------------------------------------------

const AMENITY_MAP: Partial<Record<HomiAmenity, string>> = {
  "in-unit-laundry": OHANA_AMENITIES.IN_UNIT_LAUNDRY,
  "washing-machine": OHANA_AMENITIES.IN_UNIT_LAUNDRY,
  dryer: OHANA_AMENITIES.IN_UNIT_LAUNDRY,
  "shared-laundry": OHANA_AMENITIES.BUILDING_LAUNDRY,
  "fitness-center": OHANA_AMENITIES.GYM,
  security: OHANA_AMENITIES.DOORMAN,
  "controlled-access": OHANA_AMENITIES.DOORMAN,
  caretaker: OHANA_AMENITIES.DOORMAN,
};

// ---------------------------------------------------------------------------
// Property type mapping
// ---------------------------------------------------------------------------
// LiveOhana has: Apartment, House
// Homi types that map reasonably:

const PROPERTY_TYPE_MAP: Partial<Record<HomiPropertyType, string>> = {
  apartment: OHANA_PROPERTY_TYPES.APARTMENT,
  studio: OHANA_PROPERTY_TYPES.APARTMENT,
  condo: OHANA_PROPERTY_TYPES.APARTMENT,
  house: OHANA_PROPERTY_TYPES.HOUSE,
  townhouse: OHANA_PROPERTY_TYPES.HOUSE,
  duplex: OHANA_PROPERTY_TYPES.HOUSE,
  "row-house": OHANA_PROPERTY_TYPES.HOUSE,
};

// ---------------------------------------------------------------------------
// Furnished mapping
// ---------------------------------------------------------------------------

const FURNISHED_MAP: Partial<Record<HomiFurnishedStatus, string>> = {
  furnished: OHANA_FURNISHED_STATUS.FURNISHED,
  unfurnished: OHANA_FURNISHED_STATUS.UNFURNISHED,
  // "partially-furnished" → closest is "Furnished"
  "partially-furnished": OHANA_FURNISHED_STATUS.FURNISHED,
};

// ---------------------------------------------------------------------------
// Location resolver
// ---------------------------------------------------------------------------

function resolveLocation(location: string): string | undefined {
  const known = liveohanaConfig.knownLocations;
  if (!known) return undefined;

  // Exact match
  if (known[location]) return known[location];

  const lower = location.toLowerCase().trim();
  const entries = Object.entries(known);

  // Case-insensitive match
  for (const [name, value] of entries) {
    if (name.toLowerCase() === lower) return value;
  }

  // Partial match: input contains a known city name
  for (const [name, value] of entries) {
    const nameLower = name.toLowerCase();
    if (nameLower.length > 2 && lower.includes(nameLower)) return value;
  }

  // If no match, pass through as-is — LiveOhana accepts free-text geocodable strings
  return location;
}

// ---------------------------------------------------------------------------
// build()
// ---------------------------------------------------------------------------

/**
 * Build a LiveOhana search URL from normalized Homi search parameters.
 *
 * LiveOhana only supports "rent" — passing "buy" will throw.
 *
 * @param intent - Must be "rent"
 * @param params - Normalized search parameters
 * @returns Full LiveOhana URL string
 *
 * @example
 * ```ts
 * const url = build("rent", {
 *   location: "New York",
 *   maxPrice: 3000,
 *   bedrooms: { min: 2 },
 *   amenities: ["in-unit-laundry", "fitness-center"],
 *   pets: true,
 * });
 * // → https://liveohana.ai/search?location=New+York%2C+NY%2C+USA&max_price=3000&bedrooms=2&amenities=in-unit+laundry%2Cgym&pet_policy=pets+allowed
 * ```
 */
export function build(
  intent: SearchIntent,
  params: NormalizedSearchParams,
): string {
  if (intent !== "rent") {
    throw new Error(
      `LiveOhana only supports rent (mid-term rentals). Got: ${intent}`,
    );
  }

  const baseUrl = liveohanaConfig.baseUrls.rent!;
  const ohanaParams: Partial<LiveOhanaParams> = {};

  // Location
  if (params.location) {
    ohanaParams.location = resolveLocation(params.location);
  }

  // Price
  if (params.minPrice != null) ohanaParams.min_price = params.minPrice;
  if (params.maxPrice != null) ohanaParams.max_price = params.maxPrice;

  // Bedrooms (LiveOhana takes a single value "1"-"6", we use the min)
  if (params.bedrooms?.min != null) {
    const b = Math.min(Math.max(params.bedrooms.min, 1), 6);
    ohanaParams.bedrooms = String(b) as LiveOhanaParams["bedrooms"];
  }

  // Property types
  if (params.propertyType?.length) {
    const mapped = params.propertyType
      .map((pt) => PROPERTY_TYPE_MAP[pt])
      .filter((c): c is string => c != null);
    const unique = [...new Set(mapped)];
    if (unique.length > 0) {
      ohanaParams.property_types = unique.join(",");
    }
  }

  // Amenities
  if (params.amenities?.length) {
    const mapped = params.amenities
      .map((a) => AMENITY_MAP[a])
      .filter((c): c is string => c != null);
    const unique = [...new Set(mapped)];
    if (unique.length > 0) {
      ohanaParams.amenities = unique.join(",");
    }
  }

  // Pets
  if (params.pets === true) {
    ohanaParams.pet_policy = OHANA_PET_POLICY.ALLOWED;
  } else if (params.pets === false) {
    ohanaParams.pet_policy = OHANA_PET_POLICY.PROHIBITED;
  }

  // Furnished
  if (params.furnished?.length) {
    const mapped = params.furnished
      .map((f) => FURNISHED_MAP[f])
      .filter((c): c is string => c != null);
    const unique = [...new Set(mapped)];
    if (unique.length > 0) {
      ohanaParams.furnished_status = unique.join(",");
    }
  }

  return liveohanaConfig.serialize(baseUrl, ohanaParams);
}
