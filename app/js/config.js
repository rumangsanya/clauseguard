// ============================================================================
// ClauseGuard — Firebase configuration
// ----------------------------------------------------------------------------
// Real web-app config for the Firebase project "clauseguard-23269"
// (Firebase console → Project settings → "Your apps" → Web app → SDK setup).
//
// A web app's firebaseConfig is a public app identifier, not a secret — it
// ships in every client build. Access is governed by Firebase security
// rules and App Check, never by hiding this object.
//
// With a real config present, ALL runtime inference routes through Firebase
// AI Logic (see js/firebase-ai.js), as the #BuildHybridAI rules require.
// The only fallback is the clearly-labelled local MOCK engine (js/mock.js),
// used when Firebase is unreachable — it is a deterministic heuristic, not a
// model API, and it never leaves the device.
// ============================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyADmkJhas7mViWSjh6djM56A7AMCvddSmM",
  authDomain: "clauseguard-23269.firebaseapp.com",
  projectId: "clauseguard-23269",
  storageBucket: "clauseguard-23269.firebasestorage.app",
  messagingSenderId: "489143435524",
  appId: "1:489143435524:web:c2619843e55ba0e3329051",
};

/** True only when every value is present and not a placeholder. */
export function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every(
    (v) => typeof v === "string" && v.length > 0 && v !== "REPLACE_ME"
  );
}

// Optional: App Check site key (reCAPTCHA Enterprise) for the Firebase project.
// Firebase AI Logic requires App Check; the attestation provider still has to
// be registered in the Firebase console (see BLOCKERS.md) before this can be
// filled in. For local development use an App Check DEBUG token instead.
// **Never commit a debug token.**
// export const appCheckSiteKey = "";
