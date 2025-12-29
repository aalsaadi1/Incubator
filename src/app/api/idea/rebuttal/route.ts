import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { evaluateRebuttal, IdeaShredderResult } from '@/lib/ai'
import { z } from 'zod'

const rebuttalSchema = z.object({
  ideaId: z.string(),
  rebuttal: z.string().min(50).max(5000),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = rebuttalSchema.parse(body)

    // Get the idea
    const idea = await prisma.idea.findUnique({
      where: { id: validatedData.ideaId },
      include: { company: true },
    })

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    // Check if user is a member
    const membership = await prisma.companyMember.findFirst({
      where: {
        companyId: idea.companyId,
        userId: session.user.id,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (!idea.shredderReport) {
      return NextResponse.json(
        { error: 'No shredder report found. Submit idea first.' },
        { status: 400 }
      )
    }

    const shredderReport = JSON.parse(idea.shredderReport) as IdeaShredderResult

    // Evaluate the rebuttal
    const evaluation = await evaluateRebuttal(
      {
        title: idea.title,
        description: idea.description,
        problem: idea.problem,
        solution: idea.solution,
      },
      shredderReport,
      validatedData.rebuttal
    )

    // Update the idea with rebuttal and score
    const updatedIdea = await prisma.idea.update({
      where: { id: idea.id },
      data: {
        founderRebuttal: validatedData.rebuttal,
        aiConvincedScore: evaluation.convincedScore,
        status:
          evaluation.convincedScore >= 70
            ? 'PASSED_VALIDATION'
            : evaluation.convincedScore >= 40
            ? 'IN_REVISION'
            : 'FAILED_VALIDATION',
      },
    })

    // If passed, unlock next phase
    if (evaluation.convincedScore >= 70) {
      await prisma.company.update({
        where: { id: idea.companyId },
        data: {
          currentPhase: 'BUILD_AND_LAUNCH',
          isPhaseUnlocked: true,
        },
      })

      // Log phase unlock
      await prisma.activityLog.create({
        data: {
          companyId: idea.companyId,
          userId: session.user.id,
          type: 'PHASE_UNLOCKED',
          title: 'Passed Idea Validation',
          description: `Convinced the AI (Score: ${evaluation.convincedScore}/100). Build & Launch phase unlocked!`,
          impactScore: 100,
        },
      })
    } else {
      // Log failed attempt
      await prisma.activityLog.create({
        data: {
          companyId: idea.companyId,
          userId: session.user.id,
          type: 'REBUTTAL_SUBMITTED',
          title: 'Submitted rebuttal to Idea Shredder',
          description: `AI Convinced Score: ${evaluation.convincedScore}/100`,
          impactScore: 10,
        },
      })
    }

    return NextResponse.json({
      success: true,
      evaluation,
      idea: updatedIdea,
      phaseUnlocked: evaluation.convincedScore >= 70,
    })
  } catch (error) {
    console.error('Error evaluating rebuttal:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
