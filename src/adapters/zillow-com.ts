import {
  zillowConfig,
  type ZillowParams,
  type ZillowFilterState,
} from "../zillow-com.js";
import type {
  NormalizedSearchParams,
  SearchIntent,
  HomiAmenity,
  HomiPropertyType,
  HomiSortOption,
} from "../taxonomy.js";

// ============================================================================
// ZILLOW ADAPTER
// ============================================================================
//
// Maps normalized Homi taxonomy → Zillow searchQueryState codes.
// Uses the existing zillowConfig for serialization.
// ============================================================================

// ---------------------------------------------------------------------------
// Location resolver
// ---------------------------------------------------------------------------

interface ZillowLocation {
  citySlug: string;
  regionId: number;
  regionType: number;
  searchTerm: string;
}

function resolveLocation(location: string): ZillowLocation | undefined {
  const known = zillowConfig.knownLocations;
  if (!known) return undefined;

  const lower = location.toLowerCase().trim();

  for (const [name, regionId] of Object.entries(known)) {
    // Parse format: "City, ST (city-slug)"
    const slugMatch = name.match(/\(([^)]+)\)/);
    const displayName = name.split("(")[0]!.trim();

    if (
      displayName.toLowerCase() === lower ||
      displayName.toLowerCase().startsWith(lower + ",") ||
      (slugMatch && slugMatch[1] === lower)
    ) {
      return {
        citySlug: slugMatch ? slugMatch[1]! : lower.replace(/[^a-z0-9]+/g, "-"),
        regionId: parseInt(regionId!, 10),
        regionType: 6, // city
        searchTerm: displayName,
      };
    }
  }

  // Fallback: generate a slug from the location string
  // This won't have a regionId but the URL will still work for basic navigation
  const slug = lower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug
    ? { citySlug: slug, regionId: 0, regionType: 6, searchTerm: location }
    : undefined;
}

// ---------------------------------------------------------------------------
// Amenity mapping → filter state keys
// ---------------------------------------------------------------------------

type FilterKey = keyof ZillowFilterState;

const AMENITY_MAP: Partial<Record<HomiAmenity, FilterKey>> = {
  elevator: "eaa",
  pool: "pool",
  waterfront: "wat",
  "air-conditioning": "ac",
  "in-unit-laundry": "lau",
  "washing-machine": "lau",
  dryer: "lau",
  parking: "parka",
  garage: "parka",
  furnished: "fur",
  "high-speed-internet": "hsia",
  broadband: "hsia",
  "utilities-included": "uti",
  "hardwood-floors": "hrdwd",
  "fitness-center": "fit",
  "outdoor-space": "os",
  dishwasher: "dish",
  "city-view": "cityv",
  "mountain-view": "mouv",
  "park-view": "parkv",
  "water-view": "watv",
  "single-story": "sto",
  "wheelchair-accessible": "disac",
  "disability-access": "disac",
  "controlled-access": "ca",
  "3d-tour": "3d",
  "virtual-tour": "3d",
};

// ---------------------------------------------------------------------------
// Property type → exclusion filters
// ---------------------------------------------------------------------------
// Zillow uses exclusion-based property filtering.
// To show ONLY apartments: exclude townhomes (tow=false)
// To show ONLY houses: exclude apa, con, apco, tow
// etc.

interface PropertyTypeFilter {
  apa?: boolean;
  con?: boolean;
  apco?: boolean;
  tow?: boolean;
  mf?: boolean;
  land?: boolean;
  manu?: boolean;
}

function resolvePropertyTypes(
  types: HomiPropertyType[],
): PropertyTypeFilter {
  // If multiple types are given or no specific exclusion logic, return empty
  // (include everything). Only apply exclusions for single clear categories.
  const typeSet = new Set(types);

  // Simple mappings for common single-type queries
  if (typeSet.size === 1) {
    const type = types[0]!;
    switch (type) {
      case "apartment":
      case "studio":
      case "condo":
        return { tow: false };
      case "house":
        return { apa: false, con: false, apco: false, tow: false };
      case "townhouse":
      case "row-house":
        return { apa: false, con: false, apco: false };
      case "multi-family":
        return { apa: false, con: false, apco: false, tow: false, mf: true };
      case "land":
        return { apa: false, con: false, apco: false, tow: false, land: true };
      case "manufactured":
        return { apa: false, con: false, apco: false, tow: false, manu: true };
      default:
        return {};
    }
  }

  return {};
}

// ---------------------------------------------------------------------------
// Sort mapping
// ---------------------------------------------------------------------------

