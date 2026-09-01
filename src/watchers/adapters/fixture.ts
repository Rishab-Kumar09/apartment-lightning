import type { SiteAdapter, RawListing } from "../types.ts"

// Scrapes the seed fixture site (src/seed/fixtureSite) via a real Playwright
// page. Reads data-* attributes rather than parsing prose text — the fixture
// controls its own markup, so this proves out the pipeline plumbing without
// also testing text-extraction robustness (that's what the real adapters in
// Phase 6 are for).
export const fixtureAdapter: SiteAdapter = {
  name: "fixture",

  async listNewListings({ solari, targetUrl }): Promise<RawListing[]> {
    const session = await solari.launch()
    try {
      const page = await session.newPage()
      await page.goto(targetUrl)

      const results: RawListing[] = []
      for (const card of await page.locator("[data-listing-id]").all()) {
        const id = await card.getAttribute("data-listing-id")
        if (!id) continue
        const amenitiesAttr = await card.getAttribute("data-amenities")
        results.push({
          externalId: `fixture:${id}`,
          sourceAdapter: "fixture",
          sourceUrl: targetUrl,
          price: Number(await card.getAttribute("data-price")),
          beds: Number(await card.getAttribute("data-beds")),
          baths: Number(await card.getAttribute("data-baths")),
          distanceMinutes: Number(await card.getAttribute("data-distance")),
          amenities: amenitiesAttr ? amenitiesAttr.split(",").filter(Boolean) : [],
          petsAllowed: (await card.getAttribute("data-pets")) === "true",
          applyUrl: (await card.getAttribute("data-apply-url")) ?? undefined,
          addressText: (await card.getAttribute("data-address")) ?? undefined,
        })
      }
      return results
    } finally {
      await session.close()
    }
  },
}
