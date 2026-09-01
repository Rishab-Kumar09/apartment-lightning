import Anthropic from "@anthropic-ai/sdk"
import { config } from "../config.ts"
import type { SearchCriteria } from "./types.ts"

const TOOL_NAME = "record_search_criteria"

const TOOL_SCHEMA = {
  name: TOOL_NAME,
  description: "Record structured apartment search criteria parsed from a user's natural-language request.",
  input_schema: {
    type: "object" as const,
    properties: {
      beds: { type: ["number", "null"], description: "Number of bedrooms requested, or null if unspecified" },
      maxPrice: { type: ["number", "null"], description: "Max monthly rent in USD, or null if unspecified" },
      city: { type: "string", description: "City the user is searching in" },
      referencePoint: {
        type: ["string", "null"],
        description: "The place a commute/distance radius is measured from, e.g. 'downtown Austin'",
      },
      radiusMinutes: {
        type: ["number", "null"],
        description: "Max commute/distance in minutes from referencePoint, or null if unspecified",
      },
      mustHaveAmenities: {
        type: "array",
        items: { type: "string" },
        description: "Amenities the user explicitly requires, e.g. ['parking']",
      },
      petsAllowed: {
        type: ["boolean", "null"],
        description: "true if the user needs pet-friendly, null if not mentioned",
      },
      notes: { type: ["string", "null"], description: "Anything else relevant that doesn't fit the other fields" },
    },
    required: ["beds", "maxPrice", "city", "referencePoint", "radiusMinutes", "mustHaveAmenities", "petsAllowed", "notes"],
  },
}

export async function parseSearchQuery(rawQuery: string): Promise<SearchCriteria> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey })
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    tools: [TOOL_SCHEMA],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content: rawQuery }],
  })

  const toolUse = response.content.find((block) => block.type === "tool_use")
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return structured search criteria")
  }
  return toolUse.input as SearchCriteria
}
