// The explicit PII boundary. This is the one place that decides what an
// applicant-profile field is allowed to touch: SAFE fields get auto-filled
// from the stored profile; SENSITIVE fields are never stored (see
// applicant_profile in db/schema.sql — those columns don't exist) and are
// only ever collected just-in-time from the human at approval time.

export type FieldClass = "safe" | "sensitive" | "unknown"

// label -> applicant-profile field name, matched by substring against a form
// field's label/name/placeholder (lowercased).
const SAFE_FIELD_MAP: Array<{ match: RegExp; profileField: string }> = [
  { match: /full ?name|applicant name|^name$/i, profileField: "fullName" },
  { match: /e-?mail/i, profileField: "email" },
  { match: /phone/i, profileField: "phone" },
  { match: /current address|street address/i, profileField: "currentAddress" },
  { match: /employer/i, profileField: "employer" },
  { match: /income/i, profileField: "monthlyIncomeRange" },
  { match: /move.?in date/i, profileField: "desiredMoveInDate" },
]

const SENSITIVE_PATTERNS: RegExp[] = [
  /ssn|social security/i,
  /income (document|verification|proof)|paystub|pay stub|w-?2|tax return/i,
  /previous landlord|prior landlord/i,
  /bank (account|routing)/i,
  /driver'?s? license|passport number/i,
  /date of birth|dob/i,
]

export function classifyField(labelOrName: string): { cls: FieldClass; profileField?: string } {
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(labelOrName)) return { cls: "sensitive" }
  }
  for (const entry of SAFE_FIELD_MAP) {
    if (entry.match.test(labelOrName)) return { cls: "safe", profileField: entry.profileField }
  }
  return { cls: "unknown" }
}
