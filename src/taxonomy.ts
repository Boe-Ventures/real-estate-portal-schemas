import { z } from "zod";

// ============================================================================
// HOMI UNIFIED TAXONOMY
// ============================================================================
//
// A normalized vocabulary for real estate search across portals.
// Uses Airbnb's amenity taxonomy as the base where applicable,
// extended with sales and European market concepts.
//
// This is the "Rosetta Stone" — human-readable names that adapters
// translate into portal-specific codes.
// ============================================================================

// ---------------------------------------------------------------------------
// Amenities
// ---------------------------------------------------------------------------
// Based on Airbnb's amenity taxonomy, extended for sales & long-term rentals.

export const HOMI_AMENITIES = [
  // --- Outdoor / Building ---
  "balcony",
  "terrace",
  "parking",
  "garage",
  "elevator",
  "fireplace",
  "garden",
  "pool",
  "ev-charging",
  "outdoor-space",
  "waterfront",

  // --- Interior ---
  "dishwasher",
  "washing-machine",
  "dryer",
  "in-unit-laundry",
  "shared-laundry",
  "furnished",
  "partially-furnished",
  "hardwood-floors",
  "air-conditioning",
  "heating",
  "basement",

  // --- Security / Services ---
  "alarm",
  "caretaker",
  "controlled-access",
  "security",
  "broadband",
  "high-speed-internet",

  // --- Views ---
  "view",
  "city-view",
  "mountain-view",
  "park-view",
  "water-view",

  // --- Lifestyle ---
  "fitness-center",
  "hiking-access",
  "no-overlooking-neighbors",
  "single-story",

  // --- Accessibility ---
  "wheelchair-accessible",
  "disability-access",

  // --- Digital ---
  "virtual-tour",
  "3d-tour",
  "video-tour",

  // --- European-specific ---
  "modern-renovated",
  "utilities-included",
] as const;

export type HomiAmenity = (typeof HOMI_AMENITIES)[number];

export const HomiAmenitySchema = z.enum(HOMI_AMENITIES);

// ---------------------------------------------------------------------------
// Property Types
// ---------------------------------------------------------------------------

export const HOMI_PROPERTY_TYPES = [
  "apartment",
  "house",
  "townhouse",
  "duplex",
  "row-house",
  "studio",
  "condo",
  "farm",
  "cabin",
  "shared-room",
  "room",
  "multi-family",
  "land",
  "manufactured",
  "industrial",
  "parking",
  "other",
] as const;

export type HomiPropertyType = (typeof HOMI_PROPERTY_TYPES)[number];

export const HomiPropertyTypeSchema = z.enum(HOMI_PROPERTY_TYPES);

// ---------------------------------------------------------------------------
// Ownership Types (European / Norwegian)
// ---------------------------------------------------------------------------

export const HOMI_OWNERSHIP_TYPES = [
  "freehold", // selveier
  "cooperative", // borettslag / andel
  "share", // aksje
  "bond", // obligasjon
  "other",
] as const;

export type HomiOwnershipType = (typeof HOMI_OWNERSHIP_TYPES)[number];

export const HomiOwnershipTypeSchema = z.enum(HOMI_OWNERSHIP_TYPES);

// ---------------------------------------------------------------------------
// Energy Rating
// ---------------------------------------------------------------------------

export const HOMI_ENERGY_RATINGS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
] as const;

export type HomiEnergyRating = (typeof HOMI_ENERGY_RATINGS)[number];

export const HomiEnergyRatingSchema = z.enum(HOMI_ENERGY_RATINGS);

// ---------------------------------------------------------------------------
// Furnished Status
// ---------------------------------------------------------------------------

export const HOMI_FURNISHED_STATUS = [
  "furnished",
  "unfurnished",
  "partially-furnished",
] as const;

export type HomiFurnishedStatus = (typeof HOMI_FURNISHED_STATUS)[number];

