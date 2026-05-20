// ============================================================================
// JSON-LD STRUCTURED DATA EXTRACTION
// ============================================================================
//
// Many property listing portals embed schema.org JSON-LD in their HTML.
// This module provides lightweight utilities to extract and query those blocks
// without heavy dependencies (regex + JSON.parse only).
// ============================================================================

/** A parsed JSON-LD block (the raw object from the <script> tag). */
export type JsonLdBlock = Record<string, unknown>;

/**
 * Extract all JSON-LD blocks from an HTML string.
 *
 * Finds every `<script type="application/ld+json">…</script>` tag and
 * parses the contents. Blocks that fail to parse are silently skipped.
 */
export function extractJsonLd(html: string): JsonLdBlock[] {
  const blocks: JsonLdBlock[] = [];
  const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") {
            blocks.push(item as JsonLdBlock);
          }
        }
      } else if (parsed && typeof parsed === "object") {
        blocks.push(parsed as JsonLdBlock);
      }
    } catch {
      // Malformed JSON — skip silently
    }
  }

  return blocks;
}

/**
 * Find the first JSON-LD block whose `@type` matches the given type string.
 *
 * Handles both `"@type": "Product"` and `"@type": ["Product", "Other"]`.
 * Returns `undefined` if no match is found.
 */
export function findJsonLdByType(
  blocks: JsonLdBlock[],
  type: string,
): JsonLdBlock | undefined {
  for (const block of blocks) {
    const blockType = block["@type"];
    if (typeof blockType === "string" && blockType === type) {
      return block;
    }
    if (Array.isArray(blockType) && blockType.includes(type)) {
      return block;
    }
  }
  return undefined;
}
