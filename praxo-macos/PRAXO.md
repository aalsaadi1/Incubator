# Praxo macOS App

This directory is the Praxo client: a vendored copy of
[farzaa/clicky](https://github.com/farzaa/clicky) (MIT, © 2026 Farza — see
`LICENSE`) plus a Praxo layer in `leanring-buddy/Praxo/`. Clicky provides the
menu-bar shell, screen capture, cursor overlay, and permission scaffolding;
the Praxo layer adds courses, surveys, plans, and the GPT Realtime voice
teacher. See `docs/praxo/PLAN.md` at the repo root for the full plan.

## What's in the Praxo layer

| File | Purpose |
|---|---|
| `Praxo/PraxoModels.swift` | Codable models for the backend API |
| `Praxo/PraxoAPIClient.swift` | Backend client (courses, plans, steps, KB, tokens) |
| `Praxo/PraxoRealtimeTeacher.swift` | OpenAI Realtime voice session + tool dispatch (`look_at_screen`, `point_at`, `kb_search`, `complete_step`, `flag_stuck`) |
| `Praxo/PraxoCourseLibraryView.swift` | Course cards grid |
| `Praxo/PraxoSurveyView.swift` | Survey → plan generation flow |
| `Praxo/PraxoPlanView.swift` | Step plan with gates + session start/stop |
| `Praxo/PraxoWindowManager.swift` | Opens the library window from the menu-bar app |

The clicky voice chain (AssemblyAI → Claude → ElevenLabs via Cloudflare
Worker, `worker/`) is left intact but unused by Praxo sessions — the Realtime
teacher replaces it. `CompanionManager.workerBaseURL` is still the upstream
placeholder; ignore it unless you want the legacy pipeline.

## Wiring it up (10 minutes in Xcode)

1. Open `leanring-buddy.xcodeproj` (macOS 14.2+, Xcode 15+).
2. Drag the `Praxo/` folder into the `leanring-buddy` group and check
   "Add to target: leanring-buddy". (New files aren't in `project.pbxproj`
   yet — this step registers them.)
3. Add an entry point. Simplest: in `CompanionAppDelegate.applicationDidFinishLaunching`,
   add `PraxoWindowManager.shared.showLibrary()`. Better: add a "Courses"
   button to `CompanionPanelView` that calls the same.
4. Bridge pointing: the teacher posts `.praxoPointAt` notifications with
   normalized coordinates (0–1) and a label. In `CompanionManager` (which owns
   the cursor overlay), observe it and reuse the same code path as the
   `[POINT:x,y:label]` tag handling, converting normalized → pixel coordinates
   for the cursor's screen.
5. Configure the app (Terminal, once):
   ```bash
   defaults write <your-bundle-id> PraxoBackendURL "http://localhost:3000"
   defaults write <your-bundle-id> PraxoDeviceToken "<same value as backend PRAXO_DEVICE_TOKEN>"
   ```
6. Run. Grant Microphone + Screen Recording when prompted (clicky's existing
   onboarding handles the prompts).

## Backend setup (repo root)

```bash
npm install
npm run db:push          # adds the praxo_* tables
npm run praxo:seed       # seeds the "Run Your First Ad Campaign" course
npm run dev
```

Required env (`.env`): `DATABASE_URL`, `OPENAI_API_KEY`, plus
`PRAXO_DEVICE_TOKEN` (any long random string; must match the app's default).
Optional: `PRAXO_REALTIME_MODEL` (default `gpt-realtime`),
`PRAXO_TEACHER_VOICE` (default `marin`).

## Status / known gaps

- **This code has not been compiled** — it was written off-Mac. Expect small
  fixes on first build (SwiftUI API availability, the audio converter path in
  `PraxoRealtimeTeacher`, Realtime event names against the current API docs).
- Realtime transport is **WebSocket**; migrating to WebRTC (lower latency,
  better echo cancellation) is an M2 refinement.
- `point_at` normalized coordinates assume the primary screen until the
  bridge in step 4 handles multi-monitor.
- Auth is the M0 shared device token + per-install user key; real accounts
  are M4 (see plan).
- Session cost tracking (`PraxoSession.costCents`) has a column but no
  usage-event wiring yet.
