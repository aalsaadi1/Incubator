# 🚀 The Gatekeeper: AI-Native Incubator Platform

> **Don't build a pitch deck. Build a Score.**

The first AI-native incubator that proves you are worth funding through ruthless execution, real validation, and an Investor Ready Score (IRS).

## 🎯 What Is This?

Traditional incubators offer "mentors and office space." We offer **AI Agents as Active Co-Founders** that:
- **Block bad decisions** before you waste months building the wrong thing
- **Force execution** on the hard stuff (validation, user interviews) before the fun stuff (coding, designing)
- **Generate a real-time Investor Ready Score** that updates based on your actions, not your promises

## 🏗️ Core Philosophy: The Gatekeeper

This is not a school. It's a **linear workflow**. You cannot unlock "Coding" until you pass "Validation." You cannot unlock "Fundraising" until you pass "Traction."

### The 5 Phases

1. **Reality Check** 🔥
   - Idea Shredder destroys your idea
   - 20 customer interviews required (Mom Test methodology)
   - **Unlock Requirement:** Pass AI validation OR complete 20 interviews with positive signals

2. **Build & Launch** ⚡
   - Vibe Coding Box (time-boxed dev environment)
   - Auto-Launcher (launches for you if you delay)
   - **Unlock Requirement:** Ship MVP, get first 10 users

3. **Traction Engine** 📈
   - AARRR Dashboard (Acquisition, Activation, Retention, Revenue, Referral)
   - User Nagger Bot (alerts when users churn)
   - **Unlock Requirement:** Positive unit economics (LTV > CAC)

4. **Co-founder Harmony** 🤝
   - Weekly Vibe Check-ins
   - AI conflict detection
   - **Unlock Requirement:** Pass harmony checks, hire first employee

5. **Investor Ready** 💰
   - Due Diligence Firewall
   - Investor pitch simulator
   - **Unlock Requirement:** IRS Score 750+

## 🎓 The Investor Ready Score (IRS)

Your investability score (0-1000) calculated in real-time based on 4 pillars:

### 1. Velocity (35% weight, max 350 points)
- **Ship Rate:** How many features deployed per week?
- **Consistency:** Days since last activity
- **Pivot Speed:** How fast you adapt to feedback

### 2. Harmony (20% weight, max 200 points)
- **Workload Balance:** Are co-founders contributing equally?
- **Conflict Resolution:** Unresolved issues detected?
- **Communication:** Activity balance across team

### 3. Market Reality (25% weight, max 250 points)
- **Customer Interviews:** How many conducted?
- **Problem-Market Fit:** % of interviewees with real problem
- **Willingness to Pay:** Evidence they'd actually pay

### 4. Traction (20% weight, max 200 points)
- **User Acquisition:** Sign-ups and growth
- **Retention:** % of users who stay
- **Viral Coefficient:** Organic growth rate

### Score Tiers
- **800-1000:** Series A Ready 🟣
- **700-799:** Seed Ready 🟢
- **500-699:** Pre-Seed 🔵
- **0-499:** Not Ready ⚪

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15 (React 19)
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI
- **Charts:** Recharts

### Backend
- **Runtime:** Node.js with Next.js API routes
- **Language:** TypeScript (strict mode)
- **Validation:** Zod

### Database
- **Primary:** PostgreSQL
- **ORM:** Prisma
- **Migrations:** Prisma Migrate

### AI/ML
- **LLM:** OpenAI GPT-4 Turbo
- **Use Cases:**
  - Idea validation and critique
  - Interview question generation
  - Interview analysis
  - Pitch evaluation

### Authentication
- **Provider:** NextAuth.js v5
- **Strategies:** Google, GitHub, Email/Password

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 16+
- Docker (optional, for local database)
- OpenAI API key

### 1. Clone and Install

```bash
cd Incubator
npm install
```

### 2. Database Setup

#### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL container
docker-compose up -d

