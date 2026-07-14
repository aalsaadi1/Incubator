import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authenticatePraxo } from '@/lib/praxo/auth'
import { buildTeacherInstructions } from '@/lib/praxo/plan-generator'
import type { PlanTemplate } from '@/lib/praxo/types'

const tokenSchema = z.object({ planId: z.string() })

// Tools the voice teacher can call. look_at_screen and point_at are executed
// by the Mac app; the rest are relayed by the app to this backend.
const TEACHER_TOOLS = [
  {
    type: 'function',
    name: 'look_at_screen',
    description:
      "Capture the learner's screen and attach it to the conversation. Use before verifying a gate or when the learner asks about something they're looking at.",
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function',
    name: 'point_at',
    description:
      'Point the on-screen cursor halo at a location to show the learner where to click. Coordinates are fractions of the screen (0-1).',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'Horizontal position, 0 (left) to 1 (right)' },
        y: { type: 'number', description: 'Vertical position, 0 (top) to 1 (bottom)' },
        label: { type: 'string', description: 'Short label of what is being pointed at' },
      },
      required: ['x', 'y', 'label'],
    },
  },
  {
    type: 'function',
    name: 'kb_search',
    description: 'Search the course knowledge base. Use before answering substantive course questions.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    type: 'function',
    name: 'complete_step',
    description:
      "Mark the current step's gate as passed. Only call after verifying the gate criterion, with concrete evidence of what you observed.",
    parameters: {
      type: 'object',
      properties: {
        step_id: { type: 'string' },
        evidence: { type: 'string', description: 'What you verified, specifically' },
      },
      required: ['step_id', 'evidence'],
    },
  },
  {
    type: 'function',
    name: 'flag_stuck',
    description: 'Record that the learner is stuck on the current step and why.',
    parameters: {
      type: 'object',
      properties: {
        step_id: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['step_id', 'reason'],
    },
  },
]

// POST /api/praxo/realtime/token — mints an ephemeral OpenAI Realtime client
// secret configured as this plan's teacher, so the real API key never
// reaches the Mac app. Also opens a PraxoSession for cost/usage tracking.
export async function POST(req: NextRequest) {
  const caller = authenticatePraxo(req)
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { planId } = tokenSchema.parse(await req.json())

    const plan = await prisma.praxoCoursePlan.findUnique({
      where: { id: planId },
      include: { course: true, steps: { orderBy: { order: 'asc' } } },
    })
    if (!plan || plan.userKey !== caller.userKey) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Cost guardrail: cap voice sessions per learner per day.
    const maxPerDay = Number(process.env.PRAXO_MAX_SESSIONS_PER_DAY || 10)
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const sessionsToday = await prisma.praxoSession.count({
      where: { plan: { userKey: caller.userKey }, startedAt: { gte: dayStart } },
    })
    if (sessionsToday >= maxPerDay) {
      return NextResponse.json(
        { error: 'Daily session limit reached. Come back tomorrow — your plan will be waiting.' },
        { status: 429 }
      )
    }

    const template = plan.course.planTemplate as unknown as PlanTemplate
    const instructions = buildTeacherInstructions({
      persona: template.teacherPersona,
      courseTitle: plan.course.title,
      steps: plan.steps,
    })

    const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: process.env.PRAXO_REALTIME_MODEL || 'gpt-realtime',
          instructions,
          tools: TEACHER_TOOLS,
          audio: { output: { voice: process.env.PRAXO_TEACHER_VOICE || 'marin' } },
        },
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('Realtime token minting failed:', res.status, detail)
      return NextResponse.json({ error: 'Could not start voice session' }, { status: 502 })
    }

    const secret = await res.json()

    const session = await prisma.praxoSession.create({ data: { planId: plan.id } })

    return NextResponse.json({
      clientSecret: secret.value ?? secret.client_secret?.value,
      expiresAt: secret.expires_at ?? secret.client_secret?.expires_at,
      sessionId: session.id,
      model: process.env.PRAXO_REALTIME_MODEL || 'gpt-realtime',
      currentStep: plan.steps.find((s) => s.status === 'CURRENT') ?? null,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    console.error('Praxo realtime token error:', error)
    return NextResponse.json({ error: 'Token minting failed' }, { status: 500 })
  }
}
