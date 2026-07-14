import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authenticatePraxo } from '@/lib/praxo/auth'
import { generatePlan } from '@/lib/praxo/plan-generator'
import type { PlanTemplate } from '@/lib/praxo/types'

const createPlanSchema = z.object({
  courseSlug: z.string(),
  surveyAnswers: z.record(z.string(), z.string()),
})

// POST /api/praxo/plans — survey answers in, personalized plan out.
export async function POST(req: NextRequest) {
  const caller = authenticatePraxo(req)
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { courseSlug, surveyAnswers } = createPlanSchema.parse(await req.json())

    const course = await prisma.praxoCourse.findUnique({ where: { slug: courseSlug } })
    if (!course || course.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const existing = await prisma.praxoCoursePlan.findFirst({
      where: { userKey: caller.userKey, courseId: course.id, status: 'ACTIVE' },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'An active plan for this course already exists', planId: existing.id },
        { status: 409 }
      )
    }

    const steps = await generatePlan(course.planTemplate as unknown as PlanTemplate, surveyAnswers)

    const plan = await prisma.praxoCoursePlan.create({
      data: {
        userKey: caller.userKey,
        courseId: course.id,
        surveyAnswers,
        steps: {
          create: steps.map((step, i) => ({
            order: i + 1,
            title: step.title,
            goal: step.goal,
            instructions: step.instructions,
            gate: step.gate,
            status: i === 0 ? 'CURRENT' : 'LOCKED',
          })),
        },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    console.error('Praxo plan creation failed:', error)
    return NextResponse.json({ error: 'Plan generation failed' }, { status: 500 })
  }
}

// GET /api/praxo/plans — the caller's plans with step progress.
export async function GET(req: NextRequest) {
  const caller = authenticatePraxo(req)
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plans = await prisma.praxoCoursePlan.findMany({
    where: { userKey: caller.userKey },
    include: {
      course: { select: { slug: true, title: true, coverEmoji: true } },
      steps: { orderBy: { order: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ plans })
}
