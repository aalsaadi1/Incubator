# Praxo macOS App — Build Plan (for Claude Code or any coding agent)

> Working brief for building the native Praxo client in this directory with
> Xcode. Read `PRAXO.md` (wiring details) and `../docs/praxo/API.md`
> (backend contract) alongside this.

## Context in 30 seconds

Praxo teaches by doing: course cards → survey → personalized step plan → an
AI voice teacher that sees the learner's screen and verifies each step's
**gate** before unlocking the next. The backend (Next.js, in the repo root)
is **built, deployed separately, and its API contract is frozen** — see
`../docs/praxo/API.md`. A browser client already exists at `/praxo` on the
backend; this directory is the *native* client, which exists to do what the
browser can't: always-on screen awareness and pointing at the learner's real
screen with a cursor overlay.

The codebase is a vendored copy of the MIT-licensed "clicky" app (menu-bar
teacher with screen capture + cursor pointing; original target name
`leanring-buddy` [sic]) plus a Praxo layer in `leanring-buddy/Praxo/`:

| File | Status |
|---|---|
| `PraxoModels.swift` | API models — matches docs/praxo/API.md |
| `PraxoAPIClient.swift` | Backend client incl. session end |
| `PraxoRealtimeTeacher.swift` | OpenAI Realtime voice session (WebSocket) + tool dispatch |
| `PraxoCourseLibraryView.swift` | Course cards + settings sheet hookup |
| `PraxoSurveyView.swift` / `PraxoPlanView.swift` | Survey flow / gated plan + session controls |
| `PraxoSettingsView.swift` | Server URL + device token UI (writes UserDefaults read by `PraxoConfig`) |
| `PraxoWindowManager.swift` | Opens the library window |

⚠️ **None of the Swift in `Praxo/` has ever been compiled** — it was written
off-Mac. Expect and fix small errors on first build; that is Phase 0, not a
sign something is wrong.

## Phase 0 — Compile (do this first)

1. Open `leanring-buddy.xcodeproj`. Add the `Praxo/` folder to the
   `leanring-buddy` target (it is not in `project.pbxproj` yet).
2. Build. Fix errors until green. Known-suspect areas, in likely order:
   - `PraxoRealtimeTeacher.startMicrophone()` — the `AVAudioConverter`
     usage and format wiring (24kHz PCM16 in, float playback out).
   - Realtime API event names (`response.output_audio.delta`,
     `response.function_call_arguments.done`) — verify against current
     OpenAI Realtime docs; the web client in
     `../src/app/praxo/_lib/realtime.ts` is the working reference to match.
   - SwiftUI availability (`.background.secondary`, `foregroundStyle`) vs
     the project's macOS 14.2 deployment target.
3. Run. The library window should open, show the settings sheet (first run),
   and after entering the server URL + device token, load the course cards
   from the deployed backend. `PraxoSettingsView` has a "Test connection"
   button — make it pass.

## Phase 1 — Wire into the clicky shell

1. Entry point: call `PraxoWindowManager.shared.showLibrary()` from
   `CompanionAppDelegate.applicationDidFinishLaunching` (library-first), and
   add a "Courses" button in `CompanionPanelView`.
2. **Pointing bridge**: `PraxoRealtimeTeacher` posts `.praxoPointAt`
   notifications (`x`,`y` as 0–1 fractions of the primary screen, `label`).
   In `CompanionManager` — which owns the cursor overlay — observe this and
   reuse the existing `[POINT:x,y:label]` code path (convert fractions →
   pixels; extend to multi-monitor later).
3. Confirm clicky's existing permission onboarding requests Microphone and
   Screen Recording before the first Praxo session needs them.

## Phase 2 — Prove the loop end to end

Acceptance test (the only definition of done for this phase): pick the ads
course → answer the survey → plan appears → start session → teacher speaks
and hears you → ask "what am I looking at?" → it captures your screen and
answers → it points at something via the cursor overlay → tell it you set up
your ad account with the account on screen → it verifies and step 1 flips to
PASSED, step 2 unlocks. Check the backend admin (`/praxo/admin` on the
deployed site) shows the evidence and session row.

Latency/robustness follow-ups (only after the loop works):
- Consider migrating the Realtime transport from WebSocket to WebRTC
  (echo cancellation + lower latency); mirror `realtime.ts`.
- Barge-in: stop `playerNode` playback when the user starts talking
  (listen for `input_audio_buffer.speech_started`).

## Phase 3 — Make it Praxo

1. Rename product: display name "Praxo", new bundle identifier, app icon
   (replace clicky's icon set). Note: changing the bundle id / signing
   resets TCC permissions — users re-grant, that's expected.
2. Remove or hide the legacy clicky voice chain UI (AssemblyAI/Claude/
   ElevenLabs providers, `workerBaseURL` paths in `CompanionManager`) —
   keep the screen-capture and cursor-overlay code, which Praxo uses.
   Prefer deleting dead UI over deleting shared utilities.
3. Strip unused assets (onboarding video/screenshots, `ff.mp3`) **and**
   their `project.pbxproj` resource references together.

## Phase 4 — Ship

1. Developer ID signing + notarization; adapt `scripts/release.sh` and the
   Sparkle `appcast.xml` for Praxo's name and your update URL.
2. Build the DMG; test on a second Mac (or fresh user account) with clean
   permissions.

## Rules

0. **Build in Xcode (Cmd+R), never `xcodebuild` from the terminal** — per the
   upstream `CLAUDE.md`, terminal builds invalidate TCC permissions (screen
   recording, accessibility) and force re-granting. The human presses Cmd+R
   and shares errors; the agent edits code. Also from upstream: do NOT rename
   the `leanring-buddy` directory/scheme (the typo is intentional legacy —
   Phase 3 renames only display name, bundle id, and icon), and do not fix
   the known non-blocking Swift 6 concurrency warnings.
1. **Never bypass gates**: step completion only via
   `POST /api/praxo/steps/:id` with `action: complete` + evidence.
2. **The backend contract is frozen** (`../docs/praxo/API.md`). Don't edit
   files outside `praxo-macos/` — backend changes happen in a separate
   workflow. If the contract seems wrong, flag it, don't fork it.
3. No secrets in code or commits: server URL and device token live in
   UserDefaults via `PraxoSettingsView`; the OpenAI key never touches this
   app (ephemeral tokens only).
4. Keep upstream attribution: `LICENSE` (MIT, © Farza) stays.
5. Commit in small steps per phase; keep `PRAXO.md`'s status section updated
   as gaps close.
