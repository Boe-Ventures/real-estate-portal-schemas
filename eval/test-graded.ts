#!/usr/bin/env npx tsx
/**
 * Graded URL Generation Test
 *
 * Diverse stories → AI extraction → taxonomy adapter → URL
 * Each result graded on completeness and correctness.
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { build } from "../src/adapters/index.js";
import type { NormalizedSearchParams } from "../src/taxonomy.js";

// Haiku sometimes hits grammar compilation timeouts on structured output.
// Sonnet is more reliable. Fall back to Haiku for cost if needed.
const MODEL = anthropic("claude-sonnet-4-20250514");

const SearchSchema = z.object({
  location: z.string().optional()
    .describe("City or neighborhood name"),
  maxPrice: z.number().optional()
    .describe("Maximum price / budget ceiling. When user says 'budget X' or 'under X', this is maxPrice."),
  minPrice: z.number().optional()
    .describe("Minimum price floor. Only set when user explicitly wants a price ABOVE a certain amount."),
  minBedrooms: z.number().optional()
    .describe("Min bedrooms"),
  maxBedrooms: z.number().optional()
    .describe("Max bedrooms"),
  minArea: z.number().optional()
    .describe("Min area in m²"),
  amenities: z.string().optional()
    .describe("Comma-separated amenities: balcony, elevator, parking, garage, fireplace, garden, pool, dishwasher, washing-machine, air-conditioning, furnished, broadband, view, waterfront, ev-charging"),
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

function toNormalized(s: SlimResult): NormalizedSearchParams {
  return {
    location: s.location,
    minPrice: s.minPrice,
    maxPrice: s.maxPrice,
    bedrooms: (s.minBedrooms || s.maxBedrooms)
      ? { min: s.minBedrooms, max: s.maxBedrooms }
      : undefined,
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
// TEST CASES — realistic stories with expected extractions
// ============================================================================

interface TestCase {
  id: string;
  story: string;
  portal: "finn.no" | "zillow";
  intention: "buy" | "rent";
  /** What the AI SHOULD extract */
  expectedParams: Record<string, any>;
  /** What the URL SHOULD contain */
  expectedUrlParts: string[];
}

