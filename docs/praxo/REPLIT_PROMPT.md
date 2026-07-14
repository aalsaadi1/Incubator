# Replit Agent Brief: Praxo

> **SUPERSEDED (2026-07):** the web app described here was built directly in
> this repo — see `src/app/praxo/` and `docs/praxo/DEPLOY.md`. Kept for
> reference only.

> Copy everything below this line into Replit Agent.

---

## What Praxo is

Praxo is an AI teaching product that teaches by doing. A learner picks a
**course card**, answers a short **survey**, and the backend generates a
**personalized step-by-step plan**. Then an **AI voice teacher** (OpenAI
Realtime API, speech-to-speech) coaches them through each step while watching
their screen — until they produce a real outcome.

Reference scenario the whole product is designed around: *someone wants to
learn to run ads → survey → personalized 9-step plan → the voice teacher
walks them through building a real campaign in the real ads platform → the
course is complete only when the campaign is verifiably live.* Each step has
a **gate**: a verification criterion the teacher must confirm (ideally from a
screenshot) before the next step unlocks. Gates are the core product
mechanic — nothing may bypass them.

## What already exists (do not rebuild)

Repo: `aalsaadi1/Incubator`, branch **`claude/praxo-macos-app-assessment-7k3avu`**.
It contains a working Next.js 15 + Prisma + PostgreSQL app. The Praxo pieces:

- `docs/praxo/PLAN.md` — full product/architecture plan. Read first.
- `docs/praxo/API.md` — the API contract. **This is your spec; code against it.**
- `prisma/schema.prisma` — `Praxo*` models (courses, KB chunks, plans, steps, sessions).
- `src/lib/praxo/` — auth (device token + user key), embedding KB search,
  survey→plan generator (authored gates, LLM personalizes wording only),
  Realtime teacher instruction builder.
- `src/app/api/praxo/` — routes: `courses`, `plans`, `steps/[stepId]`,
  `kb/search`, `realtime/token` (mints ephemeral OpenAI Realtime secrets).
- `prisma/seed-praxo.ts` (`npm run praxo:seed`) — the first course, "Run Your
  First Ad Campaign": 6-question survey, 9 gated steps, 10 KB chunks.
- `praxo-macos/` — a native Swift macOS client (vendored from the MIT
  open-source "clicky" project, plus a Praxo layer). **DO NOT modify this
  directory.** It requires Xcode/macOS, which you don't have; it is being
  built separately. Never delete it, never "fix" its Swift.

The backend typechecks (`npx tsc --noEmit`) except one pre-existing error in
`src/app/api/interviews/analyze/route.ts` — that file is part of a different
product in this repo (an incubator platform). Leave all non-Praxo code alone.

## Your job

Build the parts that run in a browser/server, in this order:

### 1. Get the backend running end to end
- Provision Postgres, set env from `.env.example` (`DATABASE_URL`,
  `OPENAI_API_KEY`, `PRAXO_DEVICE_TOKEN`).
- `npm install && npm run db:push && npm run praxo:seed && npm run dev`.
- Verify with curl per `docs/praxo/API.md`: list courses → create a plan
  (real LLM call) → complete step 1 with evidence → confirm step 2 unlocks.

### 2. Web Teacher (the main deliverable)
A browser client at `/praxo` that mirrors what the Mac app will do, so the
product loop can be tested with real users before the native app ships:
- **Library**: course cards from `GET /api/praxo/courses`.
- **Survey**: render the course's `survey` JSON one question at a time;
  submit to `POST /api/praxo/plans`; show a "building your plan" state
  (generation takes ~5–15s).
- **Plan view**: ordered steps with LOCKED/CURRENT/PASSED states; show the
  CURRENT step's instructions and its gate ("Done when: …").
- **Voice session**: on "Start session", call `POST /api/praxo/realtime/token`,
  then connect to OpenAI Realtime **via WebRTC from the browser** using the
  ephemeral `clientSecret` (mic in, model audio out). Handle the session's
  function tools exactly per the table in `docs/praxo/API.md`:
  - `look_at_screen` → `getDisplayMedia()` screen share; grab a frame to a
    canvas, JPEG it, attach as `input_image`. Ask for screen share once at
    session start and reuse the stream.
  - `point_at` → the browser can't point at other apps; overlay the last
    captured frame with a highlighted marker at (x·width, y·height) with the
    label, shown in a corner panel.
  - `kb_search` / `complete_step` / `flag_stuck` → relay to the backend
    routes, return results as the tool output, then trigger a new response.
- On step completion, refresh the plan view live.
- For the browser client, do NOT expose `PRAXO_DEVICE_TOKEN` in client JS.
  Add a minimal server-side session (even a simple login-code page) that
  proxies the Praxo API routes, keeping the token server-side and deriving a
  stable `X-Praxo-User-Key` per user.

### 3. Admin dashboard (second deliverable)
`/praxo/admin` (protect with a simple admin password env var):
- CRUD for courses: title/description/emoji/status, survey JSON, plan
  template JSON (validate against `src/lib/praxo/types.ts` shapes).
- CRUD for KB chunks with automatic embedding on save (reuse
  `src/lib/praxo/kb.ts`'s `embed()`).
- Read-only ops views: plans with step progress and evidence; stuck flags
  grouped by step (this is the course-improvement signal); sessions list.

### 4. Guardrails
- Rate-limit the Praxo API (per user key) and cap voice sessions: reject
  token minting past N sessions/day per user (env-configurable).
- Record `endedAt` on sessions via a `POST /api/praxo/sessions/:id/end`
  route you add, called when the web client disconnects.

## Rules

1. **Gates are sacred**: no UI or route that marks a step passed without
   `action: complete` + evidence through the existing endpoint.
2. The OpenAI API key stays server-side; browsers only ever get ephemeral
   Realtime secrets from the token endpoint.
3. Don't change the API contract in `docs/praxo/API.md` — the native Mac
   client is being built against it in parallel. Additive routes are fine.
4. Don't touch `praxo-macos/`, `src/app/api/{auth,idea,interviews,irs}`, or
   the existing incubator dashboard pages.
5. Stack discipline: stay on Next.js App Router + Prisma + Tailwind already
   in the repo; no new frameworks, no second server.

## Acceptance test (walk it yourself before calling it done)

In a browser: pick the ads course card → answer the 6 survey questions → a
personalized 9-step plan appears (budget numbers from your answers show up in
step instructions) → start a voice session → the teacher greets you, and when
asked "what am I looking at?" it requests screen share and describes your
screen → tell it you finished creating your ad account and show the screen;
it verifies against the gate and step 1 flips to PASSED, step 2 becomes
CURRENT → the admin dashboard shows the plan, the evidence text, and the
session row.
