export interface ListingFoundEvent {
  type: "listing.found"
  listingId: string
  price: number | null
  beds: number | null
  distanceMinutes: number | null
  accepted: boolean
  reasons: string[]
}

export interface ApplicationPreparedEvent {
  type: "application.prepared"
  applicationId: string
  listingId: string
  missingFields: string[]
  screenshotPath: string | null
  solariSessionId: string
}

export interface ApplicationSubmittedEvent {
  type: "application.submitted"
  applicationId: string
}

export type FeedEvent = ListingFoundEvent | ApplicationPreparedEvent | ApplicationSubmittedEvent
