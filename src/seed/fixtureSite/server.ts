import express from "express"
import type { Server } from "node:http"
import { config } from "../../config.ts"

// A tiny local site standing in for a property-management platform (AppFolio/
// RentCafe-style listing + application pages). Its whole purpose is to give
// the pipeline something real to navigate with a Playwright page, so the
// demo drives genuine browser automation rather than calling a JSON API.
export interface FixtureListingInput {
  price: number
  beds: number
  baths: number
  addressText: string
  distanceMinutes: number
  amenities: string[]
  petsAllowed: boolean
}

interface FixtureListing extends FixtureListingInput {
  id: string
  submitted: boolean
}

let listings: FixtureListing[] = []
let nextId = 1

export function seedFixtureListing(input: FixtureListingInput): FixtureListing {
  const listing: FixtureListing = { ...input, id: String(nextId++), submitted: false }
  listings.push(listing)
  return listing
}

export function resetFixture(): void {
  listings = []
  nextId = 1
}

function layout(body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8">
    <title>Sunbelt Realty Portal (fixture)</title>
    <style>
      body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;color:#222}
      .card{border:1px solid #ddd;border-radius:8px;padding:1rem;margin-bottom:1rem}
      label{display:block;margin-top:0.75rem;font-weight:600}
      input{width:100%;padding:0.4rem;margin-top:0.25rem;box-sizing:border-box}
      button{margin-top:1.25rem;padding:0.6rem 1.2rem}
    </style></head><body>${body}</body></html>`
}

export function startFixtureSite(): Server {
  const app = express()
  app.use(express.urlencoded({ extended: true }))

  app.get("/listings", (_req, res) => {
    const cards = listings
      .map(
        (l) => `
      <div class="card" data-listing-id="${l.id}" data-price="${l.price}" data-beds="${l.beds}"
           data-baths="${l.baths}" data-distance="${l.distanceMinutes}"
           data-amenities="${l.amenities.join(",")}" data-pets="${l.petsAllowed}"
           data-address="${l.addressText}" data-apply-url="http://localhost:${config.fixtureSitePort}/listings/${l.id}/apply">
        <h3>${l.addressText}</h3>
        <p>$${l.price}/mo &middot; ${l.beds} bed / ${l.baths} bath &middot; ${l.distanceMinutes} min away</p>
        <p>${l.amenities.join(", ")}${l.petsAllowed ? " · pets allowed" : ""}</p>
        <a href="/listings/${l.id}/apply">Apply now</a>
      </div>`,
      )
      .join("\n")
    res.send(layout(`<h1>Sunbelt Realty — Open Listings</h1>${cards || "<p>No listings yet.</p>"}`))
  })

  app.get("/listings/:id/apply", (req, res) => {
    const listing = listings.find((l) => l.id === req.params.id)
    if (!listing) return res.status(404).send(layout("<p>Listing not found.</p>"))
    res.send(
      layout(`
      <h1>Apply — ${listing.addressText}</h1>
      <form method="post" action="/listings/${listing.id}/apply">
        <label for="fullName">Full Name</label>
        <input id="fullName" name="fullName">
        <label for="email">Email</label>
        <input id="email" name="email">
        <label for="phone">Phone</label>
        <input id="phone" name="phone">
        <label for="currentAddress">Current Address</label>
        <input id="currentAddress" name="currentAddress">
        <label for="employer">Employer</label>
        <input id="employer" name="employer">
        <label for="moveInDate">Move-in Date</label>
        <input id="moveInDate" name="moveInDate">
        <label for="ssn">SSN</label>
        <input id="ssn" name="ssn">
        <label for="prevLandlordPhone">Previous Landlord Phone</label>
        <input id="prevLandlordPhone" name="prevLandlordPhone">
        <button type="submit">Submit Application</button>
      </form>`),
    )
  })

  app.post("/listings/:id/apply", (req, res) => {
    const listing = listings.find((l) => l.id === req.params.id)
    if (!listing) return res.status(404).send(layout("<p>Listing not found.</p>"))
    listing.submitted = true
    res.send(layout(`<h1>Application submitted</h1><p>Thanks, ${req.body.fullName || "applicant"}!</p>`))
  })

  return app.listen(config.fixtureSitePort, () => {
    console.log(`fixture site listening on http://localhost:${config.fixtureSitePort}`)
  })
}
