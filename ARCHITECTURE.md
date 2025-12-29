# 🏛️ Architecture Documentation

## System Overview

The AI-Native Incubator is built as a Platform-as-a-Service (PaaS) that combines:
- **Frontend:** Next.js 15 React application
- **Backend:** Next.js API routes
- **Database:** PostgreSQL with Prisma ORM
- **AI Layer:** OpenAI GPT-4 Turbo
- **Auth:** NextAuth.js v5

## Data Flow

```
User → Next.js Frontend → API Routes → Prisma → PostgreSQL
                           ↓
                    OpenAI API (AI Agents)
                           ↓
                    Analysis Results → Database
```

## Database Schema

### Core Entities

#### User
- Represents founders, investors, or admins
- Links to companies via `CompanyMember`
- Tracks activities and vibe check-ins

#### Company
- Central entity for each startup
- Stores current phase and IRS scores
- Links to all company data (idea, interviews, metrics)

#### Idea
- One per company
- Stores AI Shredder results
- Tracks validation status

#### Interview
- Customer interview records
- Stores transcript and AI analysis
- Links to company

#### ActivityLog
- Audit trail of all actions
- Used for IRS velocity calculation
- Tracks impact scores

#### Metric
- AARRR metrics tracking
- Time-series data
- Used for IRS traction calculation

#### VibeCheckin
- Weekly co-founder surveys
- Used for harmony scoring
- Conflict detection input

#### Conflict
- Detected team issues
- Severity levels
- Resolution tracking

### Relationships

```
User ←→ CompanyMember ←→ Company
                          ↓
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
      Idea          Interview         Metric
                         ↓
                    ActivityLog
                         ↓
                    VibeCheckin
                         ↓
                     Conflict
```

## API Routes

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth handlers

### Idea Validation
- `POST /api/idea/shred` - Submit idea for AI critique
- `POST /api/idea/rebuttal` - Submit rebuttal to AI

### Interviews
- `GET /api/interviews` - List all interviews
- `POST /api/interviews` - Create interview
- `POST /api/interviews/generate` - Generate Mom Test questions
- `POST /api/interviews/analyze` - Analyze single interview
- `GET /api/interviews/summary` - Generate aggregate report

### Scoring
- `GET /api/irs` - Calculate Investor Ready Score

## AI Agent Architecture

### Agent Types

#### 1. Idea Shredder Agent
**Purpose:** Ruthlessly critique startup ideas

**Input:**
- Idea title
- Description
- Target market
- Problem statement
- Solution

**Output:**
- Verdict (LIKELY_TO_FAIL, NEEDS_WORK, PROMISING)
- Why you will fail (3-5 reasons)
- Competitors missed (3-5 companies)
- Economic flaws (2-4 issues)
- Overall score (0-100)
- Recommendations

**Model:** GPT-4 Turbo
**Temperature:** 0.7 (creative but focused)
**Format:** JSON mode

#### 2. Rebuttal Evaluator Agent
**Purpose:** Evaluate founder's defense of their idea

**Input:**
- Original idea
- AI critique
- Founder's rebuttal

**Output:**
- Convinced score (0-100)
- AI response to rebuttal

**Model:** GPT-4 Turbo
**Temperature:** 0.6 (balanced)
**Format:** JSON mode

#### 3. Mom Test Question Generator
**Purpose:** Generate unbiased interview questions

**Input:**
- Idea title
- Problem statement
- Target market

**Output:**
- 5 categories of questions
- Based on Mom Test principles

**Model:** GPT-4 Turbo
**Temperature:** 0.7
**Format:** JSON mode

#### 4. Interview Analyzer Agent
**Purpose:** Analyze customer interview for insights

**Input:**
- Idea context
- Interview transcript
- Interviewer notes

**Output:**
- Has problem (boolean)
- Problem severity (1-10)
- Would pay (boolean)
- Current solution
- Pain points
- Key insights
- Red flags
- Recommendation