const SORT_MAP: Partial<Record<HomiSortOption, string>> = {
  newest: "days",
  "price-asc": "pricea",
  "price-desc": "priced",
  relevance: "globalrelevanceex",
};

// ---------------------------------------------------------------------------
// Sqft conversion
// ---------------------------------------------------------------------------

const SQM_TO_SQFT = 10.7639;

// ---------------------------------------------------------------------------
// build()
// ---------------------------------------------------------------------------

/**
 * Build a Zillow search URL from normalized Homi search parameters.
 *
 * @param intent - "buy" or "rent"
 * @param params - Normalized search parameters
 * @returns Full Zillow URL string
 *
 * @example
 * ```ts
 * const url = build("rent", {
 *   location: "New York, NY",
 *   maxPrice: 4000,
 *   bedrooms: { min: 2 },
 *   amenities: ["elevator", "dishwasher"],
 *   pets: true,
 * });
 * ```
 */
export function build(
  intent: SearchIntent,
  params: NormalizedSearchParams,
): string {
  const baseUrl = zillowConfig.baseUrls[intent];
  if (!baseUrl) {
    throw new Error(`Zillow does not support intent: ${intent}`);
  }

  const isRent = intent === "rent";

  // Resolve location
  const loc = params.location ? resolveLocation(params.location) : undefined;
  const citySlug = loc?.citySlug ?? "homes";

  // Build filter state
  const filterState: ZillowFilterState = {};

  // Search mode
  if (isRent) {
    filterState.fr = { value: true };
    // Disable sale-type flags
    filterState.fsba = { value: false };
    filterState.fsbo = { value: false };
    filterState.nc = { value: false };
    filterState.cmsn = { value: false };
    filterState.auc = { value: false };
    filterState.fore = { value: false };
  }

  // Price
  if (params.minPrice != null || params.maxPrice != null) {
    if (isRent) {
      filterState.mp = {
        min: params.minPrice ?? null,
        max: params.maxPrice ?? null,
      };
    } else {
      filterState.price = {
        min: params.minPrice ?? null,
        max: params.maxPrice ?? null,
      };
    }
  }

  // Bedrooms
  if (params.bedrooms) {
    filterState.beds = {
      min: params.bedrooms.min ?? null,
      max: params.bedrooms.max ?? null,
    };
  }

  // Bathrooms
  if (params.bathrooms) {
    filterState.baths = {
      min: params.bathrooms.min ?? null,
      max: params.bathrooms.max ?? null,
    };
  }

  // Area (m² → sqft)
  if (params.minArea != null || params.maxArea != null) {
    filterState.sqft = {
      min: params.minArea != null ? Math.round(params.minArea * SQM_TO_SQFT) : null,
      max: params.maxArea != null ? Math.round(params.maxArea * SQM_TO_SQFT) : null,
    };
  }

  // Property types
  if (params.propertyType?.length) {
    const ptFilter = resolvePropertyTypes(params.propertyType);
    if (ptFilter.apa === false) filterState.apa = { value: false };
    if (ptFilter.con === false) filterState.con = { value: false };
    if (ptFilter.apco === false) filterState.apco = { value: false };
    if (ptFilter.tow === false) filterState.tow = { value: false };
    if (ptFilter.mf === true) filterState.mf = { value: true };
    if (ptFilter.land === true) filterState.land = { value: true };
    if (ptFilter.manu === true) filterState.manu = { value: true };
  }

  // Amenities
  if (params.amenities?.length) {
    for (const amenity of params.amenities) {
      const filterKey = AMENITY_MAP[amenity];
      if (filterKey) {
        // All amenity filters use { value: true }
        (filterState as Record<string, { value: boolean }>)[filterKey] = {
          value: true,
        };
      }
    }
  }

  // Pets
  if (params.pets === true) {
    filterState.sdog = { value: true };
    filterState.ldog = { value: true };
    filterState.cat = { value: true };
  }

  // Furnished
  if (params.furnished?.length) {
    if (params.furnished.includes("furnished")) {
      filterState.fur = { value: true };
    }
  }

  // New construction (buy only)
  if (params.newConstruction === true && !isRent) {
    filterState.nc = { value: true };
  }

  // Sort
  if (params.sort) {
    const sortVal = SORT_MAP[params.sort];
    if (sortVal) filterState.sort = { value: sortVal };
  }

  // Build Zillow params
  const zillowParams: ZillowParams = {
    citySlug,
    filterState,
  };

  if (loc && loc.regionId > 0) {
    zillowParams.regionSelection = [
      { regionId: loc.regionId, regionType: loc.regionType },
    ];
    zillowParams.usersSearchTerm = loc.searchTerm;
  }

  return zillowConfig.serialize(baseUrl, zillowParams);
}
