# Praxo macOS App V2 — Clean Rebuild Spec

This replaces the clicky-vendored approach in `praxo-macos/`. V2 is a fresh,
Praxo-first Xcode project built to this spec. The old directory stays in the
repo as a **parts bin and reference only** until Phase 5 completes, then may
be deleted (keep its `LICENSE` attribution wherever code was ported).

**What is NOT being rebuilt:** the backend, web app, course content, and the
API contract (`docs/praxo/API.md`) are done, tested, and frozen. V2 is a new
client for the same brain. Hard-won lessons already encoded there — notably:
clients MUST send `sessionUpdateEvent` verbatim the moment the Realtime
connection opens, or the teacher joins unconfigured.

---

## 1. Product & user flow (screen by screen)

Praxo teaches by doing: pick a course → short survey → personalized gated
plan → a voice teacher who watches your screen and verifies each step.

**App shape (V2 decision):** a normal macOS **windowed app with a dock
icon** — NOT menu-bar-only. One main window; one floating session HUD; one
transparent overlay for the pointing cursor. This kills most of V1's
complexity: no NSStatusItem panels, no push-to-talk hotkeys, no transient
cursor modes.

### Screens

1. **Onboarding** (first run only, re-runnable from Settings)
   1. Welcome — "Praxo teaches by doing. Pick a course, answer a few
      questions, and your teacher coaches you through the real thing —
      right on your screen." One Continue button.
   2. Connect — server URL + device token form with Test Connection
      (prefilled from build-time defaults; auto-skipped when they work).
   3. Permissions — Microphone, then Screen Recording. Each: one plain
      sentence on why the teacher needs it → system prompt → live status
      check. Handle the macOS rule that Screen Recording grant requires an
      app relaunch (offer a Relaunch button).
   4. Consent — "During sessions, your voice and screen are sent to OpenAI
      and the Praxo server to power your teacher. Nothing is captured
      outside sessions." Must be affirmatively accepted once (UserDefaults).
2. **Library** — course cards grid (emoji, title, description, Start /
   Continue with step progress). Settings gear in the toolbar.
3. **Survey** — one question per screen, progress "3/6", single-choice
   buttons advance immediately; text questions use a text area + Next.
   Submitting shows "Your teacher is building your plan…" (~10s spinner).
4. **Plan** — course title, ordered steps: ✅ passed / 👉 current (expanded:
   instructions + amber "Done when: <gate>") / 🔒 locked. Primary button:
   ▶ Start session. When plan status is COMPLETED: celebration banner
   ("🎉 Course complete — you shipped the real thing"), no session button.
5. **Session HUD** — small floating always-on-top panel (not the main
   window) shown only during a live session: status dot, live caption line
   of the teacher's speech, current step title, Mute, End. The learner
   works in OTHER apps while this floats.
6. **Cursor overlay** — full-screen transparent, click-through panel that
   appears ONLY while pointing: an animated marker + label at the target,
   auto-fades after a few seconds. No persistent companion cursor (V1's
   always-on buddy cursor is cut — it was clicky's identity, not Praxo's).
