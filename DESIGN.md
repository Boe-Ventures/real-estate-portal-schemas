# Design Notes

## Taxonomy Direction: Airbnb-Compatible + Homi Extensions

### Problem
The current API exposes raw portal-specific codes (`facilities: ["1", "4"]` for Finn.no). Users need to know each portal's internal codes. The real value is the verified mappings, not the serializer.

### Direction
Introduce a normalized input layer where users can write human-readable queries that resolve to portal-specific codes.

**Use Airbnb's amenity taxonomy as the foundation.** It's the most comprehensive in real estate (591 codes), globally recognized, and already covers most rental amenities. Rather than inventing a new vocabulary, lean on what exists.

**Extend with Homi-specific dimensions for sales and European markets** — things Airbnb doesn't model:
- Property types (detached, semi-detached, terraced, borettslag vs selveier)
- Energy ratings (common in Norway, UK, EU)
- Building age / year ranges
- Garage/parking specifics
- Floor level, plot size
- Ownership structures

The Venn diagram: ~80% of rental amenities overlap with Airbnb. Sales and European long-term rentals add 20-30% more concepts.

### Target API

```typescript
import { search } from "@use_homi/real-estate-portal-schemas";

const url = search("finn.no", "rent", {
  location: "Oslo",
  maxPrice: 15000,
  bedrooms: { min: 2 },
  amenities: ["balcony", "elevator"],
  pets: true,
});
// → resolves names to codes, serializes to full URL
```

### Layers

1. **Normalized taxonomy** — Airbnb-compatible amenity IDs + Homi extensions for sales/EU. The Rosetta Stone.
2. **Portal adapters** — per-portal maps from normalized concepts → portal-specific codes. Reverse lookups (portal code → normalized concept) for URL parsing.
3. **URL builder** — one portal per call. Resolve normalized input → portal codes → serialize to URL. Caller loops for multi-portal. Keep it composable, no magic.
4. **Raw access** — current API stays for power users and AI structured output (where the model generates portal-native codes directly from `.describe()` hints).

### What NOT to do
- No multi-portal in a single call — caller composes.
- `serialize()` stays as internal plumbing, not the headline API.
- Don't invent codes where Airbnb already has them.

### URL Parsing (future)
Reverse direction: paste a Zillow/Finn/StreetEasy URL → get back structured params. Useful for browser extensions, sharing, "search like this on another portal."

### Coverage Matrix (future)
Which normalized amenities does each portal actually support? Helps users know what translates and what gets silently dropped. Validation with warnings > silent omission.
