#!/usr/bin/env npx tsx
/**
 * Minimal test: dead-simple schema to verify Anthropic works,
 * then progressively add complexity.
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { execSync } from "child_process";
import { build } from "../src/adapters/index.js";
import type { NormalizedSearchParams } from "../src/taxonomy.js";

const MODEL = anthropic("claude-haiku-4-5");

// ============================================================================
// SLIM SCHEMA — strings instead of enum arrays, comma-sep for lists
// ============================================================================

const SearchSchema = z.object({
  location: z.string().optional()
    .describe("City or neighborhood name"),
  maxPrice: z.number().optional()
    .describe("Maximum price / budget ceiling. When user says 'budget X' or 'under X', this is maxPrice."),
  minPrice: z.number().optional()
    .describe("Minimum price floor. Only set when user explicitly wants a price ABOVE a certain amount."),
  minBedrooms: z.number().optional()
    .describe("Min bedrooms"),
  minArea: z.number().optional()
    .describe("Min area in m²"),
  amenities: z.string().optional()
    .describe("Comma-separated amenities: balcony, elevator, parking, garage, fireplace, garden, pool, dishwasher, washing-machine, air-conditioning, furnished, broadband"),
  propertyType: z.string().optional()
    .describe("Comma-separated types: apartment, house, townhouse, studio, room, cabin, duplex, farm"),
  pets: z.boolean().optional()
    .describe("Pet-friendly"),
  furnished: z.boolean().optional()
    .describe("Furnished"),
  newConstruction: z.boolean().optional(),
  sort: z.string().optional()
    .describe("newest, price-asc, price-desc, relevance"),
});

type SlimResult = z.infer<typeof SearchSchema>;

/** Convert slim → NormalizedSearchParams */
function toNormalized(s: SlimResult): NormalizedSearchParams {
  return {
    location: s.location,
    minPrice: s.minPrice,
    maxPrice: s.maxPrice,
    bedrooms: s.minBedrooms ? { min: s.minBedrooms } : undefined,
    minArea: s.minArea,
    amenities: s.amenities ? s.amenities.split(",").map(a => a.trim()) as any : undefined,
    propertyType: s.propertyType ? s.propertyType.split(",").map(t => t.trim()) as any : undefined,
    pets: s.pets,
    furnished: s.furnished ? ["furnished"] : undefined,
    newConstruction: s.newConstruction,
    sort: s.sort as any,
  };
}

// ============================================================================
// BROWSER
// ============================================================================

function browserCheck(url: string, id: string): string {
  try {
    execSync(`agent-browser open "${url}"`, { timeout: 15000, stdio: 'pipe' });
    execSync(`agent-browser wait --load networkidle`, { timeout: 20000, stdio: 'pipe' });

    const title = JSON.parse(
      execSync(`agent-browser get title --json`, { timeout: 5000, stdio: 'pipe' }).toString()
    )?.data?.value || "(no title)";

    const landed = JSON.parse(
      execSync(`agent-browser get url --json`, { timeout: 5000, stdio: 'pipe' }).toString()
    )?.data?.value || "";

    const shot = `/tmp/portal-${id}.png`;
    execSync(`agent-browser screenshot ${shot}`, { timeout: 10000, stdio: 'pipe' });

    // Quick content check
    const snap = execSync(`agent-browser snapshot -c -d 2`, { timeout: 10000, stdio: 'pipe' }).toString();
    const hasContent = snap.length > 300;

    return `${hasContent ? "✅" : "⚠️"} "${title}" | ${shot}`;
  } catch (e: any) {
    return `❌ ${e.message?.slice(0, 100)}`;
  }
}

// ============================================================================
// TESTS
// ============================================================================

interface Test {
  id: string;
  story: string;
  portal: "finn.no" | "zillow";
  intention: "buy" | "rent";
}

const TESTS: Test[] = [
  {
    id: "oslo-rent",
    story: "Young couple in Oslo with a dog. 2-bedroom, balcony, elevator. 15,000 NOK/month. Near Grünerløkka.",
    portal: "finn.no",
    intention: "rent",
  },
  {
    id: "bergen-buy",
    story: "Family buying first house in Bergen. 3+ bedrooms, garden, garage. Budget 5M NOK.",
    portal: "finn.no",
    intention: "buy",
  },
  {
    id: "nyc-rent",
    story: "Software engineer, NYC. 1-bedroom, $3,500/month. In-unit laundry, AC, doorman.",
    portal: "zillow",
    intention: "rent",
  },
  {
    id: "stavanger-rent",
    story: "Expat moving to Stavanger for oil job. 2BR apartment, modern, parking. 18,000 NOK/month.",
    portal: "finn.no",
    intention: "rent",
  },
];

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("  Minimal Schema → Taxonomy → Browser Test");
  console.log("══════════════════════════════════════════════════════════════\n");

  for (const tc of TESTS) {
    console.log(`\n── ${tc.id} (${tc.portal}, ${tc.intention}) ──`);
    console.log(`   "${tc.story}"\n`);

    try {
      const t0 = Date.now();
      const { object: slim, usage } = await generateObject({
        model: MODEL,
        schema: SearchSchema,
        system: [
            "You are a real estate search parameter extractor.",
            "Extract ALL requirements mentioned in the user's story into search parameters.",
            "Do not skip any detail — if they mention budget, bedrooms, amenities, location, property type, or any preference, include it.",
            "For amenities, list ALL mentioned: balcony, elevator, parking, garage, fireplace, garden, pool, dishwasher, washing-machine, air-conditioning, furnished, broadband, etc.",
            "For budget: use the exact number mentioned. Don't add margins.",
          ].join("\n"),
        prompt: `Intention: ${tc.intention}\n${tc.story}`,
      });
      const ms = Date.now() - t0;

      console.log(`   AI (${ms}ms, ${usage?.totalTokens || "?"} tok): ${JSON.stringify(slim)}`);

      const normalized = toNormalized(slim);
      console.log(`   Normalized: ${JSON.stringify(normalized)}`);

      const url = build(tc.portal, tc.intention, normalized);
      console.log(`   URL: ${url}`);

      console.log(`   🌐 ${browserCheck(url, tc.id)}`);
    } catch (e: any) {
      console.log(`   ❌ ${e.message}`);
    }
  }

  console.log("\n\nDone! Screenshots: /tmp/portal-*.png\n");
}

main().catch(console.error);
