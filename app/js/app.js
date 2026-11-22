// ============================================================================
// ClauseGuard — UI logic
// ----------------------------------------------------------------------------
// Flow: paste contract → Analyze (privacy: device-only) → summary + clause
// cards + questions → optional cloud summary of the findings (privacy:
// cloud, findings only) → Draft pushback email (privacy: cloud, findings
// only). Every AI output is badged with the engine that produced it.
// ============================================================================

import { generate, detectOnDevice, currentMode } from "./ai-router.js";
import {
  buildAnalyzePrompt,
  buildEmailPrompt,
  buildSummaryPrompt,
  parseAnalysis,
} from "./prompts.js";

const SAMPLE_CONTRACT = `SERVICES AGREEMENT

1. Services. The Contractor shall provide design and development services as
described in each Statement of Work.

2. Payment. Client shall pay each invoice within ninety (90) days of receipt
(net 90). No late fees shall apply.

3. Intellectual Property. Contractor hereby assigns to Client all intellectual
property rights in all work product, drafts, concepts and materials created in
connection with this Agreement, in perpetuity and irrevocably, whether or not
such materials are used by Client.

4. Indemnity. Contractor shall indemnify and hold harmless Client from any and
all claims, damages and losses whatsoever, without limitation.

5. Non-Compete. During the term and for twenty-four (24) months thereafter,
Contractor shall not provide services to any competitor of Client.

6. Termination. Client may terminate this Agreement immediately, at its sole
discretion and without notice. No payment shall be due for work in progress.

7. Confidentiality. Contractor shall keep all Client information confidential.

8. Governing Law. This Agreement shall be governed by the laws of the State of
Delaware, and any dispute shall be resolved exclusively in Delaware courts.`;

const $ = (id) => document.getElementById(id);
let lastAnalysis = null;

function engineBadge(engine) {
  switch (engine) {
    case "ON_DEVICE":
      return { text: "ON-DEVICE · private", cls: "badge-device" };
    case "IN_CLOUD":
      return { text: "CLOUD", cls: "badge-cloud" };
    default:
      return { text: "LOCAL RULE ENGINE — not AI", cls: "badge-mock" };
  }
}

function setBadge(el, engine) {
  const b = engineBadge(engine);
  el.textContent = b.text;
  el.className = "badge " + b.cls;
  el.hidden = false;
}

/**
 * Descriptive badge for the optional cloud-summary step: names the actual
 * engine behind the Firebase AI Logic call (response.inferenceSource),
 * e.g. "Cloud — Gemini via Firebase AI Logic".
 */
function setSourceBadge(el, engine) {
  if (engine === "IN_CLOUD") {
    el.textContent = "Cloud — Gemini via Firebase AI Logic";
    el.className = "badge badge-cloud";
  } else if (engine === "ON_DEVICE") {
    el.textContent = "On-device — Gemini Nano via Firebase AI Logic";
    el.className = "badge badge-device";
  } else {
    el.textContent = "LOCAL RULE ENGINE — not AI";
    el.className = "badge badge-mock";
  }
  el.hidden = false;
}

async function refreshStatus() {
  const device = await detectOnDevice();
  const deviceEl = $("deviceStatus");
  if (device.status === "available") {
    deviceEl.textContent = "On-device: Gemini Nano available";
    deviceEl.classList.add("ok");
  } else if (device.status === "downloadable" || device.status === "downloading") {
    deviceEl.textContent = "On-device: Gemini Nano " + device.status;
    deviceEl.classList.add("warn");
  } else {
    deviceEl.textContent = "On-device: not available in this browser";
    deviceEl.classList.add("warn");
  }
  const mode = await currentMode();
  $("modeStatus").textContent = "Mode: " + mode.label;
}

