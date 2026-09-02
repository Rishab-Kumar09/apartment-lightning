// Convenience wrapper for rehearsing the recorded demo against an already-
// running `npm run dev` server (talks to it over HTTP, not in-process --
// the fixture site's listings live in that server's memory).
//
//   npm run demo:reset   -- clears listings/applications for a clean take
//   tsx scripts/demo-seed.ts             -- triggers one new listing

const base = `http://localhost:${process.env.PORT ?? 3000}`
const reset = process.argv.includes("--reset")

const res = await fetch(`${base}/dev/${reset ? "reset" : "seed-listing"}`, { method: "POST" })
const body = await res.json()
if (!res.ok) {
  console.error("failed:", body)
  process.exit(1)
}
console.log(reset ? "demo reset — ready for a clean take" : "seeded listing:", body)

export {}
