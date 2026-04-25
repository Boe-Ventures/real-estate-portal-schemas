#!/usr/bin/env npx tsx
/**
 * Live URL Generation + Browser Verification
 *
 * Tests the full pipeline:
 *   1. AI generates search params from a "story" + context
 *   2. Schema serializes to URL
 *   3. agent-browser opens URL and verifies real results
 *
 * Approach A: Raw Zod schema (current Homi approach)
 * Approach B: Taxonomy .build() (new normalized approach)
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... npx tsx eval/test-urls-live.ts
 *   OPENAI_API_KEY=... npx tsx eval/test-urls-live.ts --openai
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { execSync } from "child_process";

// Raw schemas (Approach A)
import { finnNoConfig, finnNoParamsSchema } from "../src/finn-no.js";
import { zillowConfig, zillowParamsSchema } from "../src/zillow-com.js";
import { streetEasyConfig, streetEasyParamsSchema } from "../src/streeteasy-com.js";
import { airbnbConfig, airbnbParamsSchema } from "../src/airbnb-com.js";

// Taxonomy (Approach B)
import { NormalizedSearchParamsSchema, type NormalizedSearchParams } from "../src/taxonomy.js";
import { build } from "../src/adapters/index.js";

// ============================================================================
// TEST CASES — real stories, not just filter lists
// ============================================================================

interface TestCase {
  id: string;
  story: string;
  provider: "finn.no" | "zillow" | "streeteasy" | "airbnb";
  intention: "buy" | "rent" | "rent_short";
  context: {
    city?: string;
    country?: string;
    budget?: number;
    currency?: string;
    bedrooms?: number;
    amenities?: string[];
  };
  /** Human-checkable expectations */
  expect: {
    urlContains?: string[];
    resultsShould?: string;
  };
}

const TEST_CASES: TestCase[] = [
  {
    id: "oslo-young-couple",
    story: "We're a young couple moving to Oslo with our golden retriever. Need a 2-bedroom with a balcony, close to Grünerløkka. Budget is around 15,000 NOK/month. Elevator is a must — we're tired of carrying groceries up stairs.",
    provider: "finn.no",
    intention: "rent",
    context: {
      city: "Oslo",
      country: "NO",
      budget: 15000,
      currency: "NOK",
      bedrooms: 2,
      amenities: ["balcony", "elevator"],
    },
    expect: {
      urlContains: ["finn.no", "lettings", "0.20061"],
      resultsShould: "Show rental listings in Oslo",
    },
  },
  {
    id: "bergen-family-buy",
    story: "Family of four looking to buy our first house in Bergen. Kids are 5 and 8, so we need at least 3 bedrooms and a garden would be amazing. Budget up to 5 million NOK. Prefer something with a garage — Bergen rain is no joke.",
    provider: "finn.no",
    intention: "buy",
    context: {
      city: "Bergen",
      country: "NO",
      budget: 5000000,
      currency: "NOK",
      bedrooms: 3,
      amenities: ["garage", "garden"],
    },
    expect: {
      urlContains: ["finn.no", "homes", "20220"],
      resultsShould: "Show houses for sale in Bergen area",
    },
  },
  {
    id: "nyc-zillow-rental",
    story: "Software engineer relocating to NYC for a new job in Midtown. Looking for a 1-bedroom apartment, budget around $3,500/month. Need in-unit laundry and a doorman building. AC is non-negotiable in summer.",
    provider: "zillow",
    intention: "rent",
    context: {
      city: "New York",
      country: "US",
      budget: 3500,
      currency: "USD",
      bedrooms: 1,
      amenities: ["in-unit-laundry", "air-conditioning"],
    },
    expect: {
      urlContains: ["zillow.com", "new-york"],
      resultsShould: "Show rental listings in NYC area",
    },
  },
  {
    id: "nyc-streeteasy-rental",
    story: "Moving to Manhattan, looking for a studio or 1-bed in the East Village or Lower East Side. Max $2,800/month. Laundry in building is fine. Would love a rooftop.",
    provider: "streeteasy",
    intention: "rent",
    context: {
      city: "New York",
      country: "US",
      budget: 2800,
      currency: "USD",
      bedrooms: 1,
      amenities: ["laundry"],
    },
    expect: {
      urlContains: ["streeteasy.com", "for-rent"],
      resultsShould: "Show rentals in East Village / LES area",
    },
  },
  {
    id: "bali-airbnb-short",
    story: "Digital nomad spending 2 months in Bali. Need a place in Canggu with fast WiFi, a pool, and a workspace. Budget around $1,500/month. Kitchen is important — I like to cook.",
    provider: "airbnb",
    intention: "rent_short",
    context: {
      city: "Canggu, Bali",
      country: "ID",
      budget: 1500,
      currency: "USD",
      bedrooms: 1,
      amenities: ["pool", "wifi", "kitchen"],
    },
    expect: {
      urlContains: ["airbnb.com"],
      resultsShould: "Show Airbnb listings in Bali/Canggu area",
    },
  },
];

