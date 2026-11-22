// ============================================================================
// ClauseGuard — prompt templates
// ----------------------------------------------------------------------------
// On-device inference (Chrome Prompt API / Gemini Nano) supports SINGLE-TURN
// text generation only, so every prompt here is a self-contained single-turn
// instruction. The analysis prompt demands JSON-only output; parseAnalysis()
// tolerates code fences and surrounding prose from chattier cloud models.
// ============================================================================

// Gemini Nano has a limited context window — keep the contract excerpt bounded.
const MAX_CONTRACT_CHARS = 12000;

export function buildAnalyzePrompt(contractText) {
  const excerpt = contractText.slice(0, MAX_CONTRACT_CHARS);
  return [
    "You are a contract risk assistant for a freelancer. Analyze the contract",
    "text below and identify clauses that are risky or unusual for the",
    "freelancer. Return ONLY a JSON object (no markdown, no commentary) with",
    "exactly this shape:",
    "{",
    '  "summary": "3-5 sentence plain-English summary of the deal",',
    '  "clauses": [',
    '    { "quote": "short verbatim excerpt of the clause",',
    '      "title": "short clause name",',
    '      "severity": "high" | "medium" | "low",',
    '      "plainEnglish": "what this means in plain English",',
    '      "action": "what the freelancer should ask or change" }',
    "  ],",
    '  "questions": ["question to ask the client before signing", "..."]',
    "}",
    "Focus on: payment terms, intellectual property assignment, indemnity and",
    "liability, termination, non-compete / non-solicit, confidentiality, and",
    "governing law. If a category is missing from the contract, do not invent",
    "a clause for it.",
    "",
    "CONTRACT TEXT:",
    '"""',
    excerpt,
    '"""',
  ].join("\n");
}

export function buildEmailPrompt(analysis) {
  const findings = (analysis.clauses || [])
    .map(
      (c, i) =>
        `${i + 1}. [${(c.severity || "medium").toUpperCase()}] ${c.title}: ${c.action}`
    )
    .join("\n");
  return [
    "Write a short, polite but firm email from a freelancer to their client.",
    "The freelancer is happy to start the work but wants to discuss a few",
    "contract points first. Ask about each point below, briefly and",
    "professionally, and suggest discussing them on a short call. Do not use",
    "placeholders like [Name]; sign off as \"Best regards\" with no name.",
    "Keep it under 200 words.",
    "",
    "POINTS TO RAISE:",
    findings || "(none)",
  ].join("\n");
}

/**
 * Optional step: summarize the EXTRACTED FINDINGS with the cloud model.
 * Privacy: this prompt is built only from the analysis result (clause
 * titles, severities, explanations, suggested asks, questions) — the raw
 * contract text is never included, mirroring buildEmailPrompt.
 */
export function buildSummaryPrompt(analysis) {
  const findings = (analysis.clauses || [])
    .map(
      (c, i) =>
        `${i + 1}. [${(c.severity || "medium").toUpperCase()}] ${c.title}: ` +
        `${c.plainEnglish || ""} Suggested ask: ${c.action || ""}`
    )
    .join("\n");
  const questions = (analysis.questions || []).map((q) => "- " + q).join("\n");
  return [
    "Summarize the contract risk findings below for a freelancer in 3-4",
    "short, plain-English sentences. Say what kind of deal this looks like,",
    "name the most serious risks first, and end with what the freelancer",
    "should discuss with the client before signing. Base the summary ONLY",
    "on these findings — do not invent clauses or facts that are not listed.",
    "",
    "FINDINGS:",
    findings || "(none)",
    "",
    "QUESTIONS TO ASK THE CLIENT:",
    questions || "(none)",
  ].join("\n");
}

/** Extract and parse the first JSON object from a model response. */
export function parseAnalysis(text) {
  if (!text) throw new Error("Empty model response.");
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return JSON.");
  }
  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(parsed.clauses)) parsed.clauses = [];
  if (!Array.isArray(parsed.questions)) parsed.questions = [];
  if (typeof parsed.summary !== "string") parsed.summary = "";
  return parsed;
}
