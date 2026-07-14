# Praxo Backend API Contract

All endpoints live under `/api/praxo/`. Implementation: `src/app/api/praxo/`.

## Authentication (M0 scheme)

Every request must send both headers:

```
Authorization: Bearer <PRAXO_DEVICE_TOKEN>      # shared secret, matches server env
X-Praxo-User-Key: <stable-per-user-id>          # 8-128 chars; scopes plans/progress
```

Missing/wrong values → `401`. See `src/lib/praxo/auth.ts`. Real per-user auth
is a later milestone; any new client must keep sending a stable user key.

## Endpoints

### `GET /api/praxo/courses`
Published course cards. Each course includes its `survey` definition
(`{ intro, questions: [{ id, question, type: single_choice|multi_choice|text, options?, required }] }`).

→ `200 { courses: [{ id, slug, title, description, coverEmoji, survey }] }`

### `POST /api/praxo/plans`
Create a personalized plan from survey answers. Runs one LLM call (~5-15s).

Body: `{ "courseSlug": "run-your-first-ads", "surveyAnswers": { "<questionId>": "<answer>", ... } }`

→ `201 { plan: { id, status, steps: [...] } }`
→ `409` if an ACTIVE plan for this course+user already exists (`{ planId }` included).

Step shape: `{ id, order, title, goal, instructions, gate, status }` where
status is `LOCKED | CURRENT | PASSED`. Exactly one step is CURRENT.

### `GET /api/praxo/plans`
All plans for the caller, newest first, with `course: { slug, title, coverEmoji }` and full steps.

### `POST /api/praxo/steps/:stepId`
The agent's progress tools.

- Complete (gates progression): `{ "action": "complete", "evidence": "<what was verified, ≥10 chars>" }`
  → `200 { step, nextStepId, planCompleted }`. Only the CURRENT step may be
  completed (`409` otherwise). Completing the last step marks the plan COMPLETED.
- Stuck: `{ "action": "flag_stuck", "reason": "<why, ≥5 chars>" }` → `200 { step }`

### `POST /api/praxo/kb/search`
Course knowledge base search (embeddings + cosine, in-process).

Body: `{ "planId": "...", "query": "..." }` → `200 { hits: [{ id, title, content, score }] }`

### `POST /api/praxo/realtime/token`
Mints an ephemeral OpenAI Realtime client secret configured as this plan's
voice teacher (instructions + tools baked in server-side), and opens a
`PraxoSession` row.

Body: `{ "planId": "..." }`
→ `200 { clientSecret, expiresAt, sessionId, currentStep }`

The client connects to OpenAI Realtime (`wss://api.openai.com/v1/realtime`,
or WebRTC) with `Authorization: Bearer <clientSecret>`. The session is
pre-configured with these function tools the client must handle:

| Tool | Executed | Contract |
|---|---|---|
| `look_at_screen` | client | capture screen, return confirmation as tool output, attach the image as a user message (`input_image`) |
| `point_at {x, y, label}` | client | x/y are 0-1 screen fractions; show a pointer at that spot |
| `kb_search {query}` | relay | call `POST /kb/search`, return hits as markdown text |
| `complete_step {step_id, evidence}` | relay | call `POST /steps/:id` action=complete |
| `flag_stuck {step_id, reason}` | relay | call `POST /steps/:id` action=flag_stuck |

## Data model

Prisma models `PraxoCourse`, `PraxoKbChunk`, `PraxoCoursePlan`, `PraxoStep`,
`PraxoSession` in `prisma/schema.prisma`. Course content (survey + step
template with gates) lives in Json columns; types in `src/lib/praxo/types.ts`.
Seed: `npm run praxo:seed` (loads the "Run Your First Ad Campaign" course).

## Invariants any client/UI must respect

1. **Gates are the product.** A step passes only via `complete_step` with
   evidence. Never add a client-side "mark done" that bypasses it.
2. Steps progress strictly in order; the backend enforces CURRENT-only completion.
3. The OpenAI API key never reaches a client — only ephemeral secrets from
   the token endpoint.
4. `surveyAnswers` keys are the survey question ids; template `skipIf` logic
   depends on exact option strings.