# Verify it's running
docker ps
```

#### Option B: Local PostgreSQL

1. Install PostgreSQL 16
2. Create database:
```sql
CREATE DATABASE ai_incubator;
```

### 3. Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your keys:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_incubator"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"

# OpenAI (Required)
OPENAI_API_KEY="sk-..."

# OAuth (Optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

### 4. Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🎮 How to Use

### For Founders

#### Step 1: Submit Your Idea
1. Navigate to **Idea Shredder** (`/dashboard/idea-shredder`)
2. Fill in your idea details
3. AI generates a "Why You Will Fail" report
4. Submit a rebuttal to defend your idea
5. Score 70+ to pass validation

#### Step 2: Customer Interviews
1. Go to **Interviews** (`/dashboard/interviews`)
2. Click "Questions" to generate Mom Test questions
3. Conduct interviews with real customers
4. Log each interview with transcript and notes
5. AI analyzes each interview automatically
6. Complete **20 interviews** to unlock next phase

#### Step 3: Check Your IRS
1. Main dashboard shows your current score
2. Four pillar breakdown (Velocity, Harmony, Market, Traction)
3. Badges for achievements
4. Warnings for areas needing improvement
5. **Goal:** Reach 750+ to become investor-ready

### For Investors

Investors get access to:
- **Real-time IRS scores** for all startups
- **Proof-of-work logs** (not just promises)
- **Verified metrics** (interviews, deployments, traction)
- **AI-generated due diligence reports**

## 📊 Features Built

### ✅ Completed Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Idea Shredder** | AI ruthlessly critiques startup ideas | ✅ Complete |
| **Rebuttal System** | Founders defend their idea to the AI | ✅ Complete |
| **Mom Test Questions** | Auto-generate unbiased interview questions | ✅ Complete |
| **Interview Logger** | Log and analyze customer interviews | ✅ Complete |
| **Interview Analysis** | AI analyzes each interview for insights | ✅ Complete |
| **Interview Summary** | Aggregate analysis across all interviews | ✅ Complete |
| **IRS Calculator** | Real-time 4-pillar scoring algorithm | ✅ Complete |
| **Main Dashboard** | Phase progression and score display | ✅ Complete |
| **Velocity Scoring** | Ship rate and consistency tracking | ✅ Complete |
| **Harmony Scoring** | Co-founder balance detection | ✅ Complete |
| **Market Scoring** | Customer validation scoring | ✅ Complete |
| **Traction Scoring** | Growth metrics evaluation | ✅ Complete |

### 🚧 Coming Soon

| Feature | Description | Priority |
|---------|-------------|----------|
| **Vibe Coding Box** | Time-boxed dev environment with AI review | High |
| **Auto-Launcher** | Automatically posts to Product Hunt/Twitter | High |
| **AARRR Dashboard** | Real-time metrics tracking | High |
| **User Nagger Bot** | Churn alerts and follow-up automation | Medium |
| **Vibe Check-ins** | Weekly co-founder sentiment surveys | High |
| **Conflict Detector** | AI detects team issues early | Medium |
| **Hiring Simulator** | Practice interviews with AI candidates | Low |
| **Due Diligence Firewall** | Test pitch before real investors | High |
| **Investor Dashboard** | Public score dashboard for investors | High |
| **Social Integration** | Twitter, Product Hunt, Reddit APIs | Medium |

## 🗂️ Project Structure

```
Incubator/
├── src/
│   ├── app/
│   │   ├── api/                    # API routes
│   │   │   ├── auth/              # NextAuth handlers
│   │   │   ├── idea/              # Idea Shredder API
│   │   │   ├── interviews/        # Interview APIs
│   │   │   └── irs/               # IRS calculation API
│   │   ├── dashboard/             # Main dashboard
│   │   │   ├── idea-shredder/    # Idea validation UI
│   │   │   └── interviews/        # Interview management UI
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx               # Landing page
│   ├── components/                # Reusable components
│   ├── lib/
│   │   ├── ai.ts                  # AI/LLM functions
│   │   ├── auth.ts                # NextAuth config
│   │   ├── irs-calculator.ts      # IRS scoring engine
│   │   ├── prisma.ts              # Prisma client
│   │   └── utils.ts               # Utilities
│   └── types/                     # TypeScript types
├── prisma/
│   └── schema.prisma              # Database schema
├── docker-compose.yml             # PostgreSQL container
├── .env.example                   # Environment template
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md                      # This file
```

## 🎯 Key Concepts

### The Gatekeeper Pattern

Instead of giving founders freedom to waste time, we **force** the right sequence:

```
Idea → Validation → Customers → Build → Ship → Traction → Fundraise
```

You cannot skip steps. Each phase is locked until you complete the requirements.

### Mom Test Methodology

Questions focus on:
1. **Their life**, not your idea
2. **Past behavior**, not future promises
3. **Listening**, not pitching

**Bad Question:** "Would you use this app?"
**Good Question:** "Tell me about the last time you had this problem. What did you do?"

### Brutal Honesty Over False Hope

We don't say "great idea!" We say "here are 5 competitors you missed and 3 economic flaws."

If the idea survives, it might be real.

## 🔧 Development

### Database Management

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Push schema changes to database
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio
```

