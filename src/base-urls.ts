/**
 * Base URLs for all known real estate providers, organized by intention.
 *
 * Source of truth for Tier 1 URL construction — just the base URL, no params.
 * For providers with full query param schemas (Finn, Zillow, StreetEasy, Hybel),
 * the ProviderUrlConfig.baseUrls should match these.
 *
 * Extracted from location-config.ts on 2026-04-22.
 * Organized by country for clarity.
 */

export interface ProviderBaseUrls {
  id: string;
  name: string;
  country: string;
  baseUrls: {
    buy?: string;
    rent?: string;
    rent_short?: string;
  };
  /** Whether we have a full query param schema for this provider */
  hasSchema: boolean;
}

// ============================================================================
// NORWAY
// ============================================================================

export const NORWAY_PROVIDERS: ProviderBaseUrls[] = [
  {
    id: "finn.no",
    name: "Finn.no",
    country: "NO",
    baseUrls: {
      buy: "https://www.finn.no/realestate/homes/search.html",
      rent: "https://www.finn.no/realestate/lettings/search.html",
    },
    hasSchema: true,
  },
  {
    id: "hybel.no",
    name: "Hybel.no",
    country: "NO",
    baseUrls: {
      rent: "https://hybel.no/bolig-til-leie",
    },
    hasSchema: true,
  },
  {
    id: "hjem.no",
    name: "Hjem.no",
    country: "NO",
    baseUrls: {
      buy: "https://hjem.no/",
    },
    hasSchema: false,
  },
  {
    id: "hjemla.no",
    name: "Hjemla.no",
    country: "NO",
    baseUrls: {
      buy: "https://www.hjemla.no/",
    },
    hasSchema: false,
  },
  {
    id: "husleie.no",
    name: "Husleie.no",
    country: "NO",
    baseUrls: {
      rent: "https://www.husleie.no/bolig-til-leie/",
    },
    hasSchema: false,
  },
  {
    id: "qasa.com",
    name: "Qasa",
    country: "NO",
    baseUrls: {
      rent: "https://qasa.com/",
    },
    hasSchema: false,
  },
];

// ============================================================================
// UNITED STATES
// ============================================================================

export const US_PROVIDERS: ProviderBaseUrls[] = [
  {
    id: "zillow.com",
    name: "Zillow",
    country: "US",
    baseUrls: {
      buy: "https://www.zillow.com",
      rent: "https://www.zillow.com",
    },
    hasSchema: true,
  },
  {
    id: "streeteasy.com",
    name: "StreetEasy",
    country: "US",
    baseUrls: {
      buy: "https://streeteasy.com/for-sale",
      rent: "https://streeteasy.com/for-rent",
    },
    hasSchema: true,
  },
  {
    id: "realtor.com",
    name: "Realtor.com",
    country: "US",
    baseUrls: {
      buy: "https://www.realtor.com/",
      rent: "https://www.realtor.com/apartments/",
    },
    hasSchema: false,
  },
  {
    id: "redfin.com",
    name: "Redfin",
    country: "US",
    baseUrls: {
      buy: "https://www.redfin.com/",
    },
    hasSchema: false,
  },
  {
    id: "craigslist.org",
    name: "Craigslist",
    country: "US",
    baseUrls: {
      rent: "https://www.craigslist.org/",
    },
    hasSchema: false,
  },
  {
    id: "apartments.com",
    name: "Apartments.com",
    country: "US",
    baseUrls: {
      rent: "https://www.apartments.com/",
    },
    hasSchema: false,
  },
  {
    id: "corcoran.com",
    name: "Corcoran",
    country: "US",
    baseUrls: {
      buy: "https://www.corcoran.com/",
      rent: "https://www.corcoran.com/",
    },
    hasSchema: false,
  },
];

// ============================================================================
// UNITED KINGDOM
// ============================================================================

export const UK_PROVIDERS: ProviderBaseUrls[] = [
  {
    id: "rightmove.co.uk",
    name: "Rightmove",
    country: "GB",
    baseUrls: {
      buy: "https://www.rightmove.co.uk/property-for-sale/",
      rent: "https://www.rightmove.co.uk/property-to-rent/",
    },
    hasSchema: false,
  },
  {
    id: "zoopla.co.uk",
    name: "Zoopla",
    country: "GB",
    baseUrls: {
      buy: "https://www.zoopla.co.uk/for-sale/",
      rent: "https://www.zoopla.co.uk/to-rent/",
    },
    hasSchema: false,
  },
];

// ============================================================================
// AUSTRALIA
// ============================================================================

export const AU_PROVIDERS: ProviderBaseUrls[] = [
  {
    id: "domain.com.au",
    name: "Domain",
    country: "AU",
    baseUrls: {
      buy: "https://www.domain.com.au/sale/",
      rent: "https://www.domain.com.au/rent/",
    },
    hasSchema: false,
  },
  {
    id: "realestate.com.au",
    name: "REA",
    country: "AU",
    baseUrls: {
      buy: "https://www.realestate.com.au/buy/",
      rent: "https://www.realestate.com.au/rent/",
    },
    hasSchema: false,
  },
  {
    id: "flatmates.com.au",
    name: "Flatmates",
    country: "AU",
    baseUrls: {
      rent: "https://flatmates.com.au/",
    },
    hasSchema: false,
  },
];

