// ============================================================================
// ClauseGuard — LOCAL FALLBACK ENGINE (rule-based keyword heuristic)
// ----------------------------------------------------------------------------
// *** THIS IS NOT AI. *** It is a deterministic keyword heuristic that returns
// canned, plausible output in the same shapes as the real engines, purely so
// the UI and flow can be developed and demoed on any machine — no Firebase
// project, no Gemini Nano, no network. The UI labels every result it produces
// "local rule engine (not AI)" so it can never be mistaken for a real model
// response. In the submitted build this is the fallback for when Firebase AI
// Logic / Gemini Nano is unavailable — it still runs entirely on the device,
// so the raw contract text never leaves the device.
// ============================================================================

const RULES = [
  {
    // Catches: "in perpetuity", "perpetual", "irrevocable", "assigns all",
    // "assigned ... in perpetuity", and a bare "All intellectual property ..."
    // assignment (the demo contract assigns IP "in perpetuity" without ever
    // using the words "perpetual" or "rights").
    pattern:
      /in\s+perpetuity|perpetual|irrevocab\w+|assigns?\s+all|assign\w*\s+[^.]{0,60}perpetu\w+|all\s+(intellectual\s+property|ip)\b/i,
    title: "Perpetual IP assignment",
    severity: "high",
    plainEnglish:
      "You hand over all rights to everything you create for this client, forever — including drafts, unused work, and even your pre-existing tools, libraries and know-how that you owned before this client.",
    action:
      "Ask to limit the assignment to final deliverables only, exclude your pre-existing tools and know-how, and make it effective only after full payment.",
  },
  {
    pattern: /net\s*-?\s*90|ninety\s*\(?90\)?\s*days|within\s+90\s+days/i,
    title: "Net-90 payment terms",
    severity: "high",
    plainEnglish:
      "You get paid up to 90 days after invoicing — you finance the client's project for three months.",
    action: "Ask for net-14 or net-30, or split into milestone payments.",
  },
  {
    pattern: /indemnif\w+[^.]{0,120}(unlimited|any\s+and\s+all|whatsoever)/i,
    title: "Unlimited indemnity",
    severity: "high",
    plainEnglish:
      "You agree to cover the client's losses without a cap — potentially far more than the project is worth.",
    action: "Ask to cap liability at the total fees paid under the contract.",
  },
  {
    pattern: /non-?compete|non-?solicit|shall\s+not\s+provide\s+services/i,
    title: "Non-compete / non-solicit",
    severity: "medium",
    plainEnglish:
      "You may be blocked from working for the client's competitors after this project ends.",
    action:
      "Ask to narrow the scope (named competitors only) and shorten the period, or remove it.",
  },
  {
    // Catches one-sided wording in its common forms: "terminate ... at any
    // time / for any reason / with immediate effect" (the demo contract uses
    // exactly these — not "immediately"), plus a contractor lock-in clause
    // ("may not terminate before the end of the ... term").
    pattern:
      /terminat\w+[^.]{0,140}(immediat\w+|without\s+notice|sole\s+discretion|for\s+convenience|at\s+any\s+time|for\s+any\s+reason)|may\s+not\s+terminate\s+before/i,
    title: "One-sided termination",
    severity: "medium",
    plainEnglish:
      "The client can end the contract at any time, for any reason, with immediate effect — while you are locked in and may not leave before the end of the term. The exit right runs one way only.",
    action:
      "Ask for a mutual termination right with a notice period, and payment for all work completed up to termination.",
  },
  {
    pattern: /confidential/i,
    title: "Confidentiality obligations",
    severity: "low",
    plainEnglish:
      "You must keep the client's information confidential — standard, but check how long it lasts and what it covers.",
    action: "Confirm the obligation is mutual and time-limited (e.g. 2–3 years).",
  },
  {
    pattern: /governing\s+law|laws\s+of\s+the\s+state|jurisdiction/i,
    title: "Governing law",
    severity: "low",
    plainEnglish:
      "Disputes are handled under the client's local law and courts, which may be far from you.",
    action: "Note the jurisdiction; ask for your local law or arbitration if the amounts justify it.",
  },
];