### Adding New Features

1. **Update Prisma schema** (`prisma/schema.prisma`)
2. **Generate client:** `npm run db:generate`
3. **Create API route** in `src/app/api/`
4. **Create UI component** in `src/app/dashboard/`
5. **Update IRS calculator** if it affects scoring

### Testing AI Functions

The AI functions in `src/lib/ai.ts` require an OpenAI API key. Test individually:

```typescript
import { shredIdea } from '@/lib/ai'

const result = await shredIdea({
  title: 'Netflix for Pets',
  description: 'Streaming service for pets',
  targetMarket: 'Pet owners',
  problem: 'Pets get bored',
  solution: 'Videos for pets',
})

console.log(result)
```

## 💡 Architecture Decisions

### Why Next.js 15?
- Server Components for efficient AI streaming
- Built-in API routes
- Great TypeScript support
- Easy deployment to Vercel

### Why PostgreSQL?
- Structured data (companies, users, interviews)
- Full-text search capabilities
- JSON column support for flexible data
- Future: pgvector for embeddings

### Why OpenAI?
- GPT-4 Turbo for complex reasoning
- JSON mode for structured outputs
- Reliable and fast

### Why Prisma?
- Type-safe database queries
- Automatic migrations
- Great DX with Prisma Studio

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Connect repo to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Database Hosting

Options:
- **Supabase** (recommended, includes PostgreSQL + auth)
- **Railway** (easy PostgreSQL hosting)
- **Neon** (serverless PostgreSQL)
- **AWS RDS** (production-grade)

### Environment Variables to Set

```
DATABASE_URL=your-production-db-url
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=production-secret
OPENAI_API_KEY=sk-...
```

## 📈 Roadmap

### Phase 1: Foundation (Current)
- ✅ Idea Shredder
- ✅ Mom Test Interviews
- ✅ IRS Calculator
- ✅ Main Dashboard

### Phase 2: Execution Engine
- ⏳ Vibe Coding Box
- ⏳ AARRR Dashboard
- ⏳ Auto-Launcher
- ⏳ User Nagger Bot

### Phase 3: Team Dynamics
- ⏳ Vibe Check-ins
- ⏳ Conflict Detection
- ⏳ Hiring Simulator

### Phase 4: Investor Tools
- ⏳ Due Diligence Firewall
- ⏳ Investor Dashboard
- ⏳ Pitch Simulator

## 🤝 Contributing

This is an experimental platform. Contributions welcome!

### Priority Areas
1. Additional AI agents (hiring, legal, etc.)
2. Integration with development tools (GitHub, Linear)
3. Analytics and visualization
4. Mobile app

## 📄 License

MIT License - See LICENSE file

## 🙋 FAQ

### Q: Is this for real?
A: Yes. The platform is functional and the AI actually works.

### Q: Will this work without real data?
A: You need to conduct real customer interviews and track real metrics. The AI can detect BS.

### Q: Can I skip phases?
A: No. That's the point. The Gatekeeper forces linear progression.

### Q: What if the AI is wrong about my idea?
A: That's what the rebuttal system is for. Convince it with data and evidence.

### Q: How much does it cost to run?
A: OpenAI API costs ~$0.01-0.05 per idea critique or interview analysis. Very cheap.

### Q: Can I self-host?
A: Yes! Everything runs on your infrastructure except OpenAI API calls.

## 🎓 Learn More

- [The Mom Test Book](https://www.momtestbook.com/)
- [YCombinator Startup School](https://www.startupschool.org/)
- [First Round Review](https://review.firstround.com/)

## 📧 Contact

Questions? Open an issue or reach out!

---

**Remember:** Don't build a pitch deck. Build a Score.

**Goal:** IRS 750+ = Investment Ready