// ============================================================================
// SWEDEN
// ============================================================================

export const SE_PROVIDERS: ProviderBaseUrls[] = [
  {
    id: "hemnet.se",
    name: "Hemnet",
    country: "SE",
    baseUrls: {
      buy: "https://www.hemnet.se/",
    },
    hasSchema: false,
  },
  {
    id: "booli.se",
    name: "Booli",
    country: "SE",
    baseUrls: {
      buy: "https://www.booli.se/",
      rent: "https://www.booli.se/",
    },
    hasSchema: false,
  },
  {
    id: "blocket.se",
    name: "Blocket",
    country: "SE",
    baseUrls: {
      buy: "https://www.blocket.se/",
      rent: "https://www.blocket.se/",
    },
    hasSchema: false,
  },
];

// ============================================================================
// GERMANY
// ============================================================================

export const DE_PROVIDERS: ProviderBaseUrls[] = [
  {
    id: "immobilienscout24.de",
    name: "ImmobilienScout24",
    country: "DE",
    baseUrls: {
      buy: "https://www.immobilienscout24.de/",
      rent: "https://www.immobilienscout24.de/",
    },
    hasSchema: false,
  },
  {
    id: "immowelt.de",
    name: "Immowelt",
    country: "DE",
    baseUrls: {
      buy: "https://www.immowelt.de/",
      rent: "https://www.immowelt.de/",
    },
    hasSchema: false,
  },
];

// ============================================================================
// NETHERLANDS
// ============================================================================

export const NL_PROVIDERS: ProviderBaseUrls[] = [
  {
    id: "funda.nl",
    name: "Funda",
    country: "NL",
    baseUrls: {
      buy: "https://www.funda.nl/",
      rent: "https://www.funda.nl/huur/",
    },
    hasSchema: false,
  },
  {
    id: "pararius.nl",
    name: "Pararius",
    country: "NL",
    baseUrls: {
      rent: "https://www.pararius.nl/",
    },
    hasSchema: false,
  },
];

// ============================================================================
// SPAIN
// ============================================================================

export const ES_PROVIDERS: ProviderBaseUrls[] = [
  {
    id: "idealista.com",
    name: "Idealista",
    country: "ES",
    baseUrls: {
      buy: "https://www.idealista.com/",
      rent: "https://www.idealista.com/alquiler-viviendas/",
    },
    hasSchema: false,
  },
  {
    id: "fotocasa.es",
    name: "Fotocasa",
    country: "ES",
    baseUrls: {
      buy: "https://www.fotocasa.es/",
      rent: "https://www.fotocasa.es/",
    },
    hasSchema: false,
  },
];

// ============================================================================
// PORTUGAL
// ============================================================================

export const PT_PROVIDERS: ProviderBaseUrls[] = [
  {
    id: "idealista.pt",
    name: "Idealista Portugal",
    country: "PT",
    baseUrls: {
      buy: "https://www.idealista.pt/",
      rent: "https://www.idealista.pt/arrendar-casas/",
    },
    hasSchema: false,
  },
];

// ============================================================================
// GLOBAL
// ============================================================================

export const GLOBAL_PROVIDERS: ProviderBaseUrls[] = [
  {
    id: "airbnb.com",
    name: "Airbnb",
    country: "GLOBAL",
    baseUrls: {
      rent_short: "https://www.airbnb.com/",
    },
    hasSchema: false, // TODO: old code had a schema — restore
  },
  {
    id: "booking.com",
    name: "Booking.com",
    country: "GLOBAL",
    baseUrls: {
      rent_short: "https://www.booking.com/",
    },
    hasSchema: false,
  },
];

// ============================================================================
// ALL PROVIDERS
// ============================================================================

export const ALL_PROVIDERS: ProviderBaseUrls[] = [
  ...NORWAY_PROVIDERS,
  ...US_PROVIDERS,
  ...UK_PROVIDERS,
  ...AU_PROVIDERS,
  ...SE_PROVIDERS,
  ...DE_PROVIDERS,
  ...NL_PROVIDERS,
  ...ES_PROVIDERS,
  ...PT_PROVIDERS,
  ...GLOBAL_PROVIDERS,
];

/** Look up a provider's base URLs by ID */
export function getProviderBaseUrls(
  providerId: string,
): ProviderBaseUrls | undefined {
  return ALL_PROVIDERS.find((p) => p.id === providerId);
}

/** Get all providers for a country */
export function getProvidersByCountry(countryCode: string): ProviderBaseUrls[] {
  return ALL_PROVIDERS.filter(
    (p) => p.country === countryCode || p.country === "GLOBAL",
  );
}