function renderAnalysis(analysis, engine) {
  lastAnalysis = analysis;
  $("results").hidden = false;

  setBadge($("summaryBadge"), engine);
  $("summaryText").textContent = analysis.summary || "(no summary)";

  const order = { high: 0, medium: 1, low: 2 };
  const clauses = [...analysis.clauses].sort(
    (a, b) => (order[a.severity] ?? 1) - (order[b.severity] ?? 1)
  );
  $("clauseCards").innerHTML = clauses
    .map(
      (c) => `
      <article class="card sev-${escapeHtml(c.severity || "low")}">
        <header>
          <h3>${escapeHtml(c.title || "Clause")}</h3>
          <span class="sev">${escapeHtml((c.severity || "low").toUpperCase())}</span>
        </header>
        <blockquote>${escapeHtml(c.quote || "")}</blockquote>
        <p><strong>What it means:</strong> ${escapeHtml(c.plainEnglish || "")}</p>
        <p><strong>What to do:</strong> ${escapeHtml(c.action || "")}</p>
      </article>`
    )
    .join("");

  $("questionsList").innerHTML = (analysis.questions || [])
    .map((q) => `<li>${escapeHtml(q)}</li>`)
    .join("");

  // Reset the optional cloud-summary step for the new analysis.
  $("cloudSummaryBadge").hidden = true;
  $("cloudSummaryText").hidden = true;
  $("cloudSummaryText").textContent = "";
  $("cloudSummaryNote").hidden = true;

  $("emailSection").hidden = false;
  $("emailOutput").hidden = true;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function onAnalyze() {
  const text = $("contractInput").value.trim();
  const errorEl = $("analyzeError");
  errorEl.hidden = true;
  if (text.length < 50) {
    errorEl.textContent = "Paste a contract first (or load the sample).";
    errorEl.hidden = false;
    return;
  }
  const btn = $("analyzeBtn");
  btn.disabled = true;
  btn.textContent = "Analyzing on-device…";
  try {
    // The raw contract is confidential: privacy "device-only" maps to
    // Firebase ONLY_ON_DEVICE in the configured build — it never uploads.
    const { text: raw, engine } = await generate(buildAnalyzePrompt(text), {
      kind: "analyze",
      privacy: "device-only",
    });
    renderAnalysis(parseAnalysis(raw), engine);
  } catch (err) {
    errorEl.textContent =
      "Analysis failed: " +
      (err && err.message ? err.message : String(err)) +
      " — your contract text was not uploaded anywhere: analysis only ever runs on this device (Gemini Nano when available, otherwise the local rule engine).";
    errorEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Analyze contract";
  }
}

async function onCloudSummary() {
  if (!lastAnalysis) return;
  const btn = $("cloudSummaryBtn");
  const out = $("cloudSummaryText");
  const note = $("cloudSummaryNote");
  btn.disabled = true;
  btn.textContent = "Summarizing…";
  note.hidden = true;
  try {
    // Optional step: ONLY the extracted findings go to Firebase AI Logic in
    // the cloud (same path as the email draft) — never the raw contract.
    const { text, engine } = await generate(buildSummaryPrompt(lastAnalysis), {
      kind: "summary",
      privacy: "cloud",
      context: lastAnalysis,
    });
    setSourceBadge($("cloudSummaryBadge"), engine);
    out.textContent = text;
    out.hidden = false;
    if (engine === "MOCK") {
      // Honest error state: the cloud call could not be completed, so the
      // router produced this summary locally instead. Local results stand.
      note.textContent =
        "Cloud AI was unavailable (offline, quota, or attestation), so this summary was produced locally by the rule engine instead — your results above are unchanged.";
      note.hidden = false;
    }
  } catch (err) {
    out.textContent =
      "Cloud summary failed: " +
      (err && err.message ? err.message : String(err)) +
      " — your local results above are unaffected.";
    out.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Summarize findings with cloud AI";
  }
}

async function onDraftEmail() {
  if (!lastAnalysis) return;
  const btn = $("emailBtn");
  btn.disabled = true;
  btn.textContent = "Drafting…";
  try {
    // Only the extracted findings go to the cloud — never the raw contract.
    const { text, engine } = await generate(buildEmailPrompt(lastAnalysis), {
      kind: "email",
      privacy: "cloud",
      context: lastAnalysis,
    });
    setBadge($("emailBadge"), engine);
    const out = $("emailOutput");
    out.textContent = text;
    out.hidden = false;
  } catch (err) {
    const out = $("emailOutput");
    out.textContent =
      "Email draft failed: " + (err && err.message ? err.message : String(err));
    out.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Draft pushback email";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  refreshStatus();
  $("loadSample").addEventListener("click", () => {
    $("contractInput").value = SAMPLE_CONTRACT;
  });
  $("analyzeBtn").addEventListener("click", onAnalyze);
  $("cloudSummaryBtn").addEventListener("click", onCloudSummary);
  $("emailBtn").addEventListener("click", onDraftEmail);
});
