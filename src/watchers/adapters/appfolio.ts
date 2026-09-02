import type { SiteAdapter, RawListing } from "../types.ts"

// Scrapes AppFolio-hosted listing pages -- the shared markup template AppFolio
// serves to every property manager on the platform (verified against a live
// AppFolio-hosted site: utpmt.appfolio.com/listings/listings, September
// 2026). Because it's the same SaaS template account to account, this one
// adapter works across many different AppFolio customers' own listing
// pages, not just one -- exactly the "watch the landlord's own site"
// approach this project is built around, not an aggregator.
//
// Extraction runs as a single page.evaluate() rather than per-card locator
// calls: a 30+ listing page needing ~6 round-trips per card (180+ CDP calls)
// reliably crashed headless Chromium in a resource-constrained sandbox
// during testing. One in-page JS pass is both faster and far more robust.
//
// Deliberately does NOT resolve distanceMinutes -- that needs a geocoding/
// directions API this project doesn't wire up. The scorer treats a null
// distance as "don't filter on it" rather than guessing, so real listings
// still get scored on price/beds/amenities/pets, just not commute radius.
interface ExtractedCard {
  id: string | null
  priceText: string | null
  bedBathText: string | null
  addressText: string | null
  descriptionText: string | null
  petPolicyText: string | null
  applyHref: string | null
}

export const appfolioAdapter: SiteAdapter = {
  name: "appfolio",

  async listNewListings({ solari, targetUrl }): Promise<RawListing[]> {
    const session = await solari.launch({ stealth: true })
    try {
      const page = await session.newPage()
      // Real listing pages lazy-load dozens of large photos; we only need
      // text/attributes, and loading all that imagery adds crash risk for
      // no benefit here.
      await page.route("**/*.{png,jpg,jpeg,gif,webp,svg}", (route) => route.abort())
      await page.goto(targetUrl, { waitUntil: "domcontentloaded" })

      // No locally-named helper functions in here: tsx/esbuild's transpile
      // step injects `__name(fn, "fn")` calls to preserve named-function
      // metadata, and since Playwright ships this callback to the browser
      // as a bare source string, those calls reference a helper that only
      // exists in the Node-side bundle -- "ReferenceError: __name is not
      // defined". Fully inlined, anonymous logic avoids the injection.
      const cards = await page.evaluate((): ExtractedCard[] =>
        Array.from(document.querySelectorAll(".js-listing-item")).map((el) => ({
          id: el.id ? el.id.replace("listing_", "") : null,
          priceText: el.querySelector(".js-listing-blurb-rent")?.textContent?.trim() || null,
          bedBathText: el.querySelector(".js-listing-blurb-bed-bath")?.textContent?.trim() || null,
          addressText: el.querySelector(".js-listing-address")?.textContent?.trim() || null,
          descriptionText: el.querySelector(".js-listing-description")?.textContent?.trim() || null,
          petPolicyText: el.querySelector(".js-listing-pet-policy")?.textContent?.trim() || null,
          applyHref: el.querySelector(".js-listing-apply")?.getAttribute("href") || null,
        })),
      )

      const origin = new URL(targetUrl).origin
      return cards
        .filter((c): c is ExtractedCard & { id: string } => c.id != null)
        .map((c) => {
          const bedsMatch = c.bedBathText ? /(\d+)\s*bd/i.exec(c.bedBathText) : null
          const bathsMatch = c.bedBathText ? /([\d.]+)\s*ba/i.exec(c.bedBathText) : null
          return {
            externalId: `appfolio:${origin}:${c.id}`,
            sourceAdapter: "appfolio",
            sourceUrl: targetUrl,
            priceText: c.priceText ?? undefined,
            beds: bedsMatch?.[1] ? Number(bedsMatch[1]) : undefined,
            baths: bathsMatch?.[1] ? Number(bathsMatch[1]) : undefined,
            amenities: c.descriptionText && /parking/i.test(c.descriptionText) ? ["parking"] : [],
            petsAllowed: c.petPolicyText ? /cat|dog/i.test(c.petPolicyText) : undefined,
            applyUrl: c.applyHref ? new URL(c.applyHref, origin).toString() : undefined,
            addressText: c.addressText ?? undefined,
          }
        })
    } finally {
      await session.close()
    }
  },
}
