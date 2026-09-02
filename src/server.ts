import express from "express"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "./config.ts"
import { feed } from "./notifications/feed.ts"
import { insertSearch } from "./db/repositories/searches.ts"
import { getApplicantProfile } from "./db/repositories/applicantProfile.ts"
import { getListing } from "./db/repositories/listings.ts"
import { getApplication, markSubmitted } from "./db/repositories/applications.ts"
import { runSubmitFlow } from "./application/submitFlow.ts"
import { getSolari } from "./solari/client.ts"
import { parseSearchQuery } from "./preferences/parser.ts"
import type { SearchCriteria } from "./preferences/types.ts"
import { triggerSeedListing, resetSeedFixture } from "./seed/seedTrigger.ts"
import { runPollCycle } from "./watchers/registry.ts"
import { getFixtureSource } from "./sources.ts"
import { clearActivity } from "./db/repositories/activity.ts"
import fs from "node:fs"

const here = path.dirname(fileURLToPath(import.meta.url))

// Used when no ANTHROPIC_API_KEY is configured, so the UI still works for
// local exploration without every env var set. The real parser (Claude) is
// used whenever the key is present.
function naiveFallbackParse(query: string): SearchCriteria {
  const bedsMatch = /(\d+)\s*-?\s*bed/i.exec(query)
  const priceMatch = /\$\s?([\d,]+)/.exec(query) // requires a $ so "1-bedroom" doesn't match as a price
  const radiusMatch = /(\d+)\s*min/i.exec(query)
  return {
    beds: bedsMatch?.[1] ? Number(bedsMatch[1]) : null,
    maxPrice: priceMatch?.[1] ? Number(priceMatch[1].replace(/,/g, "")) : null,
    city: "Austin",
    referencePoint: "downtown Austin",
    radiusMinutes: radiusMatch?.[1] ? Number(radiusMatch[1]) : null,
    mustHaveAmenities: /parking/i.test(query) ? ["parking"] : [],
    petsAllowed: /cat|dog|pet/i.test(query) ? true : null,
    notes: query,
  }
}

export function createServer() {
  const app = express()
  app.use(express.json())
  app.use(express.static(path.join(here, "..", "web")))
  app.use("/screenshots", express.static(path.join(here, "..", "screenshots")))

  app.get("/health", (_req, res) => {
    res.json({ ok: true, mockSolari: config.useMockSolari })
  })

  app.post("/searches", async (req, res) => {
    const query = String(req.body?.query ?? "").trim()
    if (!query) return res.status(400).json({ error: "query is required" })
    try {
      const criteria = config.anthropicApiKey ? await parseSearchQuery(query) : naiveFallbackParse(query)
      const search = insertSearch(query, criteria)
      res.json({ search })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  // Live feed of listing.found / application.prepared / application.submitted
  // events for the UI. No external broker — a single in-process EventEmitter
  // fanned out over SSE, per the "no queues" scope decision.
  app.get("/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders()

    const onEvent = (event: unknown) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    }
    feed.on("event", onEvent)
    req.on("close", () => feed.off("event", onEvent))
  })

  // Human clicks Submit here. Never called automatically. sensitiveValues
  // are used in-memory for this one request only and never persisted.
  app.post("/applications/:id/submit", async (req, res) => {
    const application = getApplication(req.params.id)
    if (!application) return res.status(404).json({ error: "application not found" })

    const listing = getListing(application.listingId)
    const applicantProfile = getApplicantProfile()
    if (!listing?.applyUrl || !applicantProfile?.solariProfileId) {
      return res.status(400).json({ error: "listing or applicant profile not ready" })
    }

    try {
      const solari = await getSolari()
      const result = await runSubmitFlow({
        solari,
        profileId: applicantProfile.solariProfileId,
        applyUrl: listing.applyUrl,
        applicantProfile,
        sensitiveValues: req.body?.sensitiveValues ?? {},
      })
      markSubmitted(application.id)
      feed.publish({ type: "application.submitted", applicationId: application.id })
      res.json({ ok: true, sessionId: result.sessionId })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  // Demo convenience: injects a synthetic listing into the exact same
  // pipeline the real watchers use (watcher -> extract -> score -> fill),
  // so a recorded demo doesn't depend on a real new listing appearing
  // during the recording window. See src/seed/seedTrigger.ts.
  app.post("/dev/seed-listing", async (_req, res) => {
    try {
      const listing = triggerSeedListing()
      await runPollCycle(getFixtureSource())
      res.json({ ok: true, listing })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  // Rehearsable demo reset: clears seeded listings/applications, the
  // fixture site's in-memory listings, and old screenshots -- leaves
  // searches/applicant profile alone. Lets you record the demo multiple
  // times back to back without restarting the server.
  app.post("/dev/reset", (_req, res) => {
    clearActivity()
    resetSeedFixture()
    const screenshotsDir = path.join(here, "..", "screenshots")
    if (fs.existsSync(screenshotsDir)) {
      for (const file of fs.readdirSync(screenshotsDir)) fs.unlinkSync(path.join(screenshotsDir, file))
    }
    res.json({ ok: true })
  })

  return app
}

export function startServer() {
  const app = createServer()
  return app.listen(config.port, () => {
    console.log(`apartment-lightning listening on http://localhost:${config.port}`)
    console.log(`solari mode: ${config.useMockSolari ? "mock" : "real"}`)
  })
}