const TESTS: TestCase[] = [
  // --- FINN.NO RENTALS ---
  {
    id: "1-oslo-young-couple",
    story: "We're a young couple moving to Oslo with our golden retriever. Need a 2-bedroom with a balcony, close to Grünerløkka. Budget is around 15,000 NOK/month. Elevator is a must — we're tired of carrying groceries up stairs.",
    portal: "finn.no",
    intention: "rent",
    expectedParams: { location: "Grünerløkka", maxPrice: 15000, minBedrooms: 2, amenities: "balcony, elevator", pets: true },
    expectedUrlParts: ["lettings", "20511", "price_to=15000", "min_bedrooms=2", "facilities=1", "facilities=4", "animals_allowed=1"],
  },
  {
    id: "2-trondheim-student",
    story: "Starting my masters at NTNU in August. Just need a cheap room or small apartment in Trondheim, ideally furnished since I'm coming from abroad. Under 8,000 NOK would be great. Internet is essential.",
    portal: "finn.no",
    intention: "rent",
    expectedParams: { location: "Trondheim", maxPrice: 8000, amenities: "broadband, furnished", propertyType: "room, apartment" },
    expectedUrlParts: ["lettings", "20318", "price_to=8000"],
  },
  {
    id: "3-oslo-luxury",
    story: "Looking for a high-end apartment to rent in Frogner or Majorstuen area of Oslo. At least 100 m², 3 bedrooms, must have a view and fireplace. Budget is not a concern but let's say up to 35,000/month.",
    portal: "finn.no",
    intention: "rent",
    expectedParams: { location: "Frogner", maxPrice: 35000, minBedrooms: 3, minArea: 100, amenities: "view, fireplace" },
    expectedUrlParts: ["lettings", "price_to=35000", "min_bedrooms=3", "area_from=100"],
  },
  {
    id: "4-stavanger-expat",
    story: "Oil engineer relocating to Stavanger with family. Need a 4-bedroom house with a garden and parking. Kids need space. Budget up to 25,000 NOK/month. Prefer something modern with good insulation.",
    portal: "finn.no",
    intention: "rent",
    expectedParams: { location: "Stavanger", maxPrice: 25000, minBedrooms: 4, amenities: "garden, parking", propertyType: "house" },
    expectedUrlParts: ["lettings", "20196", "price_to=25000", "min_bedrooms=4", "property_type=1"],
  },

  // --- FINN.NO BUYING ---
  {
    id: "5-bergen-first-home",
    story: "First-time buyer in Bergen. Young professional, single, looking for a small apartment — 1 or 2 bedrooms is fine. Budget around 3 million NOK. Would love a balcony and to be in or near Bergen Sentrum.",
    portal: "finn.no",
    intention: "buy",
    expectedParams: { location: "Bergen Sentrum", maxPrice: 3000000, minBedrooms: 1, maxBedrooms: 2, amenities: "balcony", propertyType: "apartment" },
    expectedUrlParts: ["homes", "price_to=3000000", "property_type=3"],
  },
  {
    id: "6-oslo-family-upgrade",
    story: "We've outgrown our apartment in Oslo. Family of 5 needs a house or townhouse with at least 4 bedrooms, 150+ m². Must have garage and garden. Budget 8-12 million NOK. Prefer Røa, Ullern, or Sogn area.",
    portal: "finn.no",
    intention: "buy",
    expectedParams: { location: "Røa", minPrice: 8000000, maxPrice: 12000000, minBedrooms: 4, minArea: 150, amenities: "garage, garden", propertyType: "house, townhouse" },
    expectedUrlParts: ["homes", "price_from=8000000", "price_to=12000000", "min_bedrooms=4", "area_from=150"],
  },
  {
    id: "7-cabin-dream",
    story: "Looking to buy a cabin (hytte) near Trondheim. Something with a fireplace, waterfront access, and hiking nearby. Budget 2-4 million NOK. Size doesn't matter much, it's the location that counts.",
    portal: "finn.no",
    intention: "buy",
    expectedParams: { location: "Trondheim", minPrice: 2000000, maxPrice: 4000000, amenities: "fireplace, waterfront, hiking-access", propertyType: "cabin" },
    expectedUrlParts: ["homes", "price_from=2000000", "price_to=4000000", "property_type=12"],
  },

  // --- ZILLOW RENTALS ---
  {
    id: "8-nyc-tech-worker",
    story: "Software engineer starting at a startup in Manhattan. Need a 1-bedroom, max $3,500/month. In-unit laundry is a must, AC essential for summer. Would love a doorman building.",
    portal: "zillow",
    intention: "rent",
    expectedParams: { location: "NYC", maxPrice: 3500, minBedrooms: 1, amenities: "washing-machine, air-conditioning, elevator" },
    expectedUrlParts: ["zillow.com", "rentals"],
  },
  {
    id: "9-sf-couple",
    story: "Couple moving to San Francisco for work. Looking for a 2-bedroom apartment, budget around $4,000/month. Need parking (we're keeping one car) and laundry. Dog-friendly building.",
    portal: "zillow",
    intention: "rent",
    expectedParams: { location: "San Francisco", maxPrice: 4000, minBedrooms: 2, amenities: "parking, washing-machine", pets: true },
    expectedUrlParts: ["zillow.com", "rentals"],
  },
  {
    id: "10-chicago-budget",
    story: "Just graduated, first apartment in Chicago. Studio or 1-bed, under $1,500/month. AC and dishwasher would be nice. Close to the L train if possible.",
    portal: "zillow",
    intention: "rent",
    expectedParams: { location: "Chicago", maxPrice: 1500, minBedrooms: 0, amenities: "air-conditioning, dishwasher" },
    expectedUrlParts: ["zillow.com", "rentals"],
  },

  // --- EDGE CASES ---
  {
    id: "11-vague-story",
    story: "I just need somewhere to live in Oslo. Anything affordable, I'm not picky. Maybe around 10-12k a month?",
    portal: "finn.no",
    intention: "rent",
    expectedParams: { location: "Oslo", minPrice: 10000, maxPrice: 12000 },
    expectedUrlParts: ["lettings", "20061", "price_from=10000", "price_to=12000"],
  },
  {
    id: "12-very-specific",
    story: "Retired couple looking for a ground floor apartment in Nordstrand, Oslo. 2 bedrooms, must have elevator access, EV charging for our Tesla, and no overlooking neighbors. Max 5 million NOK. Energy rating A or B preferred.",
    portal: "finn.no",
    intention: "buy",
    expectedParams: { location: "Nordstrand", maxPrice: 5000000, minBedrooms: 2, amenities: "elevator, ev-charging, no-overlooking-neighbors", propertyType: "apartment" },
    expectedUrlParts: ["homes", "20516", "price_to=5000000", "min_bedrooms=2"],
  },
];

// ============================================================================
// GRADING
// ============================================================================

