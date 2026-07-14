import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authenticatePraxo } from '@/lib/praxo/auth'

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('complete'), evidence: z.string().min(10).max(2000) }),
  z.object({ action: z.literal('flag_stuck'), reason: z.string().min(5).max(1000) }),
])

// POST /api/praxo/steps/:stepId — the agent's complete_step / flag_stuck tools.
export async function POST(req: NextRequest, { params }: { params: Promise<{ stepId: string }> }) {
  const caller = authenticatePraxo(req)
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = actionSchema.parse(await req.json())
    const { stepId } = await params

    const step = await prisma.praxoStep.findUnique({
      where: { id: stepId },
      include: { plan: { include: { steps: { orderBy: { order: 'asc' } } } } },
    })
    if (!step || step.plan.userKey !== caller.userKey) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 })
    }

    if (body.action === 'flag_stuck') {
      const flags = Array.isArray(step.stuckFlags) ? step.stuckFlags : []
      const updated = await prisma.praxoStep.update({
        where: { id: step.id },
        data: { stuckFlags: [...flags, { reason: body.reason, at: new Date().toISOString() }] },
      })
      return NextResponse.json({ step: updated })
    }

    // complete: only the CURRENT step can pass its gate
    if (step.status !== 'CURRENT') {
      return NextResponse.json({ error: 'Step is not the current step' }, { status: 409 })
    }

    const next = step.plan.steps.find((s) => s.order === step.order + 1)

    const updated = await prisma.$transaction(async (tx) => {
      const passed = await tx.praxoStep.update({
        where: { id: step.id },
        data: { status: 'PASSED', evidence: body.evidence, passedAt: new Date() },
      })
      if (next) {
        await tx.praxoStep.update({ where: { id: next.id }, data: { status: 'CURRENT' } })
      } else {
        await tx.praxoCoursePlan.update({
          where: { id: step.planId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        })
      }
      return passed
    })

    return NextResponse.json({
      step: updated,
      nextStepId: next?.id ?? null,
      planCompleted: !next,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    console.error('Praxo step update failed:', error)
    return NextResponse.json({ error: 'Step update failed' }, { status: 500 })
  }
}
