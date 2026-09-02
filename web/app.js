const chatForm = document.getElementById("chat-form")
const chatInput = document.getElementById("chat-input")
const chatStatus = document.getElementById("chat-status")
const feed = document.getElementById("feed")
const activityLog = document.getElementById("activity-log")

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault()
  const query = chatInput.value.trim()
  if (!query) return
  chatStatus.textContent = "Parsing your request and starting watchers…"
  try {
    const res = await fetch("/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "failed")
    chatStatus.textContent = `Watching for: ${JSON.stringify(data.search.criteria)}`
  } catch (err) {
    chatStatus.textContent = `Error: ${err.message}`
  }
})

document.getElementById("trigger-demo").addEventListener("click", async (e) => {
  const btn = e.target
  btn.disabled = true
  btn.textContent = "Watching site… listing incoming"
  try {
    const res = await fetch("/dev/seed-listing", { method: "POST" })
    if (!res.ok) throw new Error((await res.json()).error || "failed")
  } catch (err) {
    chatStatus.textContent = `Trigger failed: ${err.message}`
  } finally {
    btn.disabled = false
    btn.textContent = "⚡ Trigger a new listing (demo)"
  }
})

function logActivity(text, cls) {
  const li = document.createElement("li")
  li.textContent = text
  if (cls) li.className = cls
  activityLog.prepend(li)
}

function money(n) {
  return n == null ? "?" : `$${n.toLocaleString()}`
}

function renderMatchCard(event) {
  const card = document.createElement("div")
  card.className = "card"
  card.id = `application-${event.applicationId}`

  const tags = event.amenities.map((a) => `<span class="tag">${escapeHtml(a)}</span>`).join("")
  const screenshot = event.screenshotUrl
    ? `<img class="screenshot" src="${event.screenshotUrl}" alt="Prepared application screenshot">`
    : ""

  const missingFieldsHtml = event.missingFields
    .map(
      (label, i) => `
      <div class="missing-field">
        <label for="mf-${event.applicationId}-${i}">${escapeHtml(label)}</label>
        <input id="mf-${event.applicationId}-${i}" data-label="${escapeHtml(label)}" type="text" placeholder="Enter ${escapeHtml(label)}">
      </div>`,
    )
    .join("")

  card.innerHTML = `
    <h3>NEW MATCH — ${escapeHtml(event.addressText || "Unknown address")}</h3>
    <p class="meta">${money(event.price)}/mo · ${event.beds ?? "?"} bed · ${event.distanceMinutes ?? "?"} min away</p>
    <div class="tags">${tags}</div>
    ${screenshot}
    ${missingFieldsHtml ? `<p class="meta">Missing before I can submit:</p>${missingFieldsHtml}` : "<p class=\"meta\">Everything's filled in.</p>"}
    <button class="submit">Approve & Submit</button>
    <span class="status-badge"></span>
  `

  card.querySelector("button.submit").addEventListener("click", async () => {
    const sensitiveValues = {}
    card.querySelectorAll(".missing-field input").forEach((input) => {
      if (input.value) sensitiveValues[input.dataset.label] = input.value
    })
    const btn = card.querySelector("button.submit")
    btn.disabled = true
    btn.textContent = "Submitting…"
    try {
      const res = await fetch(`/applications/${event.applicationId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensitiveValues }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "submit failed")
      btn.textContent = "Submitted"
      card.querySelector(".status-badge").textContent = "✓ submitted"
      card.querySelector(".status-badge").classList.add("submitted")
    } catch (err) {
      btn.disabled = false
      btn.textContent = "Approve & Submit"
      chatStatus.textContent = `Submit failed: ${err.message}`
    }
  })

  feed.prepend(card)
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])
}

const source = new EventSource("/events")
source.onmessage = (e) => {
  const event = JSON.parse(e.data)
  if (event.type === "listing.found") {
    const label = `${event.accepted ? "MATCH" : "skip"} — ${money(event.price)}/mo, ${event.distanceMinutes ?? "?"} min` +
      (event.reasons.length ? ` (${event.reasons.join("; ")})` : "")
    logActivity(label, event.accepted ? "accepted" : "rejected")
  } else if (event.type === "application.prepared") {
    logActivity(`application prepared — ${event.missingFields.length} field(s) need you`, "accepted")
    renderMatchCard(event)
  } else if (event.type === "application.submitted") {
    logActivity(`application ${event.applicationId} submitted`, "accepted")
  }
}
