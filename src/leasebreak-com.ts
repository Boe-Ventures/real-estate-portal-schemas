import { z } from "zod";

import type { ProviderUrlConfig } from "./index.js";

// ============================================================================
// LEASEBREAK.COM QUERY PARAMETER SCHEMA
// ============================================================================
//
// URL structure verified 2026-06-16 (site search index, live site is behind
// Cloudflare). Leasebreak is a NYC-only marketplace for lease breaks, sublets,
// furnished short-term rentals (30 days–12 months), and 12-month rentals. It
// covers Manhattan, Brooklyn, Queens, Bronx, Staten Island (+ some NJ).
//
// Filtering is PATH-based, not query-string based:
//
//   Borough:               /short-term-rentals/{Borough}
//   Borough + neighborhood: /short-term-rentals/{Borough}/{Neighborhood}
//   Category landing pages: /short-term-rentals, /sublets-nyc,
//                           /furnished-short-term-rentals-nyc, /leasebreaks-nyc,
//                           /summer-sublet, /1-month-sublets-nyc, ...
//
// Borough slugs are Title-Case ("Manhattan", "Staten-Island"). Neighborhood
// slugs are Title-Case words joined by hyphens (e.g. "Central-Harlem"). Price /
// bedroom filtering is not reliably expressible in the URL, so — consistent
// with how Homi treats every portal — those constraints are judged per-listing
// against the story rather than baked into the search URL.
// ============================================================================

// ---------------------------------------------------------------------------
// Boroughs / Regions
// ---------------------------------------------------------------------------

export const LEASEBREAK_BOROUGHS = {
  Manhattan: "Manhattan",
  Brooklyn: "Brooklyn",
  Queens: "Queens",
  Bronx: "Bronx",
  "Staten Island": "Staten-Island",
  // Extended regions (beyond NYC 5 boroughs)
  "Long Island": "Long-Island",
  "New Jersey": "New-Jersey",
} as const;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

export const leaseBreakParamsSchema = z.object({
  // --- Borough (path segment) ---
  borough: z
    .enum(["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten-Island", "Long-Island", "New-Jersey"])
    .optional()
    .describe(
      "Borough or region to scope the search to (path segment under " +
        "/short-term-rentals). One of: Manhattan, Brooklyn, Queens, Bronx, " +
        "Staten-Island, Long-Island, New-Jersey. Omit for an all-NYC search.",
    ),

  // --- Neighborhood (path segment) ---
  neighborhood: z
    .string()
    .optional()
    .describe(
      "Title-case, hyphen-joined neighborhood slug (e.g. 'Central-Harlem', " +
        "'Upper-West-Side', 'Park-Slope'). Applied ONLY together with a " +
        "borough. Use ONLY a slug present in knownLocations — never invent " +
        "one. If the desired neighborhood is not in knownLocations, omit this " +
        "and scope to the borough instead.",
    ),

  // --- Category landing page ---
  category: z
    .enum([
      "short-term-rentals",
      "furnished-short-term-rentals-nyc",
      "sublets-nyc",
      "1-month-sublets-nyc",
      "3-month-sublets-nyc",
      "leasebreaks-nyc",
      "summer-sublet",
    ])
    .optional()
    .describe(
      "Listing category landing page, used only when no borough is set. " +
        "'short-term-rentals' (default, furnished 30 days–12 months), " +
        "'furnished-short-term-rentals-nyc', 'sublets-nyc', " +
        "'1-month-sublets-nyc', '3-month-sublets-nyc', " +
        "'leasebreaks-nyc' (full lease takeovers), 'summer-sublet'.",
    ),

  // --- Sort direction (query param) ---
  sortDirection: z
    .enum(["asc", "desc"])
    .optional()
    .describe(
      "Sort direction for listings. 'asc' = lowest price first, " +
        "'desc' = highest price first. Omit to use default.",
    ),
});

export type LeaseBreakParams = z.infer<typeof leaseBreakParamsSchema>;

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

function serializeLeaseBreakUrl(baseUrl: string, params: unknown): string {
  const p = params as LeaseBreakParams;

  let origin = "https://www.leasebreak.com";
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    // keep default origin
  }

  const qs = p.sortDirection ? `?sortDirection=${p.sortDirection}` : "";

  // Neighborhood-level scoping is only reliable under the /short-term-rentals
  // path: /short-term-rentals/{Borough}[/{Neighborhood}].
  if (p.borough) {
    const segments = ["short-term-rentals", p.borough];
    if (p.neighborhood) segments.push(p.neighborhood);
    return `${origin}/${segments.join("/")}${qs}`;
  }

  // No borough → use the chosen category landing page, else the intention base.
  if (p.category) return `${origin}/${p.category}${qs}`;
  return `${baseUrl}${qs}`;
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