7. **48h check-in** — when the "checkin" step becomes CURRENT, schedule a
   local notification for +48h ("Your campaign has two days of data —
   review it with your teacher"); clicking opens the plan. Cancel if the
   step passes first.

## 2. Design system (small, strict)

**Source of truth: `docs/praxo/DESIGN_PLAYBOOK.md`** — pure black,
near-white Inter type, glassy white-alpha surfaces, monochrome, rounded-full
buttons, calm fade-up motion. The playbook's SwiftUI translation table maps
every web token to its Mac equivalent.

One file, `PraxoDesign.swift`, tokens only — every view uses tokens, no
inline colors/sizes anywhere:

- **Colors** (from the playbook): background `#000000`, surface
  `white.opacity(0.10)` (hover `0.16`), border `white.opacity(0.10)`,
  text primary `#FAFAFA`, text secondary `= primary at 60%`. Monochrome
  discipline: color only for semantic state — success `#4ADE80`, warning
  `#FBBF24`, danger `#F87171` — never decoration. Dark-only.
- **Type**: Inter (bundled; SF Pro fallback). Sizes: title 28 (weight
  regular, tracking -0.02em), heading 20 semibold, body 14, caption 12.
  No other sizes.
- **Buttons**: capsule (rounded-full). Primary = white-80% background →
  white on hover, black text. Secondary = surface fill + 1px border,
  translucent-material feel.
- **Motion**: FadeUp on appear — opacity 0→1, y +24→0, 0.6s,
  `timingCurve(0.22, 1, 0.36, 1)`, staggered delays. Nothing else animates
  except the pointer overlay.
- **Spacing scale**: 4 / 8 / 12 / 16 / 24 / 32. **Corner radius**: 16
  (cards), capsule (controls). One shadow style for floating panels.
- **Components** (each one small view): `CourseCard`, `PrimaryButton`,
  `SecondaryButton`, `StepRow`, `HUDPanel`, `OnboardingPage`. Nothing else
  until needed.
- Every interactive element shows a pointer cursor on hover.

The web app (`/praxo`) and future landing page follow the playbook
directly (its React components verbatim); restyling the current web app
from slate/indigo to the playbook's black monochrome is a follow-up task
on the web side, not part of the Mac rebuild.

## 3. Clicky (heyclicky) integration policy

V1 vendored all of clicky; V2 does the opposite. **Fresh app; port only
two capabilities, by reading the reference and rewriting minimal versions:**

| Capability | Reference (old praxo-macos/) | V2 policy |
|---|---|---|
| Multi-screen capture | `CompanionScreenCaptureUtility.swift` (~130 lines) | Port nearly as-is; add downscale to ≤1280px JPEG ~0.7 before any network send |
| Pointing overlay | `OverlayWindow.swift` (~880 lines) | Do NOT port wholesale. Write a minimal `PointerOverlay` (~150 lines): transparent borderless NSPanel, `.canJoinAllSpaces`, non-activating, ignores mouse; SwiftUI marker (pulse ring + dot + label) animated to a point; multi-monitor mapping only |
| Permission flows | `WindowPositionManager.swift` | Read for the Screen Recording relaunch dance + preflight checks; reimplement simply |

Everything else — menu bar panel, dictation, AssemblyAI/Claude/ElevenLabs
chain, PostHog analytics, design system, onboarding video — is NOT carried
over. Attribution: clicky is MIT; keep a `THIRD_PARTY.md` crediting
farzaa/clicky for the ported capture/overlay/permission patterns.

## 4. Architecture

~12 focused files in a fresh Xcode project `praxo-app/Praxo.xcodeproj`,
target "Praxo", **bundle id `com.praxo.mac` fixed on day one** with
automatic signing under one team — never changes again (this is the V1
permissions-flakiness fix). Deployment target macOS 14.2.

```
Praxo/
  PraxoApp.swift            app entry: WindowGroup (main) + onboarding gate
  PraxoDesign.swift         design tokens + core components
  Models.swift              Codable API models (port from old Praxo/PraxoModels.swift — it was correct)
  APIClient.swift           backend client (port PraxoAPIClient.swift — correct, incl. endSession)
  AppState.swift            @Observable root state: config, courses, plans, route
  OnboardingView.swift      the 4-screen flow
  LibraryView.swift / SurveyView.swift / PlanView.swift
  TeacherSession.swift      Realtime voice client + tool dispatch
  SessionHUD.swift          floating panel (NSPanel + SwiftUI)
  ScreenCapture.swift       ported capture utility
  PointerOverlay.swift      minimal pointing overlay
  Notifications.swift       48h check-in scheduling
```

**TeacherSession rules (the lessons, encoded):**
- Transport: WebSocket to `wss://api.openai.com/v1/realtime?model=<model>`
  with `Authorization: Bearer <clientSecret>` from the token endpoint.
- **On `session.created` — and as a 2s-timeout fallback, once — send the
  token response's `sessionUpdateEvent` string VERBATIM.** Non-negotiable;
  see docs/praxo/API.md.
- Handle tool calls from BOTH `response.function_call_arguments.done` AND
  items inside `response.done` (dedupe by call_id) — mirror
  `src/app/praxo/_lib/realtime.ts`, the working reference implementation.
- Log every `error` event verbatim. Never swallow.
- Tools: look_at_screen (capture → downscale → attach as input_image user
  message), point_at (0-1 fractions → PointerOverlay), kb_search /
  complete_step / flag_stuck (relay to backend). After every tool output:
  `response.create`.
- Keep the last capture in memory; pass it as `evidenceImageBase64` with
  complete_step if the backend supports it (roadmap A2).
- Stop audio playback on `input_audio_buffer.speech_started` (barge-in)
  from day one.
- End session → APIClient.endSession (closes the server-side record).

## 5. Phases — each has an acceptance gate; NEVER start the next phase
until the current gate passes live, witnessed by the human

- **P0 Project bones (½ day)**: fresh project in `praxo-app/`, bundle id +
  signing fixed, Info.plist usage strings (mic, screen), design tokens
  file, git ignore. Gate: empty window runs, dock icon shows.
- **P1 API + Library (1 day)**: Models, APIClient, AppState, Settings
  sheet, Library grid. Gate: real course cards load from the backend
  (local or Vercel), Test Connection passes.
- **P2 Survey + Plan (1 day)**: survey flow → plan creation → plan view.
  Gate: personalized plan appears with learner's own budget in step text.
- **P3 Voice (1-2 days)**: TeacherSession + SessionHUD, mic streaming,
  audio out, captions, session.update handshake. Gate — the human test:
  "which course are we working on and what's my current step?" answered
  correctly by voice, plus a KB-grounded answer via kb_search.
- **P4 Screen sight (1 day)**: ScreenCapture port + look_at_screen +
  permission prompt (not full onboarding yet). Gate: "what's on my
  screen?" → teacher describes what's actually there.
- **P5 Pointing (1 day)**: PointerOverlay + point_at. Gate: "point at the
  dock" → marker appears on the dock and fades. (Old praxo-macos/ may be
  deleted after this gate.)
