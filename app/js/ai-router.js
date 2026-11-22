// ============================================================================
// ClauseGuard — AI router
// ----------------------------------------------------------------------------
// One generate() call, one real inference path:
//
//   Firebase AI Logic (the qualifying, submitted-build path).
//     The privacy level of each feature maps to a Firebase InferenceMode:
//       "device-only" -> ONLY_ON_DEVICE   (raw contract: never leaves device)
//       "hybrid"      -> PREFER_ON_DEVICE (on-device, cloud fallback)
//       "cloud"       -> PREFER_IN_CLOUD  (email draft: findings only)
//     The response's inferenceSource tells us which engine answered
//     (Gemini Nano on-device via Firebase AI Logic, or a cloud Gemini
//     model) — hybrid inference is provided BY Firebase AI Logic itself.
//
//   LOCAL RULE-ENGINE fallback (NOT a model, NOT an API).
//     If Firebase AI Logic is unreachable (offline, App Check not yet
//     registered for this origin, quota, …), generate() falls back to the
//     deterministic local keyword heuristic in js/mock.js. It runs entirely
//     on-device, sends nothing anywhere, and every result it produces is
//     labelled "local rule engine (not AI)" in the UI so it can never be
//     mistaken for a model response.
//
// There is deliberately NO direct Chrome Prompt API generation path in this
// build: the #BuildHybridAI rules require all app inference to go through
// Firebase AI Logic ("don't call other model APIs directly"). The only
// Prompt-API surface left is availability *detection* (detectOnDevice),
// which performs no inference and only drives the status pill in the header.
//
// generate() returns { text, engine, via } where engine is
// "ON_DEVICE" | "IN_CLOUD" | "MOCK".
// ============================================================================

import { firebaseConfig, isFirebaseConfigured } from "./config.js?v=20261122-2";
import { generateWithFirebase } from "./firebase-ai.js?v=20261122-2";
import { mockGenerate } from "./mock.js?v=20261122-2";

const PRIVACY_TO_FIREBASE_MODE = {
  "device-only": "ONLY_ON_DEVICE",
  hybrid: "PREFER_ON_DEVICE",
  cloud: "PREFER_IN_CLOUD",
};

function getLanguageModelApi() {
  // Chrome Prompt API: modern name is the global `LanguageModel`;
  // earlier builds exposed it as `window.ai.languageModel`.
  // DETECTION ONLY — this build never creates a session or prompts it.
  if (typeof LanguageModel !== "undefined") return LanguageModel;
  if (typeof window !== "undefined" && window.ai && window.ai.languageModel) {
    return window.ai.languageModel;
  }
  return null;
}

let availabilityPromise = null;

/**
 * Detect on-device Gemini Nano availability in this browser.
 * Returns { status: "available"|"downloadable"|"downloading"|"unavailable"|"unsupported", available: boolean }
 * Detection only: no session is created and no inference is performed here.
 */
export function detectOnDevice() {
  if (!availabilityPromise) {
    availabilityPromise = (async () => {
      const LM = getLanguageModelApi();
      if (!LM) return { status: "unsupported", available: false };
      try {
        const status = await LM.availability();
        return {
          status,
          available:
            status === "available" ||
            status === "downloadable" ||
            status === "downloading",
        };
      } catch {
        return { status: "unavailable", available: false };
      }
    })();
  }
  return availabilityPromise;
}

/**
 * Generate text with privacy-aware routing.
 * @param {string} prompt
 * @param {{ kind?: "analyze"|"email"|"summary"|"generic",
 *           privacy?: "device-only"|"hybrid"|"cloud",
 *           context?: object }} options
 */
export async function generate(prompt, options = {}) {
  const { kind = "generic", privacy = "hybrid", context = null } = options;

  // Firebase AI Logic — the only inference path in the submitted build.
  if (isFirebaseConfigured()) {
    const mode = PRIVACY_TO_FIREBASE_MODE[privacy] || "PREFER_ON_DEVICE";
    try {
      const { text, source } = await generateWithFirebase(
        firebaseConfig,
        prompt,
        mode
      );
      return { text, engine: source, via: "firebase-ai-logic" };
    } catch {
      // Firebase unreachable (offline, App Check pending for this origin,
      // quota…). Fall through to the labelled local rule engine — for the
      // "device-only" analysis this is still privacy-safe: the fallback is a
      // local heuristic and the contract text never leaves the device.
    }
  }

  // Local rule-engine fallback — deterministic heuristic, always labelled.
  return { text: mockGenerate(prompt, kind, context), engine: "MOCK", via: "mock" };
}

/** Which engine would a generate() call use right now? (For the UI header.) */
export async function currentMode() {
  if (isFirebaseConfigured()) {
    return { label: "Firebase AI Logic — hybrid", tier: 1 };
  }
  return { label: "Local rule engine — not AI (Firebase not configured)", tier: 3 };
}
