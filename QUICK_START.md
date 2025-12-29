# ⚡ Quick Start Guide

Get the AI-Native Incubator running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Docker Desktop installed (for database)
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Database

```bash
# Start PostgreSQL in Docker
docker-compose up -d

# Verify it's running
docker ps
# Should see: ai_incubator_db
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
# Minimum required:
# - DATABASE_URL (already set for Docker)
# - OPENAI_API_KEY (get from OpenAI)
# - NEXTAUTH_SECRET (any random string)
```

### 4. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Create database schema
npx prisma db push
```

### 5. Run Application

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## First Steps in the App

### Try the Idea Shredder

1. Go to `/dashboard/idea-shredder`
2. Fill in your startup idea:
   - **Title:** "Netflix for Pets"
   - **Description:** "A streaming service that plays videos specifically designed for pets"
   - **Target Market:** "Pet owners with subscriptions to pet services"
   - **Problem:** "Pets get bored when owners are away"
   - **Solution:** "AI-curated video content that keeps pets engaged"

3. Click "Shred My Idea"
4. Read the AI's brutal critique
5. Submit a rebuttal defending your idea
6. See if you can score 70+ to pass!

### Log Customer Interviews

1. Go to `/dashboard/interviews`
2. Click "Questions" to generate interview questions
3. Copy questions and actually interview 2-3 people
4. Log each interview with their responses
5. AI will analyze each one automatically
6. Check the summary after a few interviews

### Check Your IRS Score

1. Return to main dashboard (`/dashboard`)
2. Click "Recalculate Score"
3. See your breakdown across 4 pillars
4. Notice which areas need improvement
5. Take actions to improve your score

## Common Issues

### "Error: Connect ECONNREFUSED"
- Database not running
- Fix: `docker-compose up -d`

### "Error: P1001: Can't reach database server"
- Check DATABASE_URL in `.env`
- Make sure Docker is running
- Default: `postgresql://postgres:postgres@localhost:5432/ai_incubator`

### "Error: No response from AI"
- Missing or invalid OpenAI API key
- Check OPENAI_API_KEY in `.env`
- Get key from https://platform.openai.com/api-keys

### "Error: Prisma Client not generated"
- Run: `npx prisma generate`

### Port 3000 already in use
- Another app is using the port
- Kill the process or change port: `PORT=3001 npm run dev`

## Next Steps

1. **Complete Phase 1:**
   - Submit your real idea
   - Conduct 20 customer interviews
   - Pass validation

2. **Improve Your IRS:**
   - Log activities daily
   - Ship features consistently
   - Track metrics

3. **Reach 750+ Score:**
   - Focus on weak pillars
   - Build real traction
   - Become investor-ready

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Database commands
npx prisma studio        # Open database GUI
npx prisma generate      # Regenerate client
npx prisma db push       # Update schema
npx prisma migrate dev   # Create migration
```

## Clean Slate Reset

To start fresh:

```bash
# Stop and remove database
docker-compose down -v

# Remove Prisma client
rm -rf node_modules/.prisma

# Start fresh
docker-compose up -d
npx prisma generate
npx prisma db push
npm run dev
```

## Getting Help

- Check [README.md](./README.md) for full documentation
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- Open an issue on GitHub
- Read error messages carefully (they're usually helpful!)

## Pro Tips

1. **Use Prisma Studio** to inspect data:
   ```bash
   npx prisma studio
   ```

2. **Check OpenAI usage** to monitor costs:
   - Visit https://platform.openai.com/usage
   - Each idea shred costs ~$0.02
   - Each interview analysis costs ~$0.03

3. **Watch the terminal** for API errors:
   - Next.js shows detailed error messages
   - AI responses are logged in development

4. **Test with real data:**
   - Don't fake interview transcripts
   - The AI can detect BS
   - Real insights only come from real customers

---

**Ready to build?** Visit http://localhost:3000 and start validating your idea!
