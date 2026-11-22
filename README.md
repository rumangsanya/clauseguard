# ClauseGuard — #BuildHybridAI 2026 (Web/Chrome track)

Plain-English contract risk checks for freelancers, built on **Firebase AI
Logic hybrid inference**: the confidential contract analysis runs on-device
(Gemini Nano) and never uploads; summaries run hybrid; only user-reviewed
findings reach the cloud for the negotiation-email draft.

See `../IDEA.md` for the concept and `../REQUIREMENTS.md` for the verified
hackathon requirements this project is built against.

## Run it locally (no build step)

```bash
cd app
python3 -m http.server 8000
# open http://localhost:8000 in Chrome
```

(Any static file server works. ES modules + CDN imports need http(s), not
`file://`, in some browsers.)

The app is wired to the real Firebase project **clauseguard-23269** with AI
Logic enabled, so generation routes through Firebase AI Logic. If Firebase is
unreachable (offline, or App Check not yet registered for the serving
origin), the app falls back to a clearly-labelled **local rule engine**
(deterministic keyword heuristic — not AI, runs locally) so the full UX can
still be exercised anywhere.

## Firebase AI Logic wiring (already done for clauseguard-23269)

1. ✅ Firebase project `clauseguard-23269` created; Web app registered; the
   real `firebaseConfig` is in `app/js/config.js`. (A web firebaseConfig is a
   public app identifier, not a secret.)
2. ✅ **AI Logic** enabled in the Firebase console via the free Gemini
   Developer API path — no billing account.
3. ⏳ **App Check** (required by AI Logic): the web app's attestation
   provider (reCAPTCHA Enterprise site key) still has to be registered in the
   console — see `../BLOCKERS.md`. Use a debug token locally — never commit
   it.
4. All generation routes through Firebase AI Logic —
   `ONLY_ON_DEVICE` for the contract analysis, `PREFER_ON_DEVICE` for the
   summary path, `PREFER_IN_CLOUD` for the email draft — and each result is
   badged from `response.inferenceSource`. There is no direct Prompt API
   generation path in this build; the browser's Prompt API is used for
   availability *detection* only (header status pill).

On-device path needs desktop Chrome ≥ 139 with Gemini Nano enabled
(`chrome://flags` → Prompt API / "Gemma 4 for Built-in AI", per the event FAQ).

## Structure

```
app/
  index.html        UI shell
  css/styles.css    styling
  js/config.js      Firebase config for clauseguard-23269 (public app id)
  js/firebase-ai.js Firebase AI Logic hybrid integration (CDN, lazy-loaded)
  js/ai-router.js   privacy-aware routing: Firebase AI Logic + local fallback
  js/prompts.js     single-turn prompt templates + JSON parsing
  js/mock.js        labelled local rule-engine fallback (heuristic, not AI)
  js/app.js         UI logic
```

## Disclosure

This project was designed and coded with the help of an AI coding agent, as
the #BuildHybridAI rules explicitly allow and encourage ("Build with any AI
coding tool or IDE you like…", Rules §6 / FAQ). The submitting entrant directs
the project and owns the submission. No third-party code is bundled beyond the
Firebase JS SDK, loaded from Google's CDN at runtime.

## Disclaimer

ClauseGuard is an educational aid. It is **not legal advice**.

## License

MIT — see `LICENSE`. (The hackathon prefers Apache-2.0 but accepts any
open-source license; swapping the file before submission is a one-step change.)
