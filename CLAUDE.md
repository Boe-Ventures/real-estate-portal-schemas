# CLAUDE.md

## Project

`@use_homi/real-estate-portal-schemas` — Zod-based query parameter schemas for real estate search portals. Each portal has a verified schema, serializer, and known locations.

## Key Files

- `src/{portal}.ts` — one file per portal (schema + serializer + config)
- `src/index.ts` — re-exports all portals
- `src/base-urls.ts` — base URL registry for all known portals (with and without schemas)
- `src/generate.ts` — AI URL generation (provider config registry)
- `src/taxonomy.ts` — normalized taxonomy (Airbnb-compatible)
- `src/adapters/` — portal-specific adapters from normalized taxonomy

## Adding a New Portal

**Read `ADDING-PORTALS.md` first.** It documents the full SOP including the critical verification step.

**The #1 rule:** Never guess or assume parameter values. Every filter code and location slug must be verified against the live site. We've found wrong mappings on EVERY portal we've built — the only reliable method is clicking each filter in a browser and reading the URL change.

**Quick checklist:**
1. Create `src/{portal}.ts` with schema + serializer + config
2. Wire into `src/index.ts`, `src/base-urls.ts`, `src/generate.ts`, `package.json` exports
3. `npx tsc --noEmit` must pass
4. Spot-check generated URLs in a real browser

## Architecture

- ESM-only, Zod peer dependency
- Each portal exports a `ProviderUrlConfig` with: `id`, `name`, `baseUrls`, `params` (Zod schema), `serialize`, `knownLocations`, `promptGuidance`, `examples`
- Subpath imports: `@use_homi/real-estate-portal-schemas/finn-no`
- `.describe()` strings are critical — they're injected into AI prompts for structured output generation
- Boolean `.describe()` should say "Omit to use default" to prevent AI over-specification

## Gotchas

- Zillow uses a JSON blob (`searchQueryState`), not query params
- StreetEasy uses a path-based DSL (`/for-rent/nyc/type:D1|price:2000-4000`)
- LeaseBreak uses path segments and combined neighborhood names (`Chelsea-Hudson-Yards`, not `Chelsea`)
- Anthropic structured output has a 24 optional parameter limit — use two-pass for large schemas
- Cloudflare blocks curl on some portals — need real browser or Google index for verification
