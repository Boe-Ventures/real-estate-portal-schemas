#!/usr/bin/env npx tsx
/**
 * Eval: Compare 3 approaches for AI-powered URL generation
 *
 * Approach A (Raw):     Give AI the raw Zod schema with .describe() hints
 * Approach B (Taxonomy): Give AI the normalized taxonomy, then resolve via adapter
 * Approach C (Two-pass): Pass 1 picks relevant keys, Pass 2 generates values
 *
 * Required env vars:
 *   OPENAI_API_KEY — OpenAI API key for gpt-4o
 *
 * Usage:
 *   npx tsx eval/compare-approaches.ts
 */

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { finnNoParamsSchema, finnNoConfig } from "../src/finn-no.ts";
import {
  NormalizedSearchParamsSchema,
  type NormalizedSearchParams,
} from "../src/taxonomy.ts";
import { build as buildFinnNo } from "../src/adapters/finn-no.ts";

// ============================================================================
// CONFIG
// ============================================================================

const MODEL = openai("gpt-4o");

const TEST_QUERIES = [
  {
    id: 1,
    query:
      "2 bedroom apartment in Oslo, max 15000 NOK/month, needs balcony and elevator, pets allowed",
    intent: "rent" as const,
    expected: {
      location: "0.20061",
      price_to: 15000,
      min_bedrooms: 2,
      property_type: ["3"],
      facilities: ["1", "4"],
      animals_allowed: "1",
    },
  },
  {
    id: 2,
    query:
      "House in Bergen for sale, 3+ bedrooms, garage, under 5 million",
    intent: "buy" as const,
    expected: {
      location: "1.22046.20220",
      price_to: 5000000,
      min_bedrooms: 3,
      property_type: ["1"],
      facilities: ["23"],
    },
  },
  {
    id: 3,
    query: "Cheap studio in Trondheim, furnished, near city center",
    intent: "rent" as const,
    expected: {
      location: "1.20016.20318",
      property_type: ["3"], // studio → apartment on Finn
      furnished: ["9"],
      sort: "RENT_ASC",
    },
  },
  {
    id: 4,
    query:
      "Family apartment in Grünerløkka, 4 bedrooms, fireplace, ground floor",
    intent: "buy" as const,
    expected: {
      location: "1.20061.20511",
      min_bedrooms: 4,
      property_type: ["3"],
      facilities: ["2"],
      floor_navigator: "1",
    },
  },
  {
    id: 5,
    query:
      "Modern apartment in Stavanger, elevator, balcony, dishwasher, max 12000/month",
    intent: "rent" as const,
    expected: {
      location: "1.20012.20196",
      price_to: 12000,
      property_type: ["3"],
      facilities: ["1", "4"],
      // dishwasher has no Finn.no code — should be noted as unmappable
    },
  },
];

// ============================================================================
// APPROACH A: Raw Schema
// ============================================================================

async function approachA(
  query: string,
  intent: string,
): Promise<{ params: Record<string, unknown>; url: string; usage: { input: number; output: number } }> {
  const systemPrompt = `You are a URL parameter generator for Finn.no, a Norwegian real estate portal.
Given a natural language search query, generate the correct query parameters.

Intent: ${intent} (${intent === "buy" ? "homes/search.html" : "lettings/search.html"})

Known locations:
${JSON.stringify(finnNoConfig.knownLocations, null, 2)}

Generate parameters that match the Finn.no schema. Use the exact codes from the schema descriptions.`;

  const result = await generateObject({
    model: MODEL,
    schema: finnNoParamsSchema,
    system: systemPrompt,
    prompt: query,
  });

  const params = result.object;
  const baseUrl = finnNoConfig.baseUrls[intent as "buy" | "rent"]!;
  const url = finnNoConfig.serialize(baseUrl, params);

  return {
    params: params as Record<string, unknown>,
    url,
    usage: {
      input: result.usage.promptTokens,
      output: result.usage.completionTokens,
    },
  };
}

// ============================================================================
// APPROACH B: Taxonomy → Adapter
// ============================================================================

async function approachB(
  query: string,
  intent: string,
): Promise<{ params: Record<string, unknown>; url: string; usage: { input: number; output: number } }> {
  const systemPrompt = `You are a search parameter extractor for a real estate portal.
Given a natural language search query, extract structured search parameters using human-readable values.

The adapter will handle translating these to portal-specific codes. Use location names (not codes), amenity names (not numbers), and property type names.

Intent: ${intent}`;

  const result = await generateObject({
    model: MODEL,
    schema: NormalizedSearchParamsSchema,
    system: systemPrompt,
    prompt: query,
  });

  const normalized = result.object as NormalizedSearchParams;
  const url = buildFinnNo(intent as "buy" | "rent", normalized);

  return {
    params: normalized as unknown as Record<string, unknown>,
    url,
    usage: {
      input: result.usage.promptTokens,
      output: result.usage.completionTokens,
    },
  };
}

