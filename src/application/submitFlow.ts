import type { SolariAdapter } from "../solari/client.ts"
import type { ApplicantProfile } from "../db/repositories/applicantProfile.ts"
import { classifyField } from "./fieldPolicy.ts"

export interface SubmitFlowResult {
  sessionId: string
}

// Only ever called from the human-approval endpoint, never automatically.
// sensitiveValues are supplied by the human in the request body, used only
// in-memory for this one fill+submit, and never written to the database.
export async function runSubmitFlow(params: {
  solari: SolariAdapter
  profileId: string
  applyUrl: string
  applicantProfile: ApplicantProfile
  sensitiveValues: Record<string, string>
}): Promise<SubmitFlowResult> {
  const session = await params.solari.launch({ profileId: params.profileId, recording: true })
  try {
    const page = await session.newPage()
    await page.goto(params.applyUrl)

    for (const label of await page.locator("label[for]").all()) {
      const forId = await label.getAttribute("for")
      if (!forId) continue
      const text = (await label.innerText()).trim()
      const { cls, profileField } = classifyField(text)
      const field = page.locator(`#${cssEscape(forId)}`)

      if (cls === "safe" && profileField) {
        const value = (params.applicantProfile as unknown as Record<string, unknown>)[profileField]
        if (value) {
          await field.fill(String(value))
          continue
        }
      }
      const suppliedValue = params.sensitiveValues[text]
      if (suppliedValue) {
        await field.fill(suppliedValue)
      }
    }

    await page.locator('button[type="submit"], input[type="submit"]').first().click()

    return { sessionId: session.id }
  } finally {
    await session.close()
  }
}

function cssEscape(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`)
}
