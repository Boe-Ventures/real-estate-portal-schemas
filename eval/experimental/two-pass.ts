/**
 * Two-Pass URL Generator
 *
 * Pass 1: AI sees ALL param descriptions for a portal schema and picks
 *         which keys (max ~15) are relevant to the user's story.
 * Pass 2: We build a dynamic Zod schema with ONLY those keys.
 *         AI fills values. Always fits under Anthropic's 24-param limit.
 *
 * Advantage over slim/taxonomy: AI has access to the FULL portal vocabulary
 * including niche filters (floor_navigator, energy_label, construction_year, etc.)
 * that a fixed universal schema can't cover.
 */

import { generateObject, generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z, type ZodTypeAny } from "zod";

import { finnNoConfig, finnNoParamsSchema } from "../src/finn-no.js";
import { zillowConfig, zillowParamsSchema, zillowFilterStateSchema } from "../src/zillow-com.js";
import { streetEasyConfig, streetEasyParamsSchema } from "../src/streeteasy-com.js";
import { airbnbConfig, airbnbParamsSchema } from "../src/airbnb-com.js";
import { hybelNoConfig, hybelNoParamsSchema } from "../src/hybel-no.js";

import type { ProviderUrlConfig } from "../src/index.js";

// ============================================================================
// PROVIDER REGISTRY
// ============================================================================

interface ProviderEntry {
  config: ProviderUrlConfig;
  schema: ZodTypeAny;
  /** Human-readable param descriptions for Pass 1 key selection */
  paramDescriptions: Record<string, string>;
}

function getShape(schema: ZodTypeAny): Record<string, ZodTypeAny> {
  const def = (schema as any)?._def;
  // Zod 3: shape is a function; Zod 4+: shape is a plain object
  if (typeof def?.shape === 'function') return def.shape();
  if (typeof def?.shape === 'object' && def.shape !== null) return def.shape;
  // Try innerType (wrapped schemas)
  const inner = def?.innerType?._def;
  if (typeof inner?.shape === 'function') return inner.shape();
  if (typeof inner?.shape === 'object' && inner.shape !== null) return inner.shape;
  return {};
}

function extractParamDescriptions(schema: ZodTypeAny): Record<string, string> {
  const descriptions: Record<string, string> = {};
  const shape = getShape(schema);
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const fDef = (fieldSchema as any)?._def;
    const desc = fDef?.description
      ?? fDef?.innerType?._def?.description
      ?? (fieldSchema as any)?.description
      ?? "(no description)";
    descriptions[key] = desc;
  }
  return descriptions;
}

function buildDynamicSchema(fullSchema: ZodTypeAny, selectedKeys: string[]): ZodTypeAny {
  const shape = getShape(fullSchema);
  const newShape: Record<string, ZodTypeAny> = {};
  for (const key of selectedKeys) {
    if (shape[key]) {
      newShape[key] = shape[key] as ZodTypeAny;
    }
  }
  return z.object(newShape);
}

const PROVIDERS: Record<string, ProviderEntry> = {
  "finn.no": {
    config: finnNoConfig,
    schema: finnNoParamsSchema,
    paramDescriptions: extractParamDescriptions(finnNoParamsSchema),
  },
  "zillow": {
    config: zillowConfig,
    schema: zillowParamsSchema,
    paramDescriptions: extractParamDescriptions(zillowParamsSchema),
  },
  "streeteasy": {
    config: streetEasyConfig,
    schema: streetEasyParamsSchema,
    paramDescriptions: extractParamDescriptions(streetEasyParamsSchema),
  },
  "airbnb": {
    config: airbnbConfig,
    schema: airbnbParamsSchema,
    paramDescriptions: extractParamDescriptions(airbnbParamsSchema),
  },
  "hybel.no": {
    config: hybelNoConfig,
    schema: hybelNoParamsSchema,
    paramDescriptions: extractParamDescriptions(hybelNoParamsSchema),
  },
};

// ============================================================================
// TWO-PASS GENERATOR
// ============================================================================

const MODEL = anthropic("claude-sonnet-4-20250514");