// ============================================================================
// APPROACH C: Two-pass
// ============================================================================

// Pass 1: Pick relevant keys
const relevantKeysSchema = z.object({
  relevantFields: z
    .array(
      z.enum([
        "location",
        "minPrice",
        "maxPrice",
        "minArea",
        "maxArea",
        "bedrooms",
        "bathrooms",
        "propertyType",
        "amenities",
        "pets",
        "furnished",
        "ownershipType",
        "energyRating",
        "floor",
        "constructionYearMin",
        "constructionYearMax",
        "newConstruction",
        "sort",
      ]),
    )
    .describe("Which fields from the normalized schema are relevant to this query."),
});

async function approachC(
  query: string,
  intent: string,
): Promise<{ params: Record<string, unknown>; url: string; usage: { input: number; output: number } }> {
  // Pass 1: Identify relevant fields
  const pass1 = await generateObject({
    model: MODEL,
    schema: relevantKeysSchema,
    system:
      "Given a real estate search query, identify which search parameter fields are relevant. Only pick fields that the query explicitly or implicitly mentions.",
    prompt: query,
  });

  const relevantFields = pass1.object.relevantFields;

  // Build a narrowed schema with only relevant fields
  const fullShape = NormalizedSearchParamsSchema.shape;
  const narrowedShape: Record<string, z.ZodTypeAny> = {};
  for (const field of relevantFields) {
    if (field in fullShape) {
      narrowedShape[field] = fullShape[field as keyof typeof fullShape];
    }
  }
  const narrowedSchema = z.object(narrowedShape);

  // Pass 2: Generate values for those fields
  const pass2 = await generateObject({
    model: MODEL,
    schema: narrowedSchema,
    system: `You are a search parameter extractor for a real estate portal.
Given a natural language search query, fill in the relevant fields with appropriate values.
Use human-readable values (location names, amenity names, property type names).
Intent: ${intent}`,
    prompt: query,
  });

  const normalized = pass2.object as NormalizedSearchParams;
  const url = buildFinnNo(intent as "buy" | "rent", normalized);

  return {
    params: normalized as unknown as Record<string, unknown>,
    url,
    usage: {
      input: pass1.usage.promptTokens + pass2.usage.promptTokens,
      output: pass1.usage.completionTokens + pass2.usage.completionTokens,
    },
  };
}

// ============================================================================
// EVALUATION
// ============================================================================

interface EvalResult {
  queryId: number;
  approach: string;
  url: string;
  params: Record<string, unknown>;
  usage: { input: number; output: number };
  correct: string[];
  missed: string[];
  hallucinated: string[];
  score: number;
}

