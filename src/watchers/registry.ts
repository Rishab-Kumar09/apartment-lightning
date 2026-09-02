import path from "node:path"
import { getSolari } from "../solari/client.ts"
import { ensureProfile } from "../solari/profiles.ts"
import { extractListing, type ListingData } from "../extraction/extractor.ts"
import { scoreListing } from "../extraction/scorer.ts"
import { hasSeenListing, markSeen, insertListing } from "../db/repositories/listings.ts"
import { listActiveSearches } from "../db/repositories/searches.ts"
import { getApplicantProfile, upsertApplicantProfile } from "../db/repositories/applicantProfile.ts"
import { insertApplication } from "../db/repositories/applications.ts"
import { runFillFlow } from "../application/fillFlow.ts"
import { feed } from "../notifications/feed.ts"
import type { SourceConfig } from "./types.ts"

const APPLICANT_SOLARI_PROFILE_NAME = "apartment-lightning-applicant"

// One pass: fetch new listings from a source, diff against seen_listings,
// score against every active search, and kick off application prep for
// accepted matches. Called on a timer by startPolling, and directly (once,
// synchronously) by --seed for a deterministic demo run.
export async function runPollCycle(source: SourceConfig): Promise<void> {
  const solari = await getSolari()
  const raw = await source.adapter.listNewListings({ solari, targetUrl: source.targetUrl })
  const searches = listActiveSearches()

  for (const listing of raw) {
    if (hasSeenListing(listing.externalId)) continue
    markSeen(listing)
    const extracted = extractListing(listing)

    for (const search of searches) {
      const { score, accepted, reasons } = scoreListing(extracted, search.criteria)
      const listingId = insertListing({
        ...extracted,
        seenListingId: listing.externalId,
        searchId: search.id,
        score,
        accepted,
        reasons,
      })
      feed.publish({
        type: "listing.found",
        listingId,
        price: extracted.price,
        beds: extracted.beds,
        distanceMinutes: extracted.distanceMinutes,
        accepted,
        reasons,
      })

      if (accepted && extracted.hasOnlineApplication && extracted.applyUrl) {
        await prepareApplication(listingId, extracted)
      }
    }
  }
}

async function prepareApplication(listingId: string, listing: ListingData): Promise<void> {
  const applyUrl = listing.applyUrl!
  const solari = await getSolari()
  let applicantProfile = getApplicantProfile()
  if (!applicantProfile) {
    applicantProfile = upsertApplicantProfile({
      fullName: null,
      email: null,
      phone: null,
      currentAddress: null,
      employer: null,
      monthlyIncomeRange: null,
      desiredMoveInDate: null,
      solariProfileId: null,
    })
  }

  let solariProfileId = applicantProfile.solariProfileId
  if (!solariProfileId) {
    const profile = await ensureProfile(solari, APPLICANT_SOLARI_PROFILE_NAME)
    solariProfileId = profile.id
    applicantProfile = upsertApplicantProfile({ ...applicantProfile, solariProfileId })
  }

  try {
    const result = await runFillFlow({ solari, profileId: solariProfileId, applyUrl, applicantProfile })
    const applicationId = insertApplication({
      listingId,
      status: result.missingFields.length > 0 ? "awaiting_human" : "prepared",
      missingFields: result.missingFields,
      screenshotPath: result.screenshotPath,
      solariSessionId: result.sessionId,
    })
    feed.publish({
      type: "application.prepared",
      applicationId,
      listingId,
      price: listing.price,
      beds: listing.beds,
      distanceMinutes: listing.distanceMinutes,
      addressText: listing.addressText,
      amenities: listing.amenities,
      missingFields: result.missingFields,
      screenshotUrl: result.screenshotPath ? `/screenshots/${path.basename(result.screenshotPath)}` : null,
      solariSessionId: result.sessionId,
    })
  } catch (err) {
    console.error("fillFlow failed:", err)
  }
}

export function startPolling(sources: SourceConfig[]): void {
  for (const source of sources) {
    setInterval(() => {
      runPollCycle(source).catch((err) => console.error(`poll failed for ${source.adapter.name}:`, err))
    }, source.pollIntervalMs)
  }
}
