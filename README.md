# @homi/portal-schemas

Verified query parameter schemas for real estate search portals. Built with [Zod](https://zod.dev), optimized for AI structured output generation.

Every filter code has been verified against the live portal via browser automation — no guessing, no stale data.

## Portals

| Portal                               | Country         | Buy | Rent | Short-term | Neighborhoods                |
| ------------------------------------ | --------------- | --- | ---- | ---------- | ---------------------------- |
| [Finn.no](https://finn.no)           | 🇳🇴 Norway       | ✅  | ✅   | -          | 39 (Oslo, Bergen, Trondheim) |
| [Zillow](https://zillow.com)         | 🇺🇸 US           | ✅  | ✅   | -          | 13 cities                    |
| [StreetEasy](https://streeteasy.com) | 🇺🇸 NYC          | ✅  | ✅   | -          | 25+ Manhattan neighborhoods  |
| [Hybel.no](https://hybel.no)         | 🇳🇴 Norway       | -   | ✅   | -          | Norwegian cities             |
| [Airbnb](https://airbnb.com)         | 🌍 Global       | -   | ✅   | ✅         | 30+ cities worldwide         |
| [Rightmove](https://rightmove.co.uk) | 🇬🇧 UK           | ✅  | ✅   | -          | 17 UK cities                 |
| [Property24](https://property24.com) | 🇿🇦 South Africa | ✅  | ✅   | -          | SA cities                    |

Plus base URLs for 30+ additional providers across 10 countries.

## Install

```bash
npm install @homi/portal-schemas
# or
pnpm add @homi/portal-schemas
```

## Quick Start

```typescript
import { finnNoConfig, serializeAsQueryParams } from "@homi/portal-schemas";

// Get the base URL for a rental search
const baseUrl = finnNoConfig.baseUrls.rent;
// "https://www.finn.no/realestate/lettings/search.html"

// Build a parameterized search URL
const url = finnNoConfig.serialize(baseUrl!, {
  location: "0.20061", // Oslo
  price_to: 15000,
  min_bedrooms: 2,
  facilities: ["1", "4"], // balcony, elevator
  animals_allowed: "1",
});
// "https://www.finn.no/realestate/lettings/search.html?location=0.20061&price_to=15000&min_bedrooms=2&facilities=1&facilities=4&animals_allowed=1"
```

## AI-Powered URL Generation

Each schema uses Zod `.describe()` hints so AI models can generate valid parameters via structured output:

```typescript
import { finnNoConfig, finnNoParamsSchema } from "@homi/portal-schemas";
import { generateObject } from "ai";

const { object: params } = await generateObject({
  model: yourModel,
  schema: finnNoParamsSchema,
  prompt:
    "Generate Finn.no search params for a 2BR apartment in Oslo, budget 15000 NOK/month, needs parking and elevator",
});

const url = finnNoConfig.serialize(finnNoConfig.baseUrls.rent!, params);
```

## Provider Lookup

```typescript
import {
  getProviderBaseUrls,
  getProvidersByCountry,
} from "@homi/portal-schemas";

// Look up any provider
const finn = getProviderBaseUrls("finn.no");
// { id: 'finn.no', name: 'Finn.no', country: 'NO', baseUrls: { buy: '...', rent: '...' }, hasSchema: true }

// Get all providers for a country
const noProviders = getProvidersByCountry("NO");
// [finn.no, hybel.no, hjem.no, hjemla.no, husleie.no, qasa.com]
```

## Subpath Imports

Import only what you need:

```typescript
import { AIRBNB_AMENITIES, airbnbConfig } from "@homi/portal-schemas/airbnb";
import { ALL_PROVIDERS } from "@homi/portal-schemas/base-urls";
import { FINN_FACILITIES, finnNoConfig } from "@homi/portal-schemas/finn-no";
import { zillowConfig } from "@homi/portal-schemas/zillow";
```

## Why This Exists

Real estate portals hide most of their filter capabilities behind limited UIs. Airbnb has 591 amenity codes but only shows 24 in the filter panel. Finn.no uses opaque numeric codes for facilities, property types, and locations.

This package maps every filter to its exact URL parameter, verified against the live site. It's the foundation for:

- **AI agents** that construct search URLs from natural language
- **Scrapers** that need parameterized search URLs
- **Property tech apps** that aggregate across portals
- **Browser extensions** that enhance portal search UIs

## Verification Methodology

Every code was verified by:

1. Opening the portal in a browser
2. Clicking each filter option
3. Reading the URL change
4. Confirming the filter chip / result count

We found the previous (guessed) mappings were wrong for every portal tested — swapped facility codes, incorrect neighborhood IDs, wrong location codes. Verification matters.

## Contributing

We welcome contributions for new portals! The process:

1. Open the portal's search page
2. Map each filter to its URL parameter (click → read URL)
3. Create a Zod schema with `.describe()` hints
4. Write a serializer function
5. Add known location codes
6. Submit a PR with verification notes

See `CONTRIBUTING.md` for the full guide.

## License

MIT — [Homi](https://homi.so)
