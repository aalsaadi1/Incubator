# Getting Praxo Live — the Non-Technical Guide

Follow this top to bottom and you'll have Praxo running on the internet with
a link you can send to your first learner. Budget about an hour. You'll
create three accounts and copy-paste a few "secret codes" — that's the whole
skill level required.

Keep a private note open while you work. You'll collect these values:

| Nickname | What it is | Where you get it |
|---|---|---|
| `DATABASE_URL` | the filing cabinet's address | Neon (step 2) |
| `OPENAI_API_KEY` | pays for the AI teacher | OpenAI (step 1) |
| `PRAXO_ACCESS_CODES` | codes learners type to enter | you invent them |
| `PRAXO_ADMIN_PASSWORD` | your dashboard password | you invent it |
| `PRAXO_DEVICE_TOKEN` | for the future Mac app | you invent it (long & random) |
| `NEXTAUTH_SECRET` | internal security string | you invent it (long & random) |

## Step 1 — OpenAI (the teacher's brain and voice)

1. Go to **platform.openai.com** → sign up (this is separate from ChatGPT).
2. In **Settings → Billing**, add a card and buy $20 of credit.
   Recommended: set a **monthly usage limit** (e.g. $50) so there are no surprises.
3. Go to **API keys** → **Create new secret key** → name it "Praxo" → copy the
   key (starts with `sk-`) into your note as `OPENAI_API_KEY`.
   ⚠️ It's shown only once. If you lose it, just make a new one.

## Step 2 — Neon (the filing cabinet)

1. Go to **neon.tech** → sign up with Google → create a project, name it `praxo`.
2. On the project dashboard, find **Connection string**, choose the
   **pooled** option if asked, and copy the long address (starts with
   `postgresql://`) into your note as `DATABASE_URL`.

## Step 3 — Vercel (the machine that runs Praxo)

1. Go to **vercel.com** → sign up **with your GitHub account**.
2. Click **Add New → Project** → import the **Incubator** repository.
3. **Before clicking Deploy**, open **Environment Variables** and add each row
   from your note (Name on the left, value on the right):
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `PRAXO_ACCESS_CODES` — invent codes, comma-separated, e.g.
     `sunrise-42,maple-77`. One code per person; a code is that person's identity.
   - `PRAXO_ADMIN_PASSWORD` — your dashboard password.
   - `PRAXO_DEVICE_TOKEN` — mash the keyboard: 30+ random characters.
   - `NEXTAUTH_SECRET` — another 30+ random characters.
   - `NEXTAUTH_URL` — leave for now; after the first deploy, set it to your
     site address (e.g. `https://incubator-xyz.vercel.app`) and redeploy.
4. Click **Deploy** and wait ~2 minutes for the confetti.

## Step 4 — Load the ads course (one-time, ~10 minutes)

The database starts empty. Easiest path — ask Claude (me) to do it: I can run
the two setup commands against your database if you add the `DATABASE_URL`
and `OPENAI_API_KEY` to a `.env` file in a session. Or, if you have a
technical friend for 10 minutes, they run:

```bash
git clone <your repo> && cd Incubator && npm install
# put DATABASE_URL and OPENAI_API_KEY in a file named .env
npm run db:push       # creates the tables
npm run praxo:seed    # loads "Run Your First Ad Campaign"
```

## Step 5 — Take your own course

1. Open `https://<your-site>.vercel.app/praxo` in **Chrome** (best support
   for voice + screen sharing).
2. Enter one of your access codes.
3. Pick the ads course, answer the survey, click **Start session**, allow the
   **microphone**, and say hi to your teacher. Click **Share screen** when it
   wants to see your work.
4. Your dashboard lives at `/praxo/admin` — course editor, knowledge base,
   and the "where learners get stuck" report.

## When something looks broken

Copy the exact error message (or screenshot it) and paste it to Claude in a
session on this repo. Fixes get pushed to GitHub, and Vercel redeploys
automatically within a couple of minutes — that's the whole maintenance loop.

## What this costs

- Vercel and Neon: **$0** on free tiers at pilot scale.
- OpenAI: pay-per-use — roughly **$3–6 per learner** who completes a course,
  protected by your monthly usage limit and Praxo's built-in daily session cap
  (`PRAXO_MAX_SESSIONS_PER_DAY`, default 10 sessions/learner/day).
