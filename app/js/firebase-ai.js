// ============================================================================
// ClauseGuard — Firebase AI Logic integration (the qualifying build path)
// ----------------------------------------------------------------------------
// All runtime AI inference in the submitted build goes through this module:
// Firebase AI Logic with hybrid inference.
//
//   - mode PREFER_ON_DEVICE: Gemini Nano runs on-device when Chrome supports
//     it, and the SDK falls back to a cloud Gemini model when it doesn't.
//   - mode ONLY_ON_DEVICE: used for the privacy-critical contract analysis —
//     throws instead of ever sending the raw contract to the cloud.
//   - mode PREFER_IN_CLOUD: used for the negotiation email draft, where only
//     user-reviewed findings (no raw contract text) are sent.
//
// `response.inferenceSource` ("ON_DEVICE" | "IN_CLOUD", Firebase JS SDK
// >= 12.5.0) tells us which engine actually answered, and the UI badges every
// result with it — visible proof of hybrid routing for users and judges.
//
// The SDK is loaded from the Firebase CDN with dynamic import() so that the
// unconfigured local-dev build never touches the network for these modules.
//
// The project (clauseguard-23269), AI Logic, and App Check are live: the
// web app is registered in the Firebase console with the Fraud Defense
// (reCAPTCHA Enterprise) provider, and App Check is initialized below —
// before getAI — so inference requests carry an attestation token.
// Inference from localhost may still be rejected by App Check enforcement;
// test the live path from a hosted origin. Never commit debug tokens.
// ============================================================================

import { appCheckSiteKey } from "./config.js";

const SDK_VERSION = "12.5.0"; // >= 12.5.0 required for response.inferenceSource
const CDN_BASE = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

let modelCache = {};
let appCheckReady = false;

async function loadSdk() {
  const [appModule, aiModule, appCheckModule] = await Promise.all([
    import(`${CDN_BASE}/firebase-app.js`),
    import(`${CDN_BASE}/firebase-ai.js`),
    import(`${CDN_BASE}/firebase-app-check.js`),
  ]);
  return { ...appModule, ...aiModule, ...appCheckModule };
}

/**
 * Returns (and caches) a GenerativeModel for the given InferenceMode name:
 * "PREFER_ON_DEVICE" | "ONLY_ON_DEVICE" | "PREFER_IN_CLOUD" | "ONLY_IN_CLOUD".
 */
async function getModel(firebaseConfig, modeName) {
  if (modelCache[modeName]) return modelCache[modeName];

  const sdk = await loadSdk();
  const app = sdk.initializeApp(firebaseConfig);

  // App Check must be initialized BEFORE AI Logic so that inference
  // requests carry an attestation token (Fraud Defense / reCAPTCHA
  // Enterprise provider; the site key is a public identifier, see
  // js/config.js). Guarded so repeat getModel() calls don't re-init.
  if (!appCheckReady) {
    sdk.initializeAppCheck(app, {
      provider: new sdk.ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckReady = true;
  }

  const ai = sdk.getAI(app, { backend: new sdk.GoogleAIBackend() });

  const model = sdk.getGenerativeModel(ai, {
    mode: sdk.InferenceMode[modeName],
    // inCloudParams: { model: "gemini-3.5-flash-lite" }, // optional override;
    // the SDK default cloud fallback is gemini-3.5-flash-lite (SDK >= 13).
  });
  modelCache[modeName] = model;
  return model;
}

/**
 * Generate text through Firebase AI Logic.
 * Returns { text, source } where source is "ON_DEVICE" or "IN_CLOUD".
 */
export async function generateWithFirebase(firebaseConfig, prompt, modeName) {
  const model = await getModel(firebaseConfig, modeName);
  const result = await model.generateContent(prompt);
  return {
    text: result.response.text(),
    source: result.response.inferenceSource || "IN_CLOUD",
  };
}
