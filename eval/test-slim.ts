#!/usr/bin/env npx tsx
/**
 * Slim test: Use a simplified schema that fits Anthropic's limits,
 * then resolve via taxonomy adapters.
 *
 * Key insight: for AI generation, we don't need the full enum arrays.
 * We can use z.string() for amenities/propertyType and let the adapter
 * do fuzzy matching. The AI gets .describe() hints about valid values.
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { execSync } from "child_process";

// Taxonomy adapters
import { build } from "../src/adapters/index.js";
import type { NormalizedSearchParams } from "../src/taxonomy.js";

// Raw schemas for comparison (small portals only)
import { streetEasyConfig, streetEasyParamsSchema } from "../src/streeteasy-com.js";

const MODEL = anthropic("claude-haiku-4-5");

// ============================================================================
// SLIM SCHEMA — designed for AI consumption
// ============================================================================
// Instead of huge enum arrays, use strings with .describe() hints.
// The adapter does the matching. AI just needs to output reasonable names.

const SlimSearchSchema = z.object({
  location: z.string().optional()
    .describe("City or neighborhood name, e.g. 'Oslo', 'Grünerløkka', 'New York', 'Brooklyn'"),
  minPrice: z.number().optional()
    .describe("Min price. Rentals: monthly. Sales: total."),
  maxPrice: z.number().optional()
    .describe("Max price"),
  minBedrooms: z.number().optional()
    .describe("Minimum bedrooms"),
  maxBedrooms: z.number().optional()
    .describe("Maximum bedrooms"),
  minArea: z.number().optional()
    .describe("Min living area in m²"),
  propertyTypes: z.array(z.string()).optional()
    .describe("e.g. ['apartment', 'house', 'studio', 'townhouse', 'room']"),
  amenities: z.array(z.string()).optional()
    .describe("e.g. ['balcony', 'elevator', 'parking', 'garage', 'fireplace', 'pool', 'dishwasher', 'washing-machine', 'air-conditioning', 'garden', 'furnished']"),
  pets: z.boolean().optional()
    .describe("true = pet-friendly"),
  furnished: z.string().optional()
    .describe("'furnished', 'unfurnished', or 'partially-furnished'"),
  newConstruction: z.boolean().optional(),
  sort: z.string().optional()
    .describe("'newest', 'price-asc', 'price-desc', 'relevance'"),
});

/** Convert slim AI output → NormalizedSearchParams for the adapter */
function slimToNormalized(slim: z.infer<typeof SlimSearchSchema>): NormalizedSearchParams {
  return {
    location: slim.location,
    minPrice: slim.minPrice,
    maxPrice: slim.maxPrice,
    bedrooms: (slim.minBedrooms || slim.maxBedrooms)
      ? { min: slim.minBedrooms, max: slim.maxBedrooms }
      : undefined,
    minArea: slim.minArea,
    propertyType: slim.propertyTypes as any,
    amenities: slim.amenities as any,
    pets: slim.pets,
    furnished: slim.furnished ? [slim.furnished as any] : undefined,
    newConstruction: slim.newConstruction,
    sort: slim.sort as any,
  };
}

// ============================================================================
// TEST CASES
// ============================================================================

const tests = [
  {
    id: "oslo-rent",
    story: "Young couple moving to Oslo with a golden retriever. Need 2-bedroom with balcony, close to Grünerløkka. Budget 15,000 NOK/month. Elevator is a must.",
    portal: "finn.no" as const,
    intention: "rent" as const,
    expectedUrl: ["finn.no", "lettings"],
  },
  {
    id: "bergen-buy",
    story: "Family of four, kids 5 and 8. Buying first house in Bergen. Need 3+ bedrooms, garden, garage. Budget 5 million NOK.",
    portal: "finn.no" as const,
    intention: "buy" as const,
    expectedUrl: ["finn.no", "homes"],
  },
  {
    id: "nyc-rent",
    story: "Software engineer relocating to NYC. 1-bedroom, $3,500/month. Need in-unit laundry and AC. Prefer doorman building.",
    portal: "zillow" as const,
    intention: "rent" as const,
    expectedUrl: ["zillow.com"],
  },
  {
    id: "streeteasy-les",
    story: "Moving to Manhattan. Studio or 1-bed in East Village or Lower East Side. Max $2,800/month. Laundry in building, rooftop nice to have.",
    portal: "streeteasy" as const,
    intention: "rent" as const,
    expectedUrl: ["streeteasy.com", "for-rent"],
  },
];

// ============================================================================
// BROWSER VERIFY
// ============================================================================