**Model:** GPT-4 Turbo
**Temperature:** 0.5 (more analytical)
**Format:** JSON mode

#### 5. Interview Summary Agent
**Purpose:** Aggregate analysis across multiple interviews

**Input:**
- Array of interview analyses

**Output:**
- Total stats
- Common pain points
- Top insights
- Major red flags
- Verdict (VALIDATED, NEEDS_MORE_DATA, PIVOT_REQUIRED)
- Recommendation

**Model:** GPT-4 Turbo
**Temperature:** 0.5
**Format:** JSON mode

## IRS Calculation Engine

### Algorithm Overview

```typescript
IRS Total (0-1000) =
  Velocity (0-350, 35%) +
  Harmony (0-200, 20%) +
  Market (0-250, 25%) +
  Traction (0-200, 20%)
```

### Velocity Score (0-350)

**Components:**
1. Ship Rate (0-150)
   - 3+ deployments/week = 150 points
   - 1-3 deployments/week = 100 points
   - <1 deployment/week = 50 points

2. Consistency (0-100)
   - Last activity <2 days = 100 points
   - Last activity <1 week = 70 points
   - Last activity <2 weeks = 40 points

3. Adaptation (0-100)
   - Evidence of pivots = 50 points
   - 20+ interviews = 50 points
   - 10+ interviews = 30 points

**Data Sources:**
- `ActivityLog` table (deployments, commits)
- `Interview` count
- Timestamps

### Harmony Score (0-200)

**Components:**
1. Workload Balance (0-100)
   - <30% imbalance = 100 points
   - 30-50% imbalance = 60 points
   - >50% imbalance = 30 points

2. Conflict Management (0-100)
   - No conflicts = 100 points
   - All conflicts resolved = 100 points
   - Minor unresolved = 50 points
   - Critical unresolved = 0 points

**Data Sources:**
- `ActivityLog` grouped by userId
- `Conflict` table
- `VibeCheckin` table

### Market Score (0-250)

**Components:**
1. Customer Interviews (0-100)
   - 20+ interviews = 100 points
   - 10+ interviews = 70 points
   - 5+ interviews = 40 points

2. Problem-Market Fit (0-100)
   - 70%+ have problem, 50%+ would pay = 100 points
   - 50%+ have problem = 60 points
   - <50% have problem = 20 points

3. Idea Validation (0-50)
   - Passed validation = 50 points
   - In revision = 25 points
   - Failed = 0 points

**Data Sources:**
- `Interview` table (count and analysis)
- `Idea` table (status)

### Traction Score (0-200)

**Components:**
1. User Acquisition (0-70)
   - 100+ users = 70 points
   - 50+ users = 50 points
   - <50 users = 30 points

2. Retention (0-80)
   - 40%+ retention = 80 points
   - 20%+ retention = 50 points
   - <20% retention = 20 points

3. Viral Coefficient (0-50)
   - 1.0+ coefficient = 50 points
   - 0.5+ coefficient = 30 points

**Data Sources:**
- `Metric` table (latest entry)

## Phase Unlocking Logic

### Gatekeeper Rules

```typescript
Phase 1 (IDEA_VALIDATION) → Phase 2 (BUILD_AND_LAUNCH)
Requirements:
  - Idea passed validation (aiConvincedScore >= 70)
  OR
  - 20+ interviews completed
  AND
  - Interview summary verdict === 'VALIDATED'

Phase 2 (BUILD_AND_LAUNCH) → Phase 3 (TRACTION_ENGINE)
Requirements:
  - MVP deployed (ActivityLog: FEATURE_DEPLOYED)
  - 10+ active users (Metric: acquisition >= 10)

Phase 3 (TRACTION_ENGINE) → Phase 4 (COFOUNDER_HARMONY)
Requirements:
  - Positive unit economics (LTV > CAC)
  - 40%+ retention rate
  - 100+ total users

Phase 4 (COFOUNDER_HARMONY) → Phase 5 (INVESTOR_READY)
Requirements:
  - No critical conflicts (Conflict: severity !== CRITICAL)
  - Team balance (workload imbalance < 50%)
  - First hire made

Phase 5 (INVESTOR_READY)
Requirements:
  - IRS Score >= 750
```