function sentenceAround(text, matchIndex) {
  const start = Math.max(text.lastIndexOf(".", matchIndex), text.lastIndexOf("\n", matchIndex)) + 1;
  let end = text.indexOf(".", matchIndex);
  if (end === -1) end = Math.min(text.length, matchIndex + 160);
  return text.slice(start, end + 1).trim().slice(0, 220);
}

/** Local rule-engine "analysis": keyword scan shaped like the real JSON. */
export function mockAnalyze(contractText) {
  const clauses = [];
  for (const rule of RULES) {
    const m = contractText.match(rule.pattern);
    if (m) {
      clauses.push({
        quote: sentenceAround(contractText, m.index),
        title: rule.title,
        severity: rule.severity,
        plainEnglish: rule.plainEnglish,
        action: rule.action,
      });
    }
  }
  if (clauses.length === 0) {
    clauses.push({
      quote: "(no classic risk patterns found)",
      title: "No obvious red flags",
      severity: "low",
      plainEnglish:
        "The local rule engine found none of its known risk patterns. A real model review is still recommended before signing.",
      action: "Run the real hybrid analysis before relying on this result.",
    });
  }
  const order = { high: 0, medium: 1, low: 2 };
  clauses.sort((a, b) => order[a.severity] - order[b.severity]);
  return {
    summary:
      "Summary — local rule engine (not AI). This agreement engages the freelancer for project work. " +
      "The local rule engine flagged " + clauses.length + " point(s) worth a second look, " +
      "listed below by severity. Open in a Gemini Nano-capable Chrome for a " +
      "real on-device AI analysis.",
    clauses,
    questions: [
      "Can payment terms be shortened or split into milestones?",
      "Is the IP assignment limited to final, paid deliverables?",
      "Can liability be capped at the fees paid under this contract?",
    ],
  };
}

/** Local "email": fills the flagged actions into a fixed template. */
export function mockEmail(analysis) {
  const points = (analysis.clauses || [])
    .filter((c) => c.severity === "high" || c.severity === "medium")
    .map((c, i) => `${i + 1}. ${c.title} — ${c.action}`)
    .join("\n");
  return (
    "[TEMPLATE EMAIL — local rule engine, not AI-generated]\n\n" +
    "Hi,\n\nThanks for sending the agreement over — I'm excited to get started. " +
    "Before signing, could we discuss a few points?\n\n" +
    (points || "1. General terms — happy to walk through them on a call.") +
    "\n\nHappy to jump on a short call this week to align. " +
    "Everything else looks good from my side.\n\nBest regards"
  );
}

/**
 * Local "summary": deterministic recap of the extracted findings, used when
 * the optional cloud-AI summary step cannot reach Firebase AI Logic. Built
 * ONLY from the findings (never the raw contract), like the real prompt.
 */
export function mockSummary(analysis) {
  const clauses = analysis.clauses || [];
  const highs = clauses.filter((c) => c.severity === "high");
  const meds = clauses.filter((c) => c.severity === "medium");
  const names = (arr) => arr.map((c) => c.title.toLowerCase()).join(", ");
  let out =
    "Local summary — produced by the local rule engine (not AI) because " +
    "cloud AI was unavailable. ";
  if (clauses.length === 0) {
    return out + "No risk findings were extracted, so there is nothing to summarize.";
  }
  out +=
    "The analysis flagged " + clauses.length + " point(s) in this agreement";
  if (highs.length) out += ", including " + highs.length + " high-severity: " + names(highs);
  if (meds.length) out += "; plus medium-severity: " + names(meds);
  out +=
    ". Before signing, the freelancer should raise these points with the " +
    "client and ask for the changes suggested on each card.";
  return out;
}

/** Router entry point: returns a STRING, like the real engines do. */
export function mockGenerate(prompt, kind, context) {
  if (kind === "analyze") {
    // The contract text is embedded in the prompt after the CONTRACT TEXT marker.
    const marker = "CONTRACT TEXT:";
    const idx = prompt.indexOf(marker);
    const contract = idx === -1 ? prompt : prompt.slice(idx + marker.length);
    return JSON.stringify(mockAnalyze(contract));
  }
  if (kind === "email") {
    return mockEmail(context || { clauses: [] });
  }
  if (kind === "summary") {
    return mockSummary(context || { clauses: [] });
  }
  return "[Local rule engine — not AI] Connect Firebase AI Logic for real responses.";
}
