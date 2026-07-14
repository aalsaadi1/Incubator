# Praxo Roadmap — After the First Build

What to build once the current milestone (Mac app Stage C/D + Vercel deploy)
is done. Ordered by one question: **does it raise the completion rate** —
the % of learners who start a course and end with the real outcome shipped?

Everything here assumes the current system: gated plans, voice teacher with
screen awareness, KB retrieval, admin ops dashboard, access-code auth.

---

## Track A — Make the teacher better (the AI itself)

### A1. Teacher memory across sessions — P0, backend+prompt, ~3 days
Today every session starts amnesiac; the teacher re-greets like a stranger.
- At session end, generate a short summary (one chat-API call over the
  session's tool-call history + steps touched): what was done, where the
  learner struggled, tone notes ("prefers short answers").
- Store on `PraxoSession.summary`; inject the last 2-3 summaries into
  `buildTeacherInstructions`.
- Payoff: "Welcome back — last time we got your pixel firing. Today:
  creatives." This is the single biggest perceived-quality win available.

### A2. Evidence with receipts — P0, ~2 days
Gates currently pass on the agent's text evidence alone.
- When the teacher calls `complete_step` after a `look_at_screen`, attach
  the screenshot: store it (Vercel Blob) on the step as `evidenceImageUrl`.
- Admin ops view shows the image next to the evidence text.
- Payoff: auditability — you can SEE whether gate verification is honest,
  which is the trust foundation of the whole product.

### A3. Step-aware retrieval — P1, ~1 day
KB chunks already carry `stepTags`, unused at query time.
- In `searchKb`, boost chunks tagged with the plan's CURRENT step
  (e.g. +0.1 to cosine score), pass current step id from the tool call.
- Payoff: answers grounded in the right lesson at the right moment.

### A4. Proactive screen glances — P1, needs A2 shipped first, ~3 days
Today the teacher only looks when asked or verifying.
- During a live session, if the learner has been silent N minutes on the
  same step, the client captures a frame and asks the model (cheap chat
  call, not the voice session) "stuck or progressing?" → if stuck, the
  teacher speaks up unprompted.
- Must be visibly indicated in the UI every time (glance indicator), and
  capped per session (cost + creepiness budget).
- Payoff: this is the "teacher who notices" magic moment — but ship it
  after trust features, not before.

### A5. Session transcripts + eval set — P1, ~2 days
You can't improve what you can't replay.
- Log the session's text events (captions, tool calls, results) to
  `PraxoSession.transcriptUrl` (Blob). Admin can read any session.
- Build a small eval: 20 golden questions for the ads course with expected
  KB grounding; script runs them against `kb_search` + a chat call and
  flags regressions when the KB or prompts change.

### A6. Latency & interruption polish — P2, Mac-side, ~2 days
- Mac client: migrate WebSocket → WebRTC (echo cancellation, faster);
  stop playback on `input_audio_buffer.speech_started` (barge-in).
- Payoff: conversational feel; do after correctness is proven.

### A7. Real cost tracking — P1, ~1 day
- Parse Realtime usage events → accumulate `costCents` per session.
- Admin: cost per learner, per course; alert threshold via env var.
- Payoff: pricing decisions stop being guesses.

## Track B — Product features (the app around the teacher)

### B1. Real accounts + payments — P0 before charging, ~1 week
Replace access codes (M4 milestone): email magic-link auth; Stripe
checkout; a course is an entitlement. Access codes remain as comp/pilot
paths. Data model already keys everything by `userKey` — migration is
mapping codes → accounts.

### B2. Server-side re-engagement — P0, ~2 days
The 48h check-in currently exists only as a Mac local notification.
- Backend cron (Vercel cron): plans whose `checkin` step went CURRENT ~48h
  ago and hasn't passed → send email ("your campaign has 2 days of data").
  Also: 7-day inactive nudge. Requires an email provider (Resend).
- Payoff: directly attacks the biggest dropout window in the whole journey.

### B3. Course authoring wizard — P1, ~1 week
Replace the admin JSON textareas: form-based editors for survey questions
and steps/gates, plus "draft a course with AI" — give a topic and outcome,
get a template + starter KB to edit. This is what makes course #2 cheap.

### B4. Course #2 — P1, content work, after B3 (or hand-authored before)
The platform test: a second course with ZERO new code. Candidate: "Launch
your landing page" (feeds the ads course; natural sequel funnel in both
directions). Success = same completion mechanics work on different subject.

### B5. Learner worksheet artifacts — P2, ~2 days
Steps like positioning produce text artifacts that today live nowhere.
- `PraxoStep.artifact` (Json): the teacher saves the positioning statement,
  creative checklist results, retro lessons via a `save_artifact` tool.
- Payoff: the plan page becomes the learner's course workbook; also better
  memory input for A1.

### B6. In-session step HUD (Mac) — P2, ~2 days
Show the current step + gate as a compact card near the cursor overlay
during sessions, so the learner never loses the thread while working in
another app.

## Track C — Operations & funnel (knowing if it works)

### C1. Funnel metrics — P0, ~1 day
Admin dashboard header: signups → survey started → plan created → first
session → step 3 reached → launched → completed, as counts + conversion.
All derivable from existing tables; no new tracking needed.

### C2. KB expansion to 40-60 chunks — P0, content, ongoing
Source: your own course run + every stuck flag + every bad answer.
This outranks all code on this page for completion-rate impact.

---

## Suggested order (first 4 weeks after ship)

| Week | Build |
|---|---|
| 1 | A1 memory, C1 funnel, C2 KB (start), A7 cost tracking |
| 2 | A2 evidence receipts, B2 re-engagement emails, A3 step-aware retrieval |
| 3 | B1 accounts + Stripe (start), A5 transcripts+eval |
| 4 | B1 finish, B3 authoring wizard (start), A6 latency, decide course #2 |

Rule of thumb when tempted to reorder: trust features (A2, A5) before
magic features (A4); measurement (C1, A7) before monetization (B1);
content (C2) before everything, always.