## Security Considerations

### Authentication
- NextAuth.js handles session management
- JWT strategy for stateless auth
- Secure cookies (httpOnly, secure in production)

### Authorization
- API routes check `session.user.id`
- Verify company membership before data access
- Investor role can view all company data

### Data Validation
- Zod schemas on all API inputs
- Prisma type safety prevents SQL injection
- Rate limiting needed (not yet implemented)

### API Keys
- Environment variables for secrets
- Never committed to git (.gitignore)
- Different keys for dev/staging/prod

## Performance Optimization

### Database
- Indexes on foreign keys (Prisma auto-generates)
- Composite indexes needed for:
  - `ActivityLog: (companyId, createdAt)`
  - `Interview: (companyId, status)`
  - `Metric: (companyId, date)`

### Caching
- IRS calculation is expensive
- Cache results for 1 hour
- Invalidate on new activities

### AI API Calls
- Cost: ~$0.01-0.05 per call
- Async processing for interviews
- Queue system needed at scale

## Scaling Considerations

### Current Limits
- Single Next.js server
- No background job processing
- AI calls are synchronous

### Future Improvements
1. **Background Jobs**
   - Bull/BullMQ for queue processing
   - Separate worker processes
   - Interview analysis in background

2. **Caching Layer**
   - Redis for IRS scores
   - Session storage
   - Rate limiting

3. **Database**
   - Connection pooling (Prisma Accelerate)
   - Read replicas for analytics
   - Partitioning for large tables

4. **AI**
   - Batch processing
   - Streaming responses
   - Fallback models for speed

## Monitoring & Observability

### Needed Instrumentation
- Error tracking (Sentry)
- Performance monitoring (Vercel Analytics)
- Database query monitoring (Prisma insights)
- AI API usage tracking
- User analytics (PostHog)

### Key Metrics to Track
- IRS calculation time
- AI API latency
- Database query time
- Interview completion rate
- Phase progression rate

## Future Architecture

### Microservices Approach
```
API Gateway → Auth Service
            → Company Service
            → AI Agent Service
            → Scoring Service
            → Notification Service
```

### Event-Driven
```
User Action → Event Bus (Kafka/RabbitMQ)
            → Multiple consumers
            → Update IRS
            → Send notifications
            → Trigger workflows
```

### Real-Time Features
- WebSocket for live score updates
- Server-Sent Events for notifications
- Real-time collaboration features

## Development Best Practices

### Code Organization
- Keep API routes thin
- Business logic in `src/lib/`
- Type safety everywhere
- Shared types in `src/types/`

### Testing Strategy
- Unit tests for IRS calculator
- Integration tests for API routes
- E2E tests for critical flows
- Mock OpenAI in tests

### Git Workflow
- Feature branches
- PR reviews required
- Automated tests on CI
- Semantic versioning

## Deployment Architecture

### Production Stack
```
User → Vercel (Next.js)
     → Supabase/Railway (PostgreSQL)
     → OpenAI API
     → Vercel Edge Functions (API routes)
```

### CI/CD Pipeline
1. Push to GitHub
2. Vercel auto-deploys preview
3. Run tests
4. Merge to main → Deploy production
5. Run migrations (Prisma)
6. Rollback capability

---

## Questions & Decisions

### Why Not Separate Backend?
- Next.js API routes sufficient for MVP
- Easier deployment (single project)
- Can migrate later if needed

### Why PostgreSQL Over NoSQL?
- Structured relational data
- ACID transactions important
- Complex queries needed
- Future: pgvector for AI features

### Why OpenAI Over Open Source?
- Reliability and quality
- JSON mode crucial
- Cost is low for MVP
- Can add local models later

### Why Not Real-Time by Default?
- Adds complexity
- Not needed for MVP
- Can add WebSockets later
- Polling sufficient for now