function evaluateResult(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  url: string,
): { correct: string[]; missed: string[]; hallucinated: string[] } {
  const correct: string[] = [];
  const missed: string[] = [];
  const hallucinated: string[] = [];

  // Check expected params appear in URL or params
  for (const [key, expectedVal] of Object.entries(expected)) {
    const urlStr = url;
    let found = false;

    if (Array.isArray(expectedVal)) {
      // Check each value appears in URL
      const allPresent = expectedVal.every((v) => urlStr.includes(`${key}=${v}`) || urlStr.includes(encodeURIComponent(String(v))));
      found = allPresent;
    } else if (typeof expectedVal === "string" || typeof expectedVal === "number") {
      found = urlStr.includes(String(expectedVal));
    }

    if (found) {
      correct.push(key);
    } else {
      missed.push(key);
    }
  }

  // Check for hallucinated params (in actual but nonsensical)
  // This is a rough heuristic — we flag params that aren't in expected
  // and have suspicious values
  for (const [key, val] of Object.entries(actual)) {
    if (val == null || val === undefined) continue;
    if (key in expected) continue;
    // Don't flag common structural keys
    if (["sort", "page", "filters"].includes(key)) continue;
    hallucinated.push(key);
  }

  return { correct, missed, hallucinated };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY is required. Set it in your environment.");
    console.error("   export OPENAI_API_KEY=sk-...");
    process.exit(1);
  }

  console.log("🏠 Real Estate Portal Schema — Approach Comparison Eval");
  console.log("=" .repeat(70));
  console.log(`Model: gpt-4o | Portal: Finn.no | Queries: ${TEST_QUERIES.length}`);
  console.log();

  const results: EvalResult[] = [];

  for (const testCase of TEST_QUERIES) {
    console.log(`\n📋 Query ${testCase.id}: "${testCase.query}"`);
    console.log(`   Intent: ${testCase.intent}`);
    console.log("-".repeat(70));

    const approaches = [
      { name: "A (Raw)", fn: approachA },
      { name: "B (Taxonomy)", fn: approachB },
      { name: "C (Two-pass)", fn: approachC },
    ];

    for (const approach of approaches) {
      try {
        const result = await approach.fn(testCase.query, testCase.intent);
        const evaluation = evaluateResult(testCase.expected, result.params, result.url);
        const totalExpected = Object.keys(testCase.expected).length;
        const score = totalExpected > 0 ? evaluation.correct.length / totalExpected : 0;

        const evalResult: EvalResult = {
          queryId: testCase.id,
          approach: approach.name,
          url: result.url,
          params: result.params,
          usage: result.usage,
          ...evaluation,
          score,
        };
        results.push(evalResult);

        console.log(`\n  ${approach.name}:`);
        console.log(`    ✅ Correct: ${evaluation.correct.join(", ") || "(none)"}`);
        console.log(`    ❌ Missed:  ${evaluation.missed.join(", ") || "(none)"}`);
        console.log(`    ⚠️  Halluc:  ${evaluation.hallucinated.join(", ") || "(none)"}`);
        console.log(`    📊 Score:   ${(score * 100).toFixed(0)}% | Tokens: ${result.usage.input}in + ${result.usage.output}out = ${result.usage.input + result.usage.output} total`);
        console.log(`    🔗 ${result.url.substring(0, 120)}${result.url.length > 120 ? "..." : ""}`);
      } catch (err) {
        console.log(`\n  ${approach.name}: ❌ ERROR — ${err instanceof Error ? err.message : err}`);
        results.push({
          queryId: testCase.id,
          approach: approach.name,
          url: "",
          params: {},
          usage: { input: 0, output: 0 },
          correct: [],
          missed: Object.keys(testCase.expected),
          hallucinated: [],
          score: 0,
        });
      }
    }
  }

  // ========================================================================
  // SUMMARY TABLE
  // ========================================================================

  console.log("\n\n" + "=".repeat(70));
  console.log("📊 SUMMARY");
  console.log("=".repeat(70));

  // Per-approach aggregates
  const approaches = ["A (Raw)", "B (Taxonomy)", "C (Two-pass)"];
  for (const approach of approaches) {
    const approachResults = results.filter((r) => r.approach === approach);
    const avgScore =
      approachResults.reduce((sum, r) => sum + r.score, 0) / approachResults.length;
    const totalTokens = approachResults.reduce(
      (sum, r) => sum + r.usage.input + r.usage.output,
      0,
    );
    const totalCorrect = approachResults.reduce(
      (sum, r) => sum + r.correct.length,
      0,
    );
    const totalMissed = approachResults.reduce(
      (sum, r) => sum + r.missed.length,
      0,
    );
    const totalHallucinated = approachResults.reduce(
      (sum, r) => sum + r.hallucinated.length,
      0,
    );

    console.log(`\n  ${approach}:`);
    console.log(`    Avg Score:      ${(avgScore * 100).toFixed(1)}%`);
    console.log(`    Total Tokens:   ${totalTokens}`);
    console.log(`    Correct/Missed: ${totalCorrect}/${totalMissed}`);
    console.log(`    Hallucinated:   ${totalHallucinated}`);
  }

  // Per-query breakdown table
  console.log("\n\n  Per-Query Scores:");
  console.log("  " + "-".repeat(66));
  console.log(
    "  " +
      "Query".padEnd(8) +
      "A (Raw)".padEnd(12) +
      "B (Taxonomy)".padEnd(16) +
      "C (Two-pass)".padEnd(16) +
      "Best",
  );
  console.log("  " + "-".repeat(66));

  for (const testCase of TEST_QUERIES) {
    const queryResults = results.filter((r) => r.queryId === testCase.id);
    const scores = queryResults.map((r) => `${(r.score * 100).toFixed(0)}%`);
    const bestIdx = queryResults.reduce(
      (best, r, i) => (r.score > queryResults[best]!.score ? i : best),
      0,
    );
    console.log(
      "  " +
        `Q${testCase.id}`.padEnd(8) +
        (scores[0] ?? "—").padEnd(12) +
        (scores[1] ?? "—").padEnd(16) +
        (scores[2] ?? "—").padEnd(16) +
        queryResults[bestIdx]!.approach,
    );
  }
  console.log("  " + "-".repeat(66));

  // Token efficiency
  console.log("\n\n  Token Usage:");
  console.log("  " + "-".repeat(50));
  for (const approach of approaches) {
    const approachResults = results.filter((r) => r.approach === approach);
    const avgInput =
      approachResults.reduce((s, r) => s + r.usage.input, 0) /
      approachResults.length;
    const avgOutput =
      approachResults.reduce((s, r) => s + r.usage.output, 0) /
      approachResults.length;
    console.log(
      `  ${approach.padEnd(16)} avg ${Math.round(avgInput)}in + ${Math.round(avgOutput)}out = ${Math.round(avgInput + avgOutput)} total`,
    );
  }
  console.log("  " + "-".repeat(50));
}

main().catch(console.error);
