# @use_homi/real-estate-portal-schemas

Verified query parameter schemas for real estate search portals. Built with [Zod](https://zod.dev), designed for AI structured output generation.

Every filter code is verified against the live portal — not scraped from docs, not guessed from variable names, but tested by clicking each filter and reading the URL change.

## About

This package is maintained by [Homi](https://homi.so), an AI-powered home search platform. It's published under the `@use_homi` npm scope and hosted by [Boe Ventures](https://github.com/Boe-Ventures), the parent organization.

Homi uses these schemas to power its [AI Scouting](https://homi.so) pipeline — generating parameterized search URLs from a user's natural language description of what they're looking for. This package extracts that capability so anyone building property tech, AI agents, or search tools can use it.

## Portals

| Portal | Country | Buy | Rent | Short-term | Neighborhoods |
|--------|---------|-----|------|------------|---------------|
| [Finn.no](https://finn.no) | 🇳🇴 Norway | ✅ | ✅ | — | 39 (Oslo, Bergen, Trondheim) |
| [Zillow](https://zillow.com) | 🇺🇸 US | ✅ | ✅ | — | 13 cities |
| [StreetEasy](https://streeteasy.com) | 🇺🇸 NYC | ✅ | ✅ | — | 25+ Manhattan neighborhoods |
| [Hybel.no](https://hybel.no) | 🇳🇴 Norway | — | ✅ | — | Norwegian cities |
| [Airbnb](https://airbnb.com) | 🌍 Global | — | ✅ | ✅ | 30+ cities worldwide |
| [Rightmove](https://rightmove.co.uk) | 🇬🇧 UK | ✅ | ✅ | — | 17 UK cities |
| [Property24](https://property24.com) | 🇿🇦 South Africa | ✅ | ✅ | — | SA cities |
| [Craigslist](https://craigslist.org) | 🇺🇸 US | ✅ | ✅ | — | 40 US cities |
| [Domain](https://domain.com.au) | 🇦🇺 Australia | ✅ | ✅ | — | AU cities + suburbs |

Plus base URLs for 30+ additional providers across 10 countries.

## Install

```bash
npm install @use_homi/real-estate-portal-schemas
# or
pnpm add @use_homi/real-estate-portal-schemas
```

## Quick Start

```typescript
import { finnNoConfig } from "@use_homi/real-estate-portal-schemas";

// Get the base URL for a rental search
const baseUrl = finnNoConfig.baseUrls.rent;
// → "https://www.finn.no/realestate/lettings/search.html"

// Build a parameterized search URL
const url = finnNoConfig.serialize(baseUrl!, {
  location: "0.20061", // Oslo
  price_to: 15000,
  min_bedrooms: 2,
  facilities: ["1", "4"], // balcony, elevator
  animals_allowed: "1",
});
// → "https://www.finn.no/realestate/lettings/search.html?location=0.20061&price_to=15000&min_bedrooms=2&facilities=1&facilities=4&animals_allowed=1"
```

## AI-Powered URL Generation

The `generateUrl` function is the easiest way to generate search URLs. Give it a portal, an intention, and a story — it handles the rest:

```typescript
import { generateUrl } from "@use_homi/real-estate-portal-schemas/generate";

// Simple: just a portal + intention + story
const result = await generateUrl({
  portal: "finn.no",
  intention: "rent",
  story: "Young couple in Oslo with a dog. 2BR, balcony, elevator. 15k NOK/month.",
});

if (result.ok) {
  console.log(result.url);   // https://www.finn.no/realestate/lettings/search.html?location=0.20061&...
  console.log(result.label); // "Finn.no — Oslo Rent 2BR"
  console.log(result.params); // { location: "0.20061", min_bedrooms: 2, ... }
}

// With structured context fields
const result2 = await generateUrl({
  portal: "zillow",
  intention: "rent",
  city: "New York",
  budget: 3500,
  currency: "USD",
  bedrooms: 1,
  amenities: ["laundry", "AC"],
  story: "Software engineer in Manhattan, need in-unit laundry.",
});
```

Uses Anthropic Sonnet by default. Pass any AI SDK model via the `model` option:

```typescript
import { openai } from "@ai-sdk/openai";

const result = await generateUrl({
  portal: "finn.no",
  intention: "rent",
  story: "...",
  model: openai("gpt-4o"),
});
```

Requires `ai` and `@ai-sdk/anthropic` (or your chosen provider) as peer dependencies.

### Low-Level: Raw Schemas

Each schema uses Zod `.describe()` hints so AI models can generate valid parameters via structured output:

```typescript
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { finnNoConfig, finnNoParamsSchema } from "@use_homi/real-estate-portal-schemas";

const { object: params } = await generateObject({
  model: anthropic("claude-sonnet-4-20250514"),
  schema: finnNoParamsSchema,
  prompt:
    "Generate Finn.no search params for a 2BR apartment in Oslo, budget 15000 NOK/month, needs parking and elevator",
});

const url = finnNoConfig.serialize(finnNoConfig.baseUrls.rent!, params);
```

The `.describe()` hints on each field guide the model — for example, the `facilities` field describes all available codes: `"1=balcony/terrace, 2=fireplace, 4=elevator, 23=garage/parking..."`.

### Available Portals for `generateUrl`

| Portal ID | Aliases | Intentions |
|-----------|---------|------------|
| `finn.no` | `finn` | buy, rent |
| `zillow.com` | `zillow` | buy, rent |
| `streeteasy.com` | `streeteasy` | buy, rent |
| `hybel.no` | `hybel` | rent |
| `airbnb.com` | `airbnb` | rent_short |
| `rightmove.co.uk` | `rightmove` | buy, rent |
| `property24.com` | `property24` | buy, rent |
| `craigslist.org` | `craigslist` | buy, rent |
| `domain.com.au` | `domain` | buy, rent |

## Provider Lookup

```typescript
import { getProviderBaseUrls, getProvidersByCountry } from "@use_homi/real-estate-portal-schemas";

// Look up any provider
const finn = getProviderBaseUrls("finn.no");
// → { id: 'finn.no', name: 'Finn.no', country: 'NO', baseUrls: { buy: '...', rent: '...' }, hasSchema: true }

// Get all providers for a country
const noProviders = getProvidersByCountry("NO");
// → [finn.no, hybel.no, hjem.no, hjemla.no, husleie.no, qasa.com]
```

## Subpath Imports

Import only what you need:

```typescript
import { finnNoConfig, FINN_FACILITIES } from "@use_homi/real-estate-portal-schemas/finn-no";
import { zillowConfig } from "@use_homi/real-estate-portal-schemas/zillow";
import { airbnbConfig, AIRBNB_AMENITIES } from "@use_homi/real-estate-portal-schemas/airbnb";
import { ALL_PROVIDERS } from "@use_homi/real-estate-portal-schemas/base-urls";
```

## Why This Exists

Real estate portals hide most of their filter capabilities behind limited UIs. Airbnb has 591 amenity codes but only shows ~24 in the filter panel. Finn.no uses opaque numeric codes for facilities, property types, and locations. Zillow encodes everything in a JSON blob.

This package maps every filter to its exact URL parameter, verified against the live site. It's useful for:

- **AI agents** that construct search URLs from natural language
- **Scrapers** that need parameterized search URLs
- **Property tech apps** that aggregate across portals
- **Browser extensions** that enhance portal search UIs

## How Verification Works

Each filter code is verified by opening the portal in a browser, clicking the filter option, and reading the resulting URL change. For server-rendered portals like StreetEasy, we use automated title-checking scripts that can verify dozens of location codes in seconds.

This matters because portal filter codes change over time — what worked last year may not work today. Every code in this package was verified in April 2026.

## Contributing

We welcome contributions for new portals! The process:

1. Open the portal's search page
2. Map each filter to its URL parameter (click → read URL)
3. Create a Zod schema with `.describe()` hints on every field
4. Write a serializer function
5. Add known location codes
6. Submit a PR with verification notes

See the [GitHub repo](https://github.com/Boe-Ventures/real-estate-portal-schemas) for more details.

## License

MIT — [Homi](https://homi.so) / [Boe Ventures](https://github.com/Boe-Ventures)
