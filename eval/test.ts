#!/usr/bin/env npx tsx
/**
 * eval/test.ts — Clean evaluation of the generateUrl API.
 *
 * Runs diverse stories through generateUrl and grades each result
 * against expected URL fragments.
 *
 * Usage: npx tsx eval/test.ts
 */

import "dotenv/config";
import { generateUrl } from "../src/generate.js";
import type { SearchContext } from "../src/generate.js";

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

interface TestCase {
  name: string;
  ctx: SearchContext;
  /** URL fragments that MUST appear in the generated URL */
  expectFragments: string[];
  /** URL fragments that MUST NOT appear */
  rejectFragments?: string[];
}

const TESTS: TestCase[] = [
  {
    name: "Oslo rent — young couple with dog",
    ctx: {
      portal: "finn.no",
      intention: "rent",
      story:
        "Young couple in Oslo with a dog. 2 bedrooms, balcony, elevator. Budget 15000 NOK/month.",
    },
    expectFragments: [
      "lettings/search.html",
      "location=", // should have Oslo location code
      "min_bedrooms=2",
      "price_to=15000",
      "animals_allowed=1",
      "facilities=1", // balcony
      "facilities=4", // elevator
    ],
  },
  {
    name: "Bergen buy — family home",
    ctx: {
      portal: "finn.no",
      intention: "buy",
      story:
        "Family of four looking for a house in Bergen. At least 3 bedrooms, garage, budget around 5 million NOK.",
    },
    expectFragments: [
      "homes/search.html",
      "location=", // Bergen code
      "min_bedrooms=3",
      "price_to=5000000",
      "facilities=23", // garage/parking
    ],
  },
  {
    name: "NYC rent — Manhattan software engineer",
    ctx: {
      portal: "zillow",
      intention: "rent",
      city: "New York",
      budget: 3500,
      currency: "USD",
      bedrooms: 1,
      story: "Software engineer in Manhattan, need in-unit laundry.",
    },
    expectFragments: [
      "zillow.com",
      "rentals",
      "searchQueryState",
      "manhattan",
    ],
  },
  {
    name: "SF rent — tech worker",
    ctx: {
      portal: "streeteasy",
      intention: "rent",
      story:
        "Looking for a 1BR in Manhattan under $4000/month. Must have laundry and doorman.",
    },
    expectFragments: [
      "streeteasy.com",
      "for-rent",
    ],
  },
  {
    name: "Trondheim student — cheap room",
    ctx: {
      portal: "finn.no",
      intention: "rent",
      story:
        "Student in Trondheim looking for a cheap room or hybel. Max 6000 NOK/month. Broadband needed.",
    },
    expectFragments: [
      "lettings/search.html",
      "location=", // Trondheim code
      "price_to=6000",
    ],
  },
  {
    name: "Nordstrand specific — Oslo sub-district",
    ctx: {
      portal: "finn.no",
      intention: "buy",
      story:
        "Looking for an apartment in Nordstrand, Oslo. 2+ bedrooms, elevator, budget 4-6 million NOK.",
    },
    expectFragments: [
      "homes/search.html",
      "20516", // Nordstrand location code
      "min_bedrooms=2",
      "property_type=3", // apartment
      "facilities=4", // elevator
    ],
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

interface TestResult {
  name: string;
  passed: boolean;
  url: string;
  matchedFragments: string[];
  missedFragments: string[];
  rejectedFound: string[];
  params: Record<string, unknown>;
  durationMs: number;
}

async function runTest(test: TestCase): Promise<TestResult> {
  const start = Date.now();
  const result = await generateUrl(test.ctx);
  const durationMs = Date.now() - start;

  if (!result.ok) {
    return {
      name: test.name,
      passed: false,
      url: `ERROR: ${result.error}`,
      matchedFragments: [],
      missedFragments: test.expectFragments,
      rejectedFound: [],
      params: {},
      durationMs,
    };
  }

  const url = result.url.toLowerCase();
  const matched: string[] = [];
  const missed: string[] = [];
  for (const frag of test.expectFragments) {
    if (url.includes(frag.toLowerCase())) {
      matched.push(frag);
    } else {
      missed.push(frag);
    }
  }

  const rejectedFound: string[] = [];
  for (const frag of test.rejectFragments ?? []) {
    if (url.includes(frag.toLowerCase())) {
      rejectedFound.push(frag);
    }
  }

  return {
    name: test.name,
    passed: missed.length === 0 && rejectedFound.length === 0,
    url: result.url,
    matchedFragments: matched,
    missedFragments: missed,
    rejectedFound,
    params: result.params,
    durationMs,
  };
}

async function main() {
  console.log("🏠 Real Estate Portal URL Generation — Evaluation\n");
  console.log(`Running ${TESTS.length} test cases...\n`);
  console.log("=".repeat(80));

  const results: TestResult[] = [];

  for (const test of TESTS) {
    console.log(`\n▸ ${test.name}`);
    console.log(`  Portal: ${test.ctx.portal} | Intention: ${test.ctx.intention}`);
    if (test.ctx.story) {
      console.log(`  Story: "${test.ctx.story}"`);
    }

    const result = await runTest(test);
    results.push(result);

    console.log(`  Params: ${JSON.stringify(result.params, null, 2).split("\n").join("\n  ")}`);
    console.log(`  URL: ${result.url}`);
    console.log(`  Time: ${result.durationMs}ms`);
    console.log(
      `  Grade: ${result.passed ? "✅ PASS" : "❌ FAIL"}` +
        ` (${result.matchedFragments.length}/${result.matchedFragments.length + result.missedFragments.length} fragments matched)`,
    );
    if (result.missedFragments.length > 0) {
      console.log(`  Missing: ${result.missedFragments.join(", ")}`);
    }
    if (result.rejectedFound.length > 0) {
      console.log(`  Rejected found: ${result.rejectedFound.join(", ")}`);
    }
  }

  // Summary table
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 Summary\n");
  console.log(
    "Name".padEnd(45) +
      "Result".padEnd(10) +
      "Frags".padEnd(10) +
      "Time",
  );
  console.log("-".repeat(80));

  let passCount = 0;
  for (const r of results) {
    if (r.passed) passCount++;
    console.log(
      r.name.padEnd(45) +
        (r.passed ? "✅ PASS" : "❌ FAIL").padEnd(10) +
        `${r.matchedFragments.length}/${r.matchedFragments.length + r.missedFragments.length}`.padEnd(10) +
        `${r.durationMs}ms`,
    );
  }

  console.log("-".repeat(80));
  console.log(
    `\nTotal: ${passCount}/${results.length} passed (${Math.round((passCount / results.length) * 100)}%)\n`,
  );

  process.exit(passCount === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