- **P6 Gates end-to-end (1 day)**: complete_step with evidence (+ image if
  backend ready), plan refresh, completion banner, 48h notification.
  Gate: pass step 1 of the ads course legitimately; admin dashboard shows
  the evidence; step 2 unlocks live.
- **P7 Onboarding + polish (1 day)**: the 4-screen flow, consent gate
  before first session, design pass against tokens. Gate: `tccutil reset
  ScreenCapture && tccutil reset Microphone`, then a fresh-user run
  through onboarding → full session, no dead ends.
- **P8 Ship**: Developer ID signing, notarized DMG, Sparkle, baked-in
  production server defaults. Gate: clean install on a second Mac/user
  account completes a session.

## 6. Working rules for the coding agent (all sessions)

1. One phase per session where possible. Start every session by reading
   this spec + `docs/praxo/API.md`, then AUDIT current phase state before
   writing code.
2. The human builds with **Cmd+R in Xcode** and pastes errors/console.
   NEVER run `xcodebuild` from the terminal (invalidates TCC permissions).
3. Backend and web app are read-only reference. If the API contract seems
   wrong or missing something, STOP and report — don't fork it.
4. Gates are sacred: no UI or code path marks a step passed except
   `complete_step` with evidence through the existing endpoint.
5. Debug with evidence, not guesses: instrument, localize the failing link,
   fix that link. Prefer isolation tests (debug buttons) that bypass the AI.
6. No secrets in code. Server URL/token: UserDefaults via Settings, with
   build-time defaults for production.
7. Commit at every green gate and `git push origin main`. Update this
   spec's phase checkboxes as gates pass.
8. Keep the noise down: no features beyond this spec; no fixing Swift 6
   concurrency warnings; no new dependencies except Sparkle at P8.

## Phase status

- [ ] P0 bones · [ ] P1 library · [ ] P2 survey/plan · [ ] P3 voice ·
  [ ] P4 sight · [ ] P5 pointing · [ ] P6 gates · [ ] P7 onboarding ·
  [ ] P8 ship