export const HomiFurnishedStatusSchema = z.enum(HOMI_FURNISHED_STATUS);

// ---------------------------------------------------------------------------
// Sort Options
// ---------------------------------------------------------------------------

export const HOMI_SORT_OPTIONS = [
  "newest",
  "price-asc",
  "price-desc",
  "area-asc",
  "area-desc",
  "relevance",
  "closest",
] as const;

export type HomiSortOption = (typeof HOMI_SORT_OPTIONS)[number];

export const HomiSortOptionSchema = z.enum(HOMI_SORT_OPTIONS);

// ---------------------------------------------------------------------------
// Normalized Search Params
// ---------------------------------------------------------------------------

export const NormalizedSearchParamsSchema = z
  .object({
    // --- Location ---
    location: z
      .string()
      .optional()
      .describe(
        "Human-readable location name. Examples: 'Oslo', 'Grünerløkka', 'New York, NY', 'Brooklyn'. " +
          "Adapters resolve this to portal-specific location codes.",
      ),

    // --- Price ---
    minPrice: z
      .number()
      .optional()
      .describe(
        "Minimum price. For rentals: monthly rent. For sales: asking price. " +
          "Currency depends on portal (NOK for Finn.no, USD for Zillow).",
      ),
    maxPrice: z
      .number()
      .optional()
      .describe("Maximum price. Same semantics as minPrice."),

    // --- Size ---
    minArea: z
      .number()
      .optional()
      .describe(
        "Minimum living area. In m² for European portals, converted to sqft for US portals.",
      ),
    maxArea: z
      .number()
      .optional()
      .describe("Maximum living area."),

    // --- Bedrooms ---
    bedrooms: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
      })
      .optional()
      .describe("Bedroom count range. { min: 2 } means 2+, { min: 2, max: 3 } means 2-3."),

    // --- Bathrooms ---
    bathrooms: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
      })
      .optional()
      .describe("Bathroom count range."),

    // --- Property type ---
    propertyType: z
      .array(HomiPropertyTypeSchema)
      .optional()
      .describe("Property types to include. Omit for all types."),

    // --- Amenities ---
    amenities: z
      .array(HomiAmenitySchema)
      .optional()
      .describe("Required amenities. Only listings with ALL of these will match."),

    // --- Pets ---
    pets: z
      .boolean()
      .optional()
      .describe("Set true to filter for pet-friendly listings."),

    // --- Furnished status ---
    furnished: z
      .array(HomiFurnishedStatusSchema)
      .optional()
      .describe("Furnished status filter."),

    // --- Ownership type ---
    ownershipType: z
      .array(HomiOwnershipTypeSchema)
      .optional()
      .describe("Ownership type filter (European markets)."),

    // --- Energy rating ---
    energyRating: z
      .array(HomiEnergyRatingSchema)
      .optional()
      .describe("Energy rating filter (European markets). A = best, G = worst."),

    // --- Floor ---
    floor: z
      .union([
        z.literal("not-ground"),
        z.number(),
      ])
      .optional()
      .describe(
        "'not-ground' to exclude ground floor, or a specific floor number.",
      ),

    // --- Building age ---
    constructionYearMin: z.number().optional().describe("Minimum construction year."),
    constructionYearMax: z.number().optional().describe("Maximum construction year."),

    // --- New construction ---
    newConstruction: z.boolean().optional().describe("Filter for new construction only."),

    // --- Sort ---
    sort: HomiSortOptionSchema.optional().describe("Sort order for results."),

    // --- Pagination ---
    page: z.number().optional().describe("Page number (1-indexed)."),
  })
  .describe(
    "Normalized search parameters for real estate portals. " +
      "Human-readable fields that adapters translate to portal-specific codes.",
  );

export type NormalizedSearchParams = z.infer<typeof NormalizedSearchParamsSchema>;

// ---------------------------------------------------------------------------
// Search intent
// ---------------------------------------------------------------------------

export type SearchIntent = "buy" | "rent";