// ============================================================================
// APPROACH A: Raw schema + AI (mirrors Homi's source-url-generator)
// ============================================================================

const PROVIDER_CONFIGS: Record<string, { config: any; schema: any }> = {
  "finn.no": { config: finnNoConfig, schema: finnNoParamsSchema },
  "zillow": { config: zillowConfig, schema: zillowParamsSchema },
  "streeteasy": { config: streetEasyConfig, schema: streetEasyParamsSchema },
  "airbnb": { config: airbnbConfig, schema: airbnbParamsSchema },
};

async function approachA(tc: TestCase): Promise<{ url: string; params: unknown }> {
  const { config, schema } = PROVIDER_CONFIGS[tc.provider]!;
  const baseUrl = config.baseUrls[tc.intention === "rent_short" ? "rent_short" : tc.intention];

  const systemPrompt = [
    `You are a real estate search URL parameter generator for ${config.name}.`,
    `Generate the optimal search parameters for the given context.`,
    `Base URL: ${baseUrl}`,
    "",
    config.knownLocations
      ? `Known location codes:\n${Object.entries(config.knownLocations)
          .map(([name, code]: [string, any]) => `  ${name}: ${code}`)
          .join("\n")}`
      : "",
    "",
    "Use .describe() hints on each field. Only set relevant filters.",
    "For budget: apply ±20% margin for buy, ±25% for rent.",
  ].filter(Boolean).join("\n");

  const contextPrompt = [
    `Intention: ${tc.intention}`,
    tc.context.city ? `City: ${tc.context.city}` : "",
    tc.context.country ? `Country: ${tc.context.country}` : "",
    tc.context.budget ? `Budget: ${tc.context.budget} ${tc.context.currency}/month` : "",
    tc.context.bedrooms ? `Bedrooms: ${tc.context.bedrooms}` : "",
    tc.context.amenities?.length ? `Amenities: ${tc.context.amenities.join(", ")}` : "",
    "",
    `User story: ${tc.story}`,
  ].filter(Boolean).join("\n");

  const { object: params } = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema,
    system: systemPrompt,
    prompt: contextPrompt,
  });

  const url = config.serialize(baseUrl, params);
  return { url, params };
}

// ============================================================================
// APPROACH B: Taxonomy → adapter
// ============================================================================

async function approachB(tc: TestCase): Promise<{ url: string; params: NormalizedSearchParams }> {
  const { object: params } = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema: NormalizedSearchParamsSchema,
    system: [
      "You are a real estate search assistant.",
      "Generate normalized search parameters from the user's description.",
      "Use human-readable values — location names (not codes), amenity names (not IDs).",
      "Only set fields that are relevant to the query.",
    ].join("\n"),
    prompt: [
      `Intention: ${tc.intention}`,
      tc.context.city ? `City: ${tc.context.city}` : "",
      tc.context.country ? `Country: ${tc.context.country}` : "",
      tc.context.budget ? `Budget: ${tc.context.budget} ${tc.context.currency}` : "",
      tc.context.bedrooms ? `Bedrooms: ${tc.context.bedrooms}` : "",
      "",
      `User story: ${tc.story}`,
    ].filter(Boolean).join("\n"),
  });

  // Map provider names for the adapter
  const portalMap: Record<string, "finn.no" | "zillow"> = {
    "finn.no": "finn.no",
    "zillow": "zillow",
  };
  const portal = portalMap[tc.provider];
  if (!portal) {
    // Taxonomy adapters only exist for finn.no and zillow right now
    return { url: "(no adapter for this provider yet)", params };
  }

  const url = build(portal, tc.intention as "buy" | "rent", params);
  return { url, params };
}

// ============================================================================
// BROWSER VERIFICATION
// ============================================================================

