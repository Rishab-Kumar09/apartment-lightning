import { migrate } from "../src/db/migrate.ts"
import { upsertApplicantProfile } from "../src/db/repositories/applicantProfile.ts"

// Dev convenience: populate the safe-fields-only applicant profile so
// fillFlow has something real to fill during local testing/demo. All values
// here are placeholder demo data, not anyone's real information.
migrate()
upsertApplicantProfile({
  fullName: "Jordan Rivera",
  email: "jordan.rivera@example.com",
  phone: "512-555-0142",
  currentAddress: "88 Congress Ave, Austin, TX",
  employer: "Acme Robotics",
  monthlyIncomeRange: "5000-6000",
  desiredMoveInDate: "2026-10-01",
  solariProfileId: null,
})
console.log("seeded demo applicant profile")
