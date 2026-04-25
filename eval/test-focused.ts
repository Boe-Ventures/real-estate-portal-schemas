#!/usr/bin/env npx tsx
/**
 * Focused test: Taxonomy approach + browser verification
 * Also tests raw schema for StreetEasy (which fits under 24 params)
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { execSync } from "child_process";

// Raw schemas (for portals that fit)
import { streetEasyConfig, streetEasyParamsSchema } from "../src/streeteasy-com.js";
import { finnNoConfig, finnNoParamsSchema } from "../src/finn-no.js";
import { zillowConfig } from "../src/zillow-com.js";

// Taxonomy
import { NormalizedSearchParamsSchema, type NormalizedSearchParams } from "../src/taxonomy.js";
import { build } from "../src/adapters/index.js";

const MODEL = anthropic("claude-haiku-4-5");

// ============================================================================
// TEST CASES
// ============================================================================

const tests = [
  {
    id: "oslo-rent",
    story: "Young couple moving to Oslo with a golden retriever. Need 2-bedroom with balcony, close to Grünerløkka. Budget 15,000 NOK/month. Elevator is a must.",
    provider: "finn.no" as const,
    intention: "rent" as const,
    city: "Oslo",
    country: "NO",
    budget: 15000,
    currency: "NOK",
  },
  {
    id: "bergen-buy",
    story: "Family of four, kids 5 and 8. Looking to buy first house in Bergen. Need 3+ bedrooms, garden, garage. Budget up to 5 million NOK.",
    provider: "finn.no" as const,
    intention: "buy" as const,
    city: "Bergen",
    country: "NO",
    budget: 5000000,
    currency: "NOK",
  },
  {
    id: "nyc-rent",
    story: "Software engineer relocating to NYC. Looking for 1-bedroom, budget $3,500/month. Need in-unit laundry, doorman building. AC is non-negotiable.",
    provider: "zillow" as const,
    intention: "rent" as const,
    city: "New York",
    country: "US",
    budget: 3500,
    currency: "USD",
  },
  {
    id: "streeteasy-les",
    story: "Moving to Manhattan, studio or 1-bed in East Village or Lower East Side. Max $2,800/month. Laundry in building, rooftop would be nice.",
    provider: "streeteasy" as const,
    intention: "rent" as const,
    city: "New York",
    country: "US",
    budget: 2800,
    currency: "USD",
  },
];

// ============================================================================
// HELPERS
// ============================================================================

function browserCheck(url: string, testId: string): string {
  try {
    execSync(`agent-browser open "${url}"`, { timeout: 15000, stdio: 'pipe' });
    execSync(`agent-browser wait --load networkidle`, { timeout: 20000, stdio: 'pipe' });

    const titleJson = JSON.parse(
      execSync(`agent-browser get title --json`, { timeout: 5000, stdio: 'pipe' }).toString()
    );
    const title = titleJson?.data?.value || "(no title)";

    const screenshotPath = `/tmp/portal-${testId}.png`;
    execSync(`agent-browser screenshot ${screenshotPath}`, { timeout: 10000, stdio: 'pipe' });

    // Get URL to verify we landed correctly
    const urlJson = JSON.parse(
      execSync(`agent-browser get url --json`, { timeout: 5000, stdio: 'pipe' }).toString()
    );
    const landedUrl = urlJson?.data?.value || "(unknown)";

    return `✅ Title: "${title}" | Landed: ${landedUrl} | Screenshot: ${screenshotPath}`;
  } catch (e: any) {
    return `❌ Browser error: ${e.message?.slice(0, 100)}`;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("  Focused URL Generation Test");
  console.log("══════════════════════════════════════════════════════════════\n");

  for (const tc of tests) {
    console.log(`\n── ${tc.id} (${tc.provider}, ${tc.intention}) ──`);
    console.log(`   Story: ${tc.story.slice(0, 100)}...`);

    const prompt = [
      `Intention: ${tc.intention}`,
      `City: ${tc.city}`,
      `Country: ${tc.country}`,
      `Budget: ${tc.budget} ${tc.currency}`,
      ``,
      `User story: ${tc.story}`,
    ].join("\n");

    // ── Approach B: Taxonomy ──
    if (tc.provider === "finn.no" || tc.provider === "zillow") {
      console.log("\n   [TAXONOMY] Generating normalized params...");
      try {
        const { object: params } = await generateObject({
          model: MODEL,
          schema: NormalizedSearchParamsSchema,
          system: "You are a real estate search assistant. Generate normalized search parameters from the user's description. Use human-readable values — location names, amenity names. Only set relevant fields.",
          prompt,
        });
        console.log(`   Params: ${JSON.stringify(params, null, 2).split("\n").map((l, i) => i === 0 ? l : `   ${l}`).join("\n")}`);

        const url = build(tc.provider, tc.intention, params);
        console.log(`   URL: ${url}`);
        console.log(`   ${browserCheck(url, `${tc.id}-tax`)}`);
      } catch (e: any) {
        console.log(`   ❌ Failed: ${e.message}`);
      }
    }

    // ── Approach A: Raw schema (only StreetEasy, which fits under 24 params) ──
    if (tc.provider === "streeteasy") {
      console.log("\n   [RAW SCHEMA] Generating portal-native params...");
      try {
        const config = streetEasyConfig;
        const baseUrl = config.baseUrls[tc.intention]!;

        const { object: params } = await generateObject({
          model: MODEL,
          schema: streetEasyParamsSchema,
          system: [
            `Generate StreetEasy search parameters.`,
            `Base URL: ${baseUrl}`,
            config.knownLocations
              ? `Known location codes:\n${Object.entries(config.knownLocations).map(([n, c]) => `  ${n}: ${c}`).join("\n")}`
              : "",
            "Use .describe() hints. Only set relevant filters.",
          ].filter(Boolean).join("\n"),
          prompt,
        });
        console.log(`   Params: ${JSON.stringify(params, null, 2).split("\n").map((l, i) => i === 0 ? l : `   ${l}`).join("\n")}`);

        const url = config.serialize(baseUrl, params);
        console.log(`   URL: ${url}`);
        console.log(`   ${browserCheck(url, `${tc.id}-raw`)}`);
      } catch (e: any) {
        console.log(`   ❌ Failed: ${e.message}`);
      }
    }
  }

  console.log("\n\n══════════════════════════════════════════════════════════════");
  console.log("  Done! Review screenshots at /tmp/portal-*.png");
  console.log("══════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
