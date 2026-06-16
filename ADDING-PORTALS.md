# Adding a New Portal — Standard Operating Procedure

This document describes the verified process for adding a new real estate portal to `@use_homi/real-estate-portal-schemas`. **The key principle: never trust guesses — verify every parameter against the live site.**

## Why This Matters

Every portal we've verified has had wrong mappings in previous code or assumptions:
- **Finn.no:** 4 wrong facility/property type codes
- **Zillow:** Basement filter triggers 3 keys simultaneously (compound gotcha)
- **StreetEasy:** Every neighborhood ID in old code was wrong (25/25)
- **LeaseBreak:** Neighborhood slugs use combined names (`Chelsea-Hudson-Yards`, not `Chelsea`)

AI models (including us) hallucinate plausible-looking parameter values. The only way to get correct schemas is to verify against the live site.

## Process

### Phase 1: Reconnaissance

1. **Open the portal in a browser** (agent-browser or OpenClaw browser tool)
2. **Identify the URL structure:**
   - Query params? (`finn.no/search?price_to=15000`)
   - JSON blob? (Zillow's `searchQueryState`)
   - Path-based DSL? (StreetEasy: `/for-rent/nyc/type:D1|price:2000-4000`)
   - Path segments? (LeaseBreak: `/short-term-rentals/Manhattan/Chelsea-Hudson-Yards`)
3. **Check for Cloudflare/bot protection** — if curl gets 403, you need a real browser session
4. **Note the listing types** — buy, rent, rent_short, commercial? Each gets its own base URL

### Phase 2: Filter Verification (The Core Loop)

For each filter on the portal's search page:

1. **Start with a clean URL** (no filters applied)
2. **Click/toggle ONE filter** in the UI
3. **Read the URL change** — this gives you the exact parameter key and value
4. **Record it** in the schema with a `.describe()` hint
5. **Reset and repeat** for the next filter

**Key patterns learned:**
- SPA sites (React/Vue) update the URL in real-time on click — fast, ~3s per filter
- Server-rendered sites (StreetEasy) can use `web_fetch` — 10x faster, no browser needed
- Some filters are compound (Zillow basement = 3 keys at once) — test each filter in isolation
- Some sites use internal codes (Finn.no `facilities=4` = elevator, not parking)
- Location codes are the hardest — defer them, focus on filter params first

**Using agent-browser (preferred for SPAs):**
```bash
agent-browser open "https://portal.com/search"
agent-browser snapshot -i --json          # see interactive elements
agent-browser click @e12                   # click a filter
agent-browser snapshot --json              # read URL change
```

**Using web_search for verification (when Cloudflare blocks):**
```
site:portal.com/search-path/ "Neighborhood-Name"
```
Google's index reveals which URL slugs actually resolve vs 404.

### Phase 3: Location Codes

Locations are special — they're usually opaque IDs or slugs that you can't guess:

1. **Check if the portal has a location autocomplete API** (network tab)
2. **For path-based locations** (LeaseBreak, StreetEasy): search Google index to verify which slugs exist
3. **For code-based locations** (Finn.no): click through the location picker, record each code
4. **Start with major cities/neighborhoods** — don't try to be exhaustive on day one
5. **Document what's verified vs unverified** in `knownLocations`

**⚠️ Common trap:** Neighborhood names often differ from what you'd expect:
- "Chelsea" → actually "Chelsea-Hudson-Yards" (LeaseBreak)
- "Gramercy" → actually "Gramercy-Park" (LeaseBreak)
- "Murray Hill" → actually "Murray-Hill-Kips-Bay" (LeaseBreak)

### Phase 4: Implementation

Create `src/{portal-domain}.ts` following the established pattern:

```typescript
import { z } from "zod";
import type { ProviderUrlConfig } from "./index.js";

// Header comment: URL structure, verification date, portal description

export const portalParamsSchema = z.object({
  // Each param has a .describe() that helps AI models generate correct values.
  // Use "Omit to use default" for optional booleans (prevents over-specification).
});

function serializePortalUrl(baseUrl: string, params: unknown): string {
  // Serializer matches the portal's URL structure
}

export const portalConfig: ProviderUrlConfig = {
  id: "portal.com",
  name: "Portal",
  baseUrls: { rent: "...", buy: "..." },
  params: portalParamsSchema,
  serialize: serializePortalUrl,
  knownLocations: { /* verified only */ },
  promptGuidance: [ /* key usage notes */ ],
  examples: [ /* 2-3 representative examples */ ],
};
```

### Phase 5: Wire It Up

1. **`src/index.ts`** — add export
2. **`src/base-urls.ts`** — add to the appropriate country's provider list, set `hasSchema: true`
3. **`src/generate.ts`** — add to `PROVIDER_CONFIGS` (full ID + short alias)
4. **`package.json`** — add subpath export under `"exports"`, bump version

### Phase 6: Verify

```bash
npx tsc --noEmit            # must compile clean
npm run build                # build succeeds
# Spot-check: generate a URL and paste it in a browser — does it show correct results?
```

## .describe() Guidelines

- **Booleans:** Say "Omit to use default" — prevents AI from setting every flag explicitly
- **Enums:** List all valid values inline — the model needs them at generation time
- **Location codes:** Reference `knownLocations` — "Use a slug from knownLocations, never invent one"
- **Keep it concise** — the description is injected into AI prompts, so brevity matters

## Serialization Patterns

| Pattern | Example | Serializer approach |
|---------|---------|-------------------|
| Query params | Finn.no | `URLSearchParams` or manual `key=value&...` |
| JSON blob | Zillow | Wrap values in `{value: x}`, encode as `searchQueryState` |
| Path DSL | StreetEasy | Pipe-separated segments: `type:D1\|price:2000-4000` |
| Path segments | LeaseBreak | Build path: `/short-term-rentals/Manhattan/Chelsea-Hudson-Yards` |

## Checklist

- [ ] URL structure identified and documented in header comment
- [ ] Every filter verified against live site (not guessed)
- [ ] Location codes verified (not assumed from neighborhood names)
- [ ] `.describe()` strings are concise and model-friendly
- [ ] `promptGuidance` covers portal-specific gotchas
- [ ] 2-3 `examples` with realistic search scenarios
- [ ] `knownLocations` contains ONLY verified slugs/codes
- [ ] Wired into `index.ts`, `base-urls.ts`, `generate.ts`, `package.json`
- [ ] `tsc --noEmit` passes
- [ ] Build succeeds
- [ ] Generated URL manually tested in browser
