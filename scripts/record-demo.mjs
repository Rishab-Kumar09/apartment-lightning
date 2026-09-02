// Records a real (silent, unnarrated) video of the actual working demo by
// driving the real UI with Playwright and Playwright's built-in video
// recording. This is a proof artifact showing the flow genuinely works end
// to end -- it is NOT a substitute for a proper narrated screen recording
// for the actual LinkedIn/X post; use this as a reference for what to
// capture, or as backup footage.
import { chromium } from "playwright"
import fs from "node:fs"

const outDir = "recordings"
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  recordVideo: { dir: outDir, size: { width: 1280, height: 900 } },
  viewport: { width: 1280, height: 900 },
})
const page = await context.newPage()

await page.goto("http://localhost:3000")
await page.waitForTimeout(800)

await page.fill(
  "#chat-input",
  "Find me 1-bedroom apartments under $1,600 within 30 minutes of downtown Austin. I need parking and allow cats.",
)
await page.waitForTimeout(400)
await page.click("#chat-form button")
await page.waitForFunction(() => document.getElementById("chat-status").textContent.includes("Watching"))
await page.waitForTimeout(1000)

await page.click("#trigger-demo")
await page.waitForSelector(".card")
await page.waitForTimeout(1500)

for (const input of await page.$$(".missing-field input")) {
  const label = await input.getAttribute("data-label")
  await input.fill(label === "SSN" ? "***-**-1234 (demo only)" : "(555) 010-9999")
  await page.waitForTimeout(300)
}
await page.waitForTimeout(800)

await page.click(".card button.submit")
await page.waitForSelector(".card .status-badge.submitted")
await page.waitForTimeout(1500)

await context.close()
await browser.close()

const [file] = fs.readdirSync(outDir).filter((f) => f.endsWith(".webm"))
console.log(`recorded: ${outDir}/${file}`)