function grade(tc: TestCase, slim: SlimResult, url: string): { score: number; maxScore: number; notes: string[] } {
  const notes: string[] = [];
  let score = 0;
  let maxScore = 0;

  // Check each expected param
  for (const [key, expected] of Object.entries(tc.expectedParams)) {
    maxScore += 1;
    const actual = (slim as any)[key];
    if (actual === undefined || actual === null) {
      notes.push(`❌ Missing: ${key} (expected: ${expected})`);
    } else if (key === "amenities") {
      // Check that all expected amenities are present
      const expectedList = String(expected).split(",").map(a => a.trim().toLowerCase());
      const actualList = String(actual).split(",").map(a => a.trim().toLowerCase());
      const missing = expectedList.filter(e => !actualList.some(a => a.includes(e) || e.includes(a)));
      if (missing.length === 0) {
        score += 1;
        notes.push(`✅ ${key}: ${actual}`);
      } else {
        score += 0.5; // partial credit
        notes.push(`⚠️ ${key}: got "${actual}" but missing [${missing.join(", ")}]`);
      }
    } else if (typeof expected === "number") {
      // Allow 10% tolerance on numbers
      const tolerance = expected * 0.1;
      if (Math.abs(Number(actual) - expected) <= tolerance) {
        score += 1;
        notes.push(`✅ ${key}: ${actual}`);
      } else {
        score += 0.5;
        notes.push(`⚠️ ${key}: got ${actual}, expected ~${expected}`);
      }
    } else {
      const actualLower = String(actual).toLowerCase();
      const expectedLower = String(expected).toLowerCase();
      if (actualLower.includes(expectedLower) || expectedLower.includes(actualLower)) {
        score += 1;
        notes.push(`✅ ${key}: ${actual}`);
      } else {
        score += 0.25;
        notes.push(`⚠️ ${key}: got "${actual}", expected "${expected}"`);
      }
    }
  }

  // Check URL parts
  for (const part of tc.expectedUrlParts) {
    maxScore += 1;
    if (url.includes(part)) {
      score += 1;
      notes.push(`✅ URL has: ${part}`);
    } else {
      notes.push(`❌ URL missing: ${part}`);
    }
  }

  return { score, maxScore, notes };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("══════════════════════════════════════════════════════════════════════");
  console.log("  Graded URL Generation — Stories → Params → URLs");
  console.log("══════════════════════════════════════════════════════════════════════\n");

  const results: Array<{ id: string; score: number; maxScore: number; pct: string }> = [];

  for (const tc of TESTS) {
    console.log(`\n── ${tc.id} (${tc.portal}, ${tc.intention}) ──`);
    console.log(`   📖 "${tc.story}"\n`);

    try {
      const t0 = Date.now();
      const { object: slim, usage } = await generateObject({
        model: MODEL,
        schema: SearchSchema,
        system: [
          "You are a real estate search parameter extractor.",
          "Extract ALL requirements from the user's story into search parameters.",
          "Do not skip any detail — budget, bedrooms, amenities, location, property type, area, pets, furnished.",
          "For amenities, list ALL mentioned (comma-separated).",
          "'Budget X' or 'under X' or 'max X' = maxPrice. 'Above X' or 'at least X price' = minPrice.",
          "If a price RANGE is given (e.g. '8-12 million'), set BOTH minPrice and maxPrice.",
        ].join("\n"),
        prompt: `Intention: ${tc.intention}\n\n${tc.story}`,
      });
      const ms = Date.now() - t0;

      console.log(`   🤖 AI (${ms}ms, ${usage?.totalTokens || "?"} tok):`);
      console.log(`      ${JSON.stringify(slim)}`);

      const normalized = toNormalized(slim);
      const url = build(tc.portal, tc.intention, normalized);
      console.log(`   🔗 ${url}`);

      const { score, maxScore, notes } = grade(tc, slim, url);
      const pct = `${Math.round(score / maxScore * 100)}%`;
      console.log(`\n   📊 Score: ${score}/${maxScore} (${pct})`);
      for (const n of notes) console.log(`      ${n}`);

      results.push({ id: tc.id, score, maxScore, pct });
    } catch (e: any) {
      console.log(`   ❌ ${e.message}`);
      results.push({ id: tc.id, score: 0, maxScore: 1, pct: "0%" });
    }
  }

  // Summary table
  console.log("\n\n══════════════════════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("══════════════════════════════════════════════════════════════════════\n");
  console.log("ID                          | Score    | Grade");
  console.log("────────────────────────────|──────────|──────");
  let totalScore = 0, totalMax = 0;
  for (const r of results) {
    const grade = parseInt(r.pct) >= 90 ? "🟢 A" : parseInt(r.pct) >= 75 ? "🟡 B" : parseInt(r.pct) >= 50 ? "🟠 C" : "🔴 D";
    console.log(`${r.id.padEnd(28)}| ${`${r.score}/${r.maxScore}`.padEnd(9)}| ${grade} (${r.pct})`);
    totalScore += r.score;
    totalMax += r.maxScore;
  }
  console.log("────────────────────────────|──────────|──────");
  console.log(`${"TOTAL".padEnd(28)}| ${`${totalScore}/${totalMax}`.padEnd(9)}| ${Math.round(totalScore/totalMax*100)}%\n`);
}

main().catch(console.error);