export const leaseBreakConfig: ProviderUrlConfig = {
  id: "leasebreak.com",
  name: "Leasebreak",
  baseUrls: {
    // Leasebreak is rental-only (no sales). rent_short is its core use case;
    // rent covers 12-month listings surfaced on the general listings page.
    rent: "https://www.leasebreak.com/listings",
    rent_short: "https://www.leasebreak.com/short-term-rentals",
  },
  params: leaseBreakParamsSchema,
  serialize: serializeLeaseBreakUrl,
  // Neighborhood display name → path slug. Curated to slugs whose Title-Case +
  // hyphen transform is unambiguous; apostrophe/combined names are omitted on
  // purpose so the model scopes to the borough rather than guessing a slug.
  // Verified against Google-indexed LeaseBreak pages (2026-06-16).
  // ⚠️ LeaseBreak uses combined neighborhood names (e.g. "Chelsea / Hudson
  // Yards", "Murray Hill / Kips Bay"). Slugs must match EXACTLY or you get
  // a 404. Only verified slugs are included.
  knownLocations: {
    // --- Manhattan (verified) ---
    "Upper West Side": "Upper-West-Side",
    "Upper East Side": "Upper-East-Side",
    "Chelsea / Hudson Yards": "Chelsea-Hudson-Yards",
    "East Village": "East-Village",
    "West Village / Meatpacking District": "West-Village-Meatpacking-District",
    "Soho / Nolita": "Soho-Nolita",
    Tribeca: "Tribeca",
    "Financial District": "Financial-District",
    "Lower East Side": "Lower-East-Side",
    "Murray Hill / Kips Bay": "Murray-Hill-Kips-Bay",
    "Gramercy Park": "Gramercy-Park",
    Flatiron: "Flatiron",
    "Midtown East": "Midtown-East",
    "Midtown West": "Midtown-West",
    "West Harlem": "West-Harlem",
    "Central Park South": "Central-Park-South",
    "Roosevelt Island": "Roosevelt-Island",
    Inwood: "Inwood",
    // --- Brooklyn (verified) ---
    Williamsburg: "Williamsburg",
    Greenpoint: "Greenpoint",
    "Park Slope": "Park-Slope",
    "Brooklyn Heights": "Brooklyn-Heights",
    "Fort Greene": "Fort-Greene",
    "Cobble Hill": "Cobble-Hill",
    Dumbo: "Dumbo",
    Flatbush: "Flatbush",
    Bensonhurst: "Bensonhurst",
    Midwood: "Midwood",
    Brownsville: "Brownsville",
    Greenwood: "Greenwood",
    // --- Queens (verified) ---
    Astoria: "Astoria",
    Flushing: "Flushing",
    Jamaica: "Jamaica",
  },
  multiNeighborhoodSupport: "single",
  jsonLd: {
    types: [],
    available: false,
    notes:
      "Leasebreak sits behind Cloudflare bot protection (managed challenge " +
      "on the homepage), so listing pages need a residential proxy / browser " +
      "session to fetch. JSON-LD availability is unverified — extract from " +
      "rendered HTML.",
  },
  promptGuidance: [
    "- Leasebreak is NYC-only (Manhattan, Brooklyn, Queens, Bronx, Staten Island, + some NJ) and rental-only — never use it for buy or for cities outside NYC.",
    "- It is sublet / short-term / lease-break focused (furnished, 30 days–12 months). Prefer it for rent_short; rent also works for 12-month listings.",
    "- Filtering is PATH-based, not query params. Scope with `borough` (e.g. 'Brooklyn') and optionally `neighborhood` (a slug from knownLocations).",
    "- Only ONE borough + neighborhood per URL (multiNeighborhoodSupport: 'single'). For neighborhoods in different boroughs, emit one search each.",
    "- Do NOT invent neighborhood slugs. If the neighborhood isn't in knownLocations, drop to borough-level — or all-NYC if no borough is implied.",
    "- Price and bedroom counts are not URL-filterable here; leave them out and let per-listing scoring handle fit.",
  ].join("\n"),
  examples: [
    {
      description: "Short-term sublet, Brooklyn — Park Slope",
      params: {
        borough: "Brooklyn",
        neighborhood: "Park-Slope",
      },
    },
    {
      description: "Furnished short-term, Manhattan (borough-level, no specific neighborhood)",
      params: {
        borough: "Manhattan",
      },
    },
    {
      description: "All-NYC lease takeovers (no borough implied)",
      params: {
        category: "leasebreaks-nyc",
      },
    },
  ],
};
