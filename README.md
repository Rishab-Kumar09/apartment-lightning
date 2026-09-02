# ⚡ Apartment Lightning

**The agent that never misses a new apartment.**

Tell it what you want:

> "Find me 1-bedroom apartments under $1,600 within 30 minutes of downtown Austin. I need parking and allow cats."

It watches property-management sites for **new** listings — not a one-time search — because in a hot rental market, being first to know about (and apply to) a listing is what actually determines who gets the unit. The moment a match appears, it opens the application with a [Solari](https://getsolari.com) cloud browser, fills in whatever it can safely pull from your saved profile, flags anything sensitive it can't (SSN, income documents, previous landlord contact), and stops. **A human always clicks Submit.** It never applies on your behalf without you seeing exactly what's about to go out.

Built on [Solari](https://github.com/solari-sdk/solari-cookbook) — cloud browsers, sandboxes, and desktops behind one API key.

---

## Why this exists

Every existing "apartment search" tool is a search box. None of them solve the actual problem in a competitive market: a new listing goes up, and by the time you see it on an aggregator and click through to apply, five other people already have. The edge isn't a better search UI — it's speed, and speed means watching the *source* (the property manager's own site), not an aggregator that's often stale by the time it syncs.

## How it works

```
Monitor  →  Detect  →  Extract  →  Score  →  Prepare  →  Notify  →  [human approves]  →  Submit
```

1. **You describe what you want**, in plain English, in the chat UI.
2. **Watchers** poll property-management sites directly for new listings (see [Design decisions](#design-decisions) for why not Zillow/Apartments.com/Realtor.com).
3. **Extraction + scoring** turns raw listing data into a structured match against your criteria — price, beds, amenities, pets — and rejects anything that doesn't fit.
4. **For accepted matches with an online application**, a Solari cloud browser opens the form using a persistent profile (so it's not logging in from scratch every time), fills whatever it can safely map from your applicant profile, and stops. Nothing gets submitted here.
5. **You're notified live** — a match card shows up in the UI within seconds, with a screenshot of the prepared application and a list of anything it needs from you.
6. **You fill in what's missing and click Submit.** Only then does anything actually get sent.

## Design decisions (and why)

- **Property-management sites, not aggregators.** Zillow, Apartments.com, and Realtor.com have litigation history against scrapers and explicit anti-automation terms. This is a public repo tied to a real identity, publicly tagging the infrastructure vendor — using a stealth browser specifically to evade *their* bot detection isn't a risk worth taking, and it's also the wrong product decision: a listing hits the landlord's own site before it ever syncs to an aggregator. Watching the source is both the safer choice and the faster one.
- **PII never touches disk.** [`applicant_profile`](src/db/schema.sql) has no SSN, income-document, or paystub columns — that's not an app-logic decision, it's a schema-level guarantee. [`fieldPolicy.ts`](src/application/fieldPolicy.ts) is the single place that decides what's safe to auto-fill from your stored profile versus what has to be collected just-in-time from you at approval time. Sensitive values you type in at that step live only in the request body for the duration of that one submit and are never written anywhere.
- **The agent never submits on its own.** [`fillFlow.ts`](src/application/fillFlow.ts) opens applications, fills what it safely can, and stops before anything resembling a submit button. Only [`submitFlow.ts`](src/application/submitFlow.ts), triggered exclusively by a human clicking Approve & Submit in the UI, actually sends anything.
- **The live watcher never fills real applications.** [`scripts/watch-live.ts`](scripts/watch-live.ts) proves the extraction pipeline against real sites — it detects, scores, and logs real listings — but deliberately never calls the fill flow against a real company's live application form with synthetic identity data. Fill-and-submit only ever happens against the local fixture site, through the actual human-in-the-loop UI.

## Two modes

**Seed mode** (`npm run seed`, or the "⚡ Trigger a new listing" button in the UI) drives the exact same pipeline against a local fixture site styled like a real property-management applicant portal — deterministic and rehearsable, so a recorded demo doesn't depend on a real listing appearing during the recording window. `npm run demo:reset` clears state for a clean take.

**Live mode** (`npm run watch:live -- <appfolio-listings-url> [more urls...]`) runs the real [AppFolio adapter](src/watchers/adapters/appfolio.ts) against actual property-management sites, continuously, in a separate process from the demo server. This was verified against a live AppFolio-hosted site (`utpmt.appfolio.com/listings/listings`) — 39 real listings extracted correctly, scored against real criteria, 10 genuine matches with real apply URLs, zero errors. Because AppFolio serves the same markup template to every property manager on the platform, this one adapter works across many different AppFolio customers' own sites, not just the one it was tested against.

*Known scope cut:* real listings don't get a resolved commute distance (no geocoding/directions API is wired up) — the scorer treats a missing distance as "don't filter on it," so real listings still score correctly on price, beds, amenities, and pet policy.

## Architecture

Deliberately boring: one Node/TypeScript service, SQLite, a no-build-step HTML/JS frontend. No queues, no microservices — this is meant to be shippable by a solo developer in days, not infrastructure for its own sake.

```
src/
  preferences/   NL query -> structured SearchCriteria, via Claude
  watchers/      per-site adapters + polling/diff loop against seen_listings
  extraction/    raw listing -> normalized data -> accept/reject + score
  solari/        SolariAdapter interface; real (@solarisdk/browser) vs mock, one env var apart
  application/   fieldPolicy (the PII boundary), fillFlow (prepare, never submit), submitFlow (human-triggered)
  notifications/ in-process EventEmitter -> SSE feed to the UI
  db/            SQLite schema + repositories
  seed/          local fixture site + trigger, for a deterministic demo
web/             chat input + live match-card feed (vanilla JS, EventSource, no framework)
```

The mock Solari client isn't a stub — `newPage()` returns a real, locally-launched Playwright page pointed at the fixture site, so the fill/detect logic is genuinely exercised end to end. Only the Solari *cloud service* (profile persistence, session recording) is faked, which meant the riskiest logic (parsing, scoring, sensitive-field detection) got proven out before any Solari dependency existed at all — swapping in the real SDK later was a one-line config change, not a rewrite.

## Setup

Requires Node 22.5+ (uses the built-in `node:sqlite`).

```bash
npm install
npx playwright install chromium
cp .env.example .env
# fill in ANTHROPIC_API_KEY (for the chat parser) and/or SOLARI_API_KEY
# (get one free for a month at getsolari.com with promo code STARTER1MO-MKY4BNDK)
# — both are optional; the app runs with sensible fallbacks if unset

npm run seed:applicant   # seeds a demo applicant profile (placeholder data)
npm run dev              # starts the server + fixture site on :3000 / :4000
```

Open `http://localhost:3000`, type a query (or use the example above), and click **⚡ Trigger a new listing** to see the pipeline run live. Missing `ANTHROPIC_API_KEY` falls back to a naive regex parser so the UI still works with zero keys configured; missing `SOLARI_API_KEY` runs the mock browser client automatically — nothing needs to be flipped manually to go from mock to real, just set the key.

```bash
npm run demo:reset                              # clean slate before another take
npm run watch:live -- <appfolio-listings-url>    # real sites, separate process, detection-only
npm run typecheck
```

## How this was built

Built with Claude Code, end to end — architecture, implementation, debugging, and this README. The process: research the real Solari SDK from its published cookbook and npm packages before writing a line of code, design the architecture and get it reviewed before implementing, build in mock mode first so the core logic was provable without any external dependency, then swap in the real SDK last as a narrow, low-risk change. Every phase was verified by actually running it — a Playwright-driven browser session exercising the real UI, not just a passing type-check — which caught several real bugs along the way (a price-parsing regex that misfired on "1-bedroom", a cross-package TypeScript type clash between Playwright and Solari's patchright fork, a headless Chromium crash scraping a real image-heavy listing page, and an esbuild/tsx serialization gotcha in the real-site adapter). All of that is in the commit history, not smoothed over.