function verifyWithBrowser(url: string, testId: string): { 
  success: boolean; 
  title: string;
  hasResults: boolean;
  screenshot: string;
} {
  try {
    // Open URL
    execSync(`agent-browser open "${url}"`, { timeout: 15000, stdio: 'pipe' });
    
    // Wait for page load
    execSync(`agent-browser wait --load networkidle`, { timeout: 15000, stdio: 'pipe' });
    
    // Get title
    const titleResult = JSON.parse(
      execSync(`agent-browser get title --json`, { timeout: 5000, stdio: 'pipe' }).toString()
    );
    const title = titleResult?.data?.value || "(no title)";
    
    // Screenshot for manual review
    const screenshotPath = `/tmp/portal-test-${testId}.png`;
    execSync(`agent-browser screenshot ${screenshotPath}`, { timeout: 10000, stdio: 'pipe' });
    
    // Snapshot to check for listing content
    const snapshot = execSync(`agent-browser snapshot -c -d 3 --json`, { timeout: 10000, stdio: 'pipe' }).toString();
    
    // Simple heuristic: check if page has substantial content (not an error page)
    const hasResults = snapshot.length > 500 && !snapshot.includes("no results") && !snapshot.includes("0 results");
    
    return { success: true, title, hasResults, screenshot: screenshotPath };
  } catch (e: any) {
    return { success: false, title: "(browser error)", hasResults: false, screenshot: "" };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Portal URL Generation — Live Test");
  console.log("═══════════════════════════════════════════════════════════\n");

  const results: Array<{
    id: string;
    provider: string;
    approachA: { url: string; params: unknown; browser?: ReturnType<typeof verifyWithBrowser> };
    approachB: { url: string; params: unknown; browser?: ReturnType<typeof verifyWithBrowser> } | null;
  }> = [];

  for (const tc of TEST_CASES) {
    console.log(`\n── ${tc.id} (${tc.provider}, ${tc.intention}) ──`);
    console.log(`   Story: ${tc.story.slice(0, 80)}...`);

    // Approach A: Raw schema
    console.log("\n   [A] Raw Zod schema...");
    try {
      const a = await approachA(tc);
      console.log(`   URL: ${a.url}`);
      
      // Check URL expectations
      const urlChecks = (tc.expect.urlContains || []).map(fragment => ({
        fragment,
        found: a.url.toLowerCase().includes(fragment.toLowerCase()),
      }));
      const allPass = urlChecks.every(c => c.found);
      console.log(`   URL checks: ${allPass ? "✅ ALL PASS" : "❌ SOME FAILED"}`);
      urlChecks.filter(c => !c.found).forEach(c => console.log(`     ❌ Missing: "${c.fragment}"`));
      
      // Browser verify
      console.log("   🌐 Opening in browser...");
      const browserA = verifyWithBrowser(a.url, `${tc.id}-A`);
      console.log(`   Title: ${browserA.title}`);
      console.log(`   Has results: ${browserA.hasResults ? "✅" : "⚠️ unclear"}`);
      if (browserA.screenshot) console.log(`   Screenshot: ${browserA.screenshot}`);

      // Approach B: Taxonomy (only for finn.no and zillow)
      let bResult = null;
      if (tc.provider === "finn.no" || tc.provider === "zillow") {
        console.log("\n   [B] Taxonomy → adapter...");
        try {
          const b = await approachB(tc);
          console.log(`   URL: ${b.url}`);
          console.log(`   Normalized params: ${JSON.stringify(b.params, null, 2).split("\n").map((l, i) => i === 0 ? l : `   ${l}`).join("\n")}`);
          
          if (b.url !== "(no adapter for this provider yet)") {
            console.log("   🌐 Opening in browser...");
            const browserB = verifyWithBrowser(b.url, `${tc.id}-B`);
            console.log(`   Title: ${browserB.title}`);
            console.log(`   Has results: ${browserB.hasResults ? "✅" : "⚠️ unclear"}`);
            if (browserB.screenshot) console.log(`   Screenshot: ${browserB.screenshot}`);
            bResult = { ...b, browser: browserB };
          } else {
            bResult = { ...b };
          }
        } catch (e: any) {
          console.log(`   ❌ Taxonomy approach failed: ${e.message}`);
        }
      }

      results.push({
        id: tc.id,
        provider: tc.provider,
        approachA: { ...a, browser: browserA },
        approachB: bResult,
      });
    } catch (e: any) {
      console.log(`   ❌ Raw approach failed: ${e.message}`);
      results.push({
        id: tc.id,
        provider: tc.provider,
        approachA: { url: "(failed)", params: null },
        approachB: null,
      });
    }
  }

  // Summary
  console.log("\n\n═══════════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════════════\n");
  
  console.log("ID                    | Provider    | A URL OK | A Browser | B URL OK | B Browser");
  console.log("─────────────────────-|─────────────|──────────|───────────|──────────|──────────");
  
  for (const r of results) {
    const aUrlOk = r.approachA.url !== "(failed)" ? "✅" : "❌";
    const aBrowser = r.approachA.browser?.hasResults ? "✅" : "⚠️";
    const bUrlOk = r.approachB ? (r.approachB.url !== "(no adapter for this provider yet)" && r.approachB.url !== "(failed)" ? "✅" : "—") : "—";
    const bBrowser = (r.approachB as any)?.browser?.hasResults ? "✅" : "—";
    console.log(`${r.id.padEnd(22)}| ${r.provider.padEnd(12)}| ${aUrlOk.padEnd(9)}| ${aBrowser.padEnd(10)}| ${bUrlOk.padEnd(9)}| ${bBrowser}`);
  }

  console.log("\nScreenshots saved to /tmp/portal-test-*.png");
  console.log("Review them to verify result quality.\n");
}

main().catch(console.error);
