import { db } from "../client.ts"

// SAFE fields only — see db/schema.sql. There is deliberately no SSN/income
// document/paystub storage anywhere in this repository.
export interface ApplicantProfile {
  id: string
  fullName: string | null
  email: string | null
  phone: string | null
  currentAddress: string | null
  employer: string | null
  monthlyIncomeRange: string | null
  desiredMoveInDate: string | null
  solariProfileId: string | null
}

const SINGLETON_ID = "default"

function rowToProfile(row: any): ApplicantProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    currentAddress: row.current_address,
    employer: row.employer,
    monthlyIncomeRange: row.monthly_income_range,
    desiredMoveInDate: row.desired_move_in_date,
    solariProfileId: row.solari_profile_id,
  }
}

export function getApplicantProfile(): ApplicantProfile | null {
  const row = db.prepare(`SELECT * FROM applicant_profile WHERE id = ?`).get(SINGLETON_ID)
  return row ? rowToProfile(row) : null
}

export function upsertApplicantProfile(fields: Omit<ApplicantProfile, "id">): ApplicantProfile {
  db.prepare(
    `INSERT INTO applicant_profile
      (id, full_name, email, phone, current_address, employer, monthly_income_range,
       desired_move_in_date, solari_profile_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       full_name = excluded.full_name,
       email = excluded.email,
       phone = excluded.phone,
       current_address = excluded.current_address,
       employer = excluded.employer,
       monthly_income_range = excluded.monthly_income_range,
       desired_move_in_date = excluded.desired_move_in_date,
       solari_profile_id = excluded.solari_profile_id,
       updated_at = excluded.updated_at`,
  ).run(
    SINGLETON_ID,
    fields.fullName,
    fields.email,
    fields.phone,
    fields.currentAddress,
    fields.employer,
    fields.monthlyIncomeRange,
    fields.desiredMoveInDate,
    fields.solariProfileId,
    new Date().toISOString(),
  )
  return { id: SINGLETON_ID, ...fields }
}