function browserVerify(url: string, testId: string): string {
  try {
    execSync(`agent-browser open "${url}"`, { timeout: 15000, stdio: 'pipe' });
    execSync(`agent-browser wait --load networkidle`, { timeout: 20000, stdio: 'pipe' });

    const titleJson = JSON.parse(
      execSync(`agent-browser get title --json`, { timeout: 5000, stdio: 'pipe' }).toString()
    );
    const title = titleJson?.data?.value || "(no title)";

    const urlJson = JSON.parse(
      execSync(`agent-browser get url --json`, { timeout: 5000, stdio: 'pipe' }).toString()
    );
    const landed = urlJson?.data?.value || "";

    const shot = `/tmp/portal-${testId}.png`;
    execSync(`agent-browser screenshot ${shot}`, { timeout: 10000, stdio: 'pipe' });

    return `Title: "${title}"\n      Landed: ${landed}\n      Screenshot: ${shot}`;
  } catch (e: any) {
    return `Browser error: ${e.message?.slice(0, 120)}`;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("  Slim Schema → Taxonomy Adapter → Browser Verification");
  console.log("══════════════════════════════════════════════════════════════\n");

  for (const tc of tests) {
    console.log(`\n── ${tc.id} (${tc.portal}, ${tc.intention}) ──`);
    console.log(`   Story: ${tc.story}`);

    // --- Taxonomy approach (finn.no, zillow) ---
    if (tc.portal === "finn.no" || tc.portal === "zillow") {
      console.log("\n   [SLIM → TAXONOMY]");
      try {
        const t0 = Date.now();
        const { object: slim, usage } = await generateObject({
          model: MODEL,
          schema: SlimSearchSchema,
          system: "You are a real estate search assistant. Generate search parameters from the user's description. Only set relevant fields.",
          prompt: `Intention: ${tc.intention}\n\nUser story: ${tc.story}`,
        });
        const ms = Date.now() - t0;

        console.log(`   AI output (${ms}ms, ${usage?.totalTokens || '?'} tokens):`);
        console.log(`   ${JSON.stringify(slim, null, 2).split("\n").map((l, i) => i === 0 ? l : `   ${l}`).join("\n")}`);

        const normalized = slimToNormalized(slim);
        const url = build(tc.portal, tc.intention, normalized);
        console.log(`\n   URL: ${url}`);

        const checks = tc.expectedUrl.map(f => ({ f, ok: url.toLowerCase().includes(f.toLowerCase()) }));
        const allOk = checks.every(c => c.ok);
        console.log(`   URL checks: ${allOk ? "✅ ALL PASS" : "❌ FAILED: " + checks.filter(c => !c.ok).map(c => c.f).join(", ")}`);

        console.log(`\n   🌐 Browser verify...`);
        console.log(`      ${browserVerify(url, tc.id)}`);
      } catch (e: any) {
        console.log(`   ❌ ${e.message}`);
      }
    }

    // --- Raw schema for StreetEasy (fits under 24 params) ---
    if (tc.portal === "streeteasy") {
      console.log("\n   [RAW SCHEMA]");
      try {
        const config = streetEasyConfig;
        const baseUrl = config.baseUrls[tc.intention]!;

        const t0 = Date.now();
        const { object: params, usage } = await generateObject({
          model: MODEL,
          schema: streetEasyParamsSchema,
          system: [
            `Generate StreetEasy search parameters.`,
            `Base URL: ${baseUrl}`,
            config.knownLocations
              ? `Known locations:\n${Object.entries(config.knownLocations).map(([n, c]) => `  ${n}: ${c}`).join("\n")}`
              : "",
            "Use .describe() hints. Only set relevant filters.",
          ].filter(Boolean).join("\n"),
          prompt: `Intention: ${tc.intention}\n\nUser story: ${tc.story}`,
        });
        const ms = Date.now() - t0;

        console.log(`   AI output (${ms}ms, ${usage?.totalTokens || '?'} tokens):`);
        console.log(`   ${JSON.stringify(params, null, 2).split("\n").map((l, i) => i === 0 ? l : `   ${l}`).join("\n")}`);

        const url = config.serialize(baseUrl, params);
        console.log(`\n   URL: ${url}`);

        const checks = tc.expectedUrl.map(f => ({ f, ok: url.toLowerCase().includes(f.toLowerCase()) }));
        const allOk = checks.every(c => c.ok);
        console.log(`   URL checks: ${allOk ? "✅ ALL PASS" : "❌ FAILED: " + checks.filter(c => !c.ok).map(c => c.f).join(", ")}`);

        console.log(`\n   🌐 Browser verify...`);
        console.log(`      ${browserVerify(url, tc.id)}`);
      } catch (e: any) {
        console.log(`   ❌ ${e.message}`);
      }

      // Also test taxonomy approach for comparison
      console.log("\n   [SLIM → TAXONOMY (for comparison)]");
      try {
        // StreetEasy doesn't have an adapter yet, so just show what the AI generates
        const { object: slim } = await generateObject({
          model: MODEL,
          schema: SlimSearchSchema,
          system: "You are a real estate search assistant. Generate search parameters. Only set relevant fields.",
          prompt: `Intention: ${tc.intention}\n\nUser story: ${tc.story}`,
        });
        console.log(`   AI output: ${JSON.stringify(slim)}`);
        console.log(`   (No StreetEasy adapter yet — would need one to compare URLs)`);
      } catch (e: any) {
        console.log(`   ❌ ${e.message}`);
      }
    }
  }

  console.log("\n\n══════════════════════════════════════════════════════════════");
  console.log("  Done! Screenshots at /tmp/portal-*.png");
  console.log("══════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
