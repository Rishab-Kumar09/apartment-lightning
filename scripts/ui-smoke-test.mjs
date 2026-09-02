import { chromium } from "playwright"

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const logs = []
page.on("console", (msg) => logs.push(`[console.${msg.type()}] ${msg.text()}`))
page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`))

await page.goto("http://localhost:3000")
await page.fill("#chat-input", "Find me 1-bedroom apartments under $1,600 within 30 minutes of downtown Austin. I need parking and allow cats.")
await page.click("#chat-form button")
await page.waitForFunction(() => document.getElementById("chat-status").textContent.includes("Watching"), { timeout: 10000 })
console.log("STEP1 chat-status:", await page.textContent("#chat-status"))

await page.click("#trigger-demo")
await page.waitForSelector(".card", { timeout: 15000 })
console.log("STEP2 card appeared")

const cardText = await page.textContent(".card")
console.log("STEP3 card text:", cardText.replace(/\s+/g, " ").trim())

const missingInputs = await page.$$(".missing-field input")
console.log("STEP4 missing field count:", missingInputs.length)
for (const input of missingInputs) {
  const label = await input.getAttribute("data-label")
  await input.fill(`test-value-for-${label}`)
}

const screenshotVisible = await page.$eval("img.screenshot", (img) => img.complete && img.naturalWidth > 0).catch(() => false)
console.log("STEP5 screenshot loaded:", screenshotVisible)

await page.click(".card button.submit")
await page.waitForSelector(".card .status-badge.submitted", { timeout: 15000 })
console.log("STEP6 submitted badge:", await page.textContent(".card .status-badge"))

console.log("BROWSER LOGS:", logs)
await browser.close()
console.log("SMOKE TEST PASSED")
