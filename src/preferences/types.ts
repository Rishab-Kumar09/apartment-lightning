export interface SearchCriteria {
  beds: number | null
  maxPrice: number | null
  city: string
  referencePoint: string | null // e.g. "downtown Austin" — what radiusMinutes is measured from
  radiusMinutes: number | null
  mustHaveAmenities: string[] // e.g. ["parking"]
  petsAllowed: boolean | null
  notes: string | null
}