export interface TwoPassResult {
  url: string;
  params: unknown;
  selectedKeys: string[];
  pass1Ms: number;
  pass2Ms: number;
  totalMs: number;
  pass1Tokens: number;
  pass2Tokens: number;
  totalTokens: number;
}

export async function generateUrlTwoPass(opts: {
  providerId: string;
  intention: "buy" | "rent" | "rent_short";
  story: string;
  context?: string;
  maxKeys?: number;
}): Promise<TwoPassResult> {
  const provider = PROVIDERS[opts.providerId];
  if (!provider) throw new Error(`Unknown provider: ${opts.providerId}`);

  const baseUrl = provider.config.baseUrls[opts.intention === "rent_short" ? "rent_short" : opts.intention];
  if (!baseUrl) throw new Error(`${opts.providerId} doesn't support ${opts.intention}`);

  const maxKeys = opts.maxKeys ?? 15;

  // ── PASS 1: Select relevant keys ──
  const paramList = Object.entries(provider.paramDescriptions)
    .map(([key, desc]) => `  - ${key}: ${desc}`)
    .join("\n");

  const pass1Start = Date.now();
  const { object: keySelection, usage: usage1 } = await generateObject({
    model: MODEL,
    schema: z.object({
      selectedKeys: z.array(z.string())
        .describe(`Pick the ${maxKeys} most relevant parameter keys for this search. Only include keys that matter for this specific query.`),
      reasoning: z.string()
        .describe("Brief explanation of why these keys were selected"),
    }),
    system: [
      `You are selecting search parameters for ${provider.config.name}.`,
      `Given a user's property search description, pick the most relevant parameter keys from the available options.`,
      `Select at most ${maxKeys} keys — only those that are directly relevant to what the user described.`,
      `Always include location parameters if the user mentions a place.`,
      `Always include price parameters if the user mentions a budget.`,
      "",
      `Available parameters for ${provider.config.name}:`,
      paramList,
    ].join("\n"),
    prompt: [
      `Intention: ${opts.intention}`,
      opts.context ? `Context: ${opts.context}` : "",
      `User story: ${opts.story}`,
    ].filter(Boolean).join("\n"),
  });
  const pass1Ms = Date.now() - pass1Start;

  // Filter to only valid keys
  const validKeys = keySelection.selectedKeys.filter(k => k in provider.paramDescriptions);

  // ── PASS 2: Generate values with dynamic slim schema ──
  const dynamicSchema = buildDynamicSchema(provider.schema, validKeys);

  const pass2Start = Date.now();
  const { object: params, usage: usage2 } = await generateObject({
    model: MODEL,
    schema: dynamicSchema,
    system: [
      `You are generating ${provider.config.name} search parameters.`,
      `Base URL: ${baseUrl}`,
      "",
      provider.config.knownLocations
        ? `Known location codes:\n${Object.entries(provider.config.knownLocations)
            .map(([name, code]) => `  ${name}: ${code}`)
            .join("\n")}`
        : "",
      "",
      "Fill in the parameter values based on the user's description.",
      "Use .describe() hints on each field for valid values.",
      "For budget: use the exact number mentioned. 'Budget X' = max price. 'X-Y range' = both min and max.",
      "For amenities/facilities: map to the closest available codes.",
    ].filter(Boolean).join("\n"),
    prompt: [
      `Intention: ${opts.intention}`,
      opts.context ? `Context: ${opts.context}` : "",
      `User story: ${opts.story}`,
    ].filter(Boolean).join("\n"),
  });
  const pass2Ms = Date.now() - pass2Start;

  const url = provider.config.serialize(baseUrl, params as Record<string, unknown>);

  return {
    url,
    params,
    selectedKeys: validKeys,
    pass1Ms,
    pass2Ms,
    totalMs: pass1Ms + pass2Ms,
    pass1Tokens: usage1?.totalTokens ?? 0,
    pass2Tokens: usage2?.totalTokens ?? 0,
    totalTokens: (usage1?.totalTokens ?? 0) + (usage2?.totalTokens ?? 0),
  };
}
