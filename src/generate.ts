/**
 * AI-powered URL generation for real estate portals.
 *
 * One function, one path: story → generateText with Output.object → serialize → URL.
 *
 * @example
 * ```typescript
 * import { generateUrl } from "@use_homi/real-estate-portal-schemas/generate";
 *
 * const result = await generateUrl({
 *   portal: "finn.no",
 *   intention: "rent",
 *   story: "Young couple in Oslo with a dog. 2BR, balcony, elevator. 15k NOK/month.",
 * });
 * // → { ok: true, url: "https://...", params: {...} }
 * ```
 */

import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

import type { ProviderUrlConfig } from "./index.js";
import { finnNoConfig } from "./finn-no.js";
import { zillowConfig } from "./zillow-com.js";
import { streetEasyConfig } from "./streeteasy-com.js";
import { hybelNoConfig } from "./hybel-no.js";
import { airbnbConfig } from "./airbnb-com.js";
import { rightmoveConfig } from "./rightmove-co-uk.js";
import { property24Config } from "./property24-com.js";
import { craigslistConfig } from "./craigslist-org.js";
import { domainAuConfig } from "./domain-com-au.js";

// ---------------------------------------------------------------------------
// Config registry — maps user-friendly names to ProviderUrlConfig
// ---------------------------------------------------------------------------

const PROVIDER_CONFIGS: Record<string, ProviderUrlConfig> = {
  // Canonical IDs
  "finn.no": finnNoConfig,
  "zillow.com": zillowConfig,
  "streeteasy.com": streetEasyConfig,
  "hybel.no": hybelNoConfig,
  "airbnb.com": airbnbConfig,
  "rightmove.co.uk": rightmoveConfig,
  "property24.com": property24Config,
  "craigslist.org": craigslistConfig,
  "domain.com.au": domainAuConfig,
  // Short aliases
  finn: finnNoConfig,
  zillow: zillowConfig,
  streeteasy: streetEasyConfig,
  hybel: hybelNoConfig,
  airbnb: airbnbConfig,
  rightmove: rightmoveConfig,
  property24: property24Config,
  craigslist: craigslistConfig,
  domain: domainAuConfig,
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Structured context fields for the search. All optional — the story is king. */
export interface SearchContext {
  /** Portal identifier (e.g. "finn.no", "zillow", "streeteasy") */
  portal: string;
  /** Search intention */
  intention: "buy" | "rent" | "rent_short";
  /** Free-text story describing what the person is looking for */
  story?: string;
  /** City or neighborhood */
  city?: string;
  /** Monthly budget or max price (number) */
  budget?: number;
  /** Currency code (e.g. "NOK", "USD") */
  currency?: string;
  /** Number of bedrooms */
  bedrooms?: number;
  /** Desired amenities */
  amenities?: string[];
  /** Property type (e.g. "apartment", "house") */
  propertyType?: string;
  /** Whether pets are required */
  pets?: boolean;
  /** Whether furnished is required */
  furnished?: boolean;
  /** Minimum area in m² */
  minArea?: number;
  /** Maximum area in m² */
  maxArea?: number;
  /** Any AI SDK model — defaults to Sonnet */
  model?: Parameters<typeof generateText>[0]["model"];
}

export type GenerateUrlSuccess = {
  ok: true;
  url: string;
  params: Record<string, unknown>;
  provider: string;
};

export type GenerateUrlError = {
  ok: false;
  error: string;
  provider: string;
};

export type GenerateUrlResult = GenerateUrlSuccess | GenerateUrlError;

// ---------------------------------------------------------------------------
// Build the prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(
  config: ProviderUrlConfig,
  intention: "buy" | "rent" | "rent_short",
): string {
  const baseUrl = config.baseUrls[intention];
  const locations = config.knownLocations
    ? Object.entries(config.knownLocations)
        .map(([name, code]) => `  ${name}: ${code}`)
        .join("\n")
    : "(none)";

  return `You are a real estate search URL parameter generator for ${config.name} (${config.id}).

TASK: Given a user's housing search description, generate the correct query parameters for ${config.name}.

BASE URL: ${baseUrl ?? "N/A"}
INTENTION: ${intention}

KNOWN LOCATIONS:
${locations}

RULES:
- Only set parameters that are clearly implied by the user's description.
- Use the knownLocations lookup for location codes. Pick the most specific match.
- For price fields, match the portal's currency and semantics (asking price vs monthly rent).
- For amenities/facilities, only include what the user explicitly mentions or strongly implies.
- When the user mentions a budget, set the appropriate max price field (not min).
- Omit parameters the user didn't mention — don't guess or add defaults.
- For ${intention === "rent" ? "rental" : "purchase"} searches, use the correct endpoint-specific params.`;
}

function buildUserPrompt(ctx: SearchContext): string {
  const parts: string[] = [];

  if (ctx.story) {
    parts.push(`Story: ${ctx.story}`);
  }
  if (ctx.city) {
    parts.push(`City: ${ctx.city}`);
  }
  if (ctx.budget != null) {
    parts.push(
      `Budget: ${ctx.budget}${ctx.currency ? ` ${ctx.currency}` : ""}/month`,
    );
  }
  if (ctx.bedrooms != null) {
    parts.push(`Bedrooms: ${ctx.bedrooms}`);
  }
  if (ctx.amenities?.length) {
    parts.push(`Amenities: ${ctx.amenities.join(", ")}`);
  }
  if (ctx.propertyType) {
    parts.push(`Property type: ${ctx.propertyType}`);
  }
  if (ctx.pets) {
    parts.push("Must allow pets");
  }
  if (ctx.furnished) {
    parts.push("Must be furnished");
  }
  if (ctx.minArea != null) {
    parts.push(`Min area: ${ctx.minArea} m²`);
  }
  if (ctx.maxArea != null) {
    parts.push(`Max area: ${ctx.maxArea} m²`);
  }

  return (
    parts.join("\n") ||
    "Generate a general search with no specific filters."
  );
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Generate a real estate search URL from a natural language description.
 *
 * Uses AI (Anthropic Sonnet by default) to map the story + context into
 * portal-specific query parameters, then serializes them into a full URL.
 */
export async function generateUrl(ctx: SearchContext): Promise<GenerateUrlResult> {
  const portalKey = ctx.portal.toLowerCase();
  const config = PROVIDER_CONFIGS[portalKey];

  if (!config) {
    return {
      ok: false,
      error: `Unknown portal "${ctx.portal}". Available: ${Object.keys(PROVIDER_CONFIGS).filter((k) => k.includes(".")).join(", ")}`,
      provider: ctx.portal,
    };
  }

  const baseUrl = config.baseUrls[ctx.intention];
  if (!baseUrl) {
    return {
      ok: false,
      error: `Portal "${config.name}" does not support intention "${ctx.intention}". Available: ${Object.keys(config.baseUrls).join(", ")}`,
      provider: config.id,
    };
  }

  const model = ctx.model ?? anthropic("claude-sonnet-4-20250514");

  try {
    const { output } = await generateText({
      model,
      output: Output.object({ schema: config.params }),
      system: buildSystemPrompt(config, ctx.intention),
      prompt: buildUserPrompt(ctx),
    });

    if (!output) {
      return {
        ok: false,
        error: "Model returned no structured output",
        provider: config.id,
      };
    }

    const params = output as Record<string, unknown>;
    const url = config.serialize(baseUrl, params);

    return {
      ok: true,
      url,
      params,
      provider: config.id,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      provider: config.id,
    };
  }
}
