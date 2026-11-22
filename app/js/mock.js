// ============================================================================
// ClauseGuard — MOCK ENGINE (local development only)
// ----------------------------------------------------------------------------
// *** THIS IS NOT AI. *** It is a deterministic keyword heuristic that returns
// canned, plausible output in the same shapes as the real engines, purely so
// the UI and flow can be developed and demoed on any machine — no Firebase
// project, no Gemini Nano, no network. The UI badges every mock result with
// "MOCK" so it can never be mistaken for a real model response. In the
// submitted build this is only a fallback for when Firebase AI Logic is
// unreachable — never the primary engine.
// ============================================================================

const RULES = [
  {
    pattern: /perpetual|irrevocable|assigns?\s+all|all\s+(intellectual\s+property|ip)\s+rights/i,
    title: "Perpetual IP assignment",
    severity: "high",
    plainEnglish:
      "You hand over all rights to everything you create for this client, forever — including drafts and work they don't use.",
    action:
      "Ask to limit the assignment to final deliverables, effective only after full payment.",
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
    pattern: /terminat\w+[^.]{0,100}(immediately|without\s+notice|sole\s+discretion|for\s+convenience)/i,
    title: "One-sided termination",
    severity: "medium",
    plainEnglish:
      "The client can end the contract at any time, possibly without paying for work already done.",
    action:
      "Ask for a notice period and payment for all work completed up to termination.",
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

/** Mock "analysis": keyword scan shaped exactly like the real JSON output. */
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
        "The mock engine found none of its known risk patterns. A real model review is still recommended before signing.",
      action: "Run the real hybrid analysis before relying on this result.",
    });
  }
  const order = { high: 0, medium: 1, low: 2 };
  clauses.sort((a, b) => order[a.severity] - order[b.severity]);
  return {
    summary:
      "[MOCK SUMMARY] This agreement engages the freelancer for project work. " +
      "The mock engine flagged " + clauses.length + " point(s) worth a second look, " +
      "listed below by severity. Connect Firebase AI Logic or open in a " +
      "Gemini Nano-capable Chrome for a real analysis.",
    clauses,
    questions: [
      "Can payment terms be shortened or split into milestones?",
      "Is the IP assignment limited to final, paid deliverables?",
      "Can liability be capped at the fees paid under this contract?",
    ],
  };
}

/** Mock "email": fills the flagged actions into a fixed template. */
export function mockEmail(analysis) {
  const points = (analysis.clauses || [])
    .filter((c) => c.severity === "high" || c.severity === "medium")
    .map((c, i) => `${i + 1}. ${c.title} — ${c.action}`)
    .join("\n");
  return (
    "[MOCK EMAIL — template output, not AI-generated]\n\n" +
    "Hi,\n\nThanks for sending the agreement over — I'm excited to get started. " +
    "Before signing, could we discuss a few points?\n\n" +
    (points || "1. General terms — happy to walk through them on a call.") +
    "\n\nHappy to jump on a short call this week to align. " +
    "Everything else looks good from my side.\n\nBest regards"
  );
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
  return "[MOCK] Connect Firebase AI Logic for real responses.";
}
