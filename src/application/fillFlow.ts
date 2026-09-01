import fs from "node:fs"
import path from "node:path"
import type { SolariAdapter } from "../solari/client.ts"
import type { ApplicantProfile } from "../db/repositories/applicantProfile.ts"
import { classifyField } from "./fieldPolicy.ts"

export interface FillFlowResult {
  missingFields: string[]
  screenshotPath: string
  sessionId: string
}

// Opens the application, fills whatever it can safely map from the stored
// applicant profile, and STOPS — it never looks for or clicks a submit
// button. Sensitive/unmapped fields are collected as `missingFields` for a
// human to supply later via runSubmitFlow.
export async function runFillFlow(params: {
  solari: SolariAdapter
  profileId: string
  applyUrl: string
  applicantProfile: ApplicantProfile
}): Promise<FillFlowResult> {
  const session = await params.solari.launch({ profileId: params.profileId, recording: true })
  try {
    const page = await session.newPage()
    await page.goto(params.applyUrl)

    const missingFields: string[] = []
    for (const label of await page.locator("label[for]").all()) {
      const forId = await label.getAttribute("for")
      if (!forId) continue
      const text = (await label.innerText()).trim()
      const { cls, profileField } = classifyField(text)

      if (cls === "safe" && profileField) {
        const value = (params.applicantProfile as unknown as Record<string, unknown>)[profileField]
        if (value) {
          await page.locator(`#${cssEscape(forId)}`).fill(String(value))
          continue
        }
      }
      // Sensitive fields, and safe-but-unmapped-empty fields, both need a
      // human — fail safe rather than guessing.
      missingFields.push(text)
    }

    fs.mkdirSync("screenshots", { recursive: true })
    const screenshotPath = path.join("screenshots", `${session.id}.png`)
    await page.screenshot({ path: screenshotPath })

    // Persist whatever the browser accumulated (cookies from this apply
    // flow) — attaching a profile does not auto-save it.
    const state = await page.context().storageState()
    await params.solari.profiles.save(params.profileId, state)

    return { missingFields, screenshotPath, sessionId: session.id }
  } finally {
    await session.close()
  }
}

function cssEscape(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`)
}
