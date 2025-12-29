import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInterviewSummary, InterviewAnalysis } from '@/lib/ai'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId required' },
        { status: 400 }
      )
    }

    // Check membership
    const membership = await prisma.companyMember.findFirst({
      where: {
        companyId,
        userId: session.user.id,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Get all analyzed interviews
    const interviews = await prisma.interview.findMany({
      where: {
        companyId,
        status: 'ANALYZED',
        insights: { not: null },
      },
    })

    if (interviews.length === 0) {
      return NextResponse.json(
        { error: 'No analyzed interviews found' },
        { status: 404 }
      )
    }

    // Parse insights
    const analyses: InterviewAnalysis[] = interviews
      .map((i: any) => {
        try {
          return JSON.parse(i.insights!)
        } catch {
          return null
        }
      })
      .filter((a: any): a is InterviewAnalysis => a !== null)

    if (analyses.length === 0) {
      return NextResponse.json(
        { error: 'No valid analyses found' },
        { status: 404 }
      )
    }

    // Generate summary
    const summary = await generateInterviewSummary(analyses)

    // Check if should unlock next phase (need 20 interviews)
    const shouldUnlock = interviews.length >= 20 && summary.verdict === 'VALIDATED'

    if (shouldUnlock) {
      await prisma.company.update({
        where: { id: companyId },
        data: {
          currentPhase: 'BUILD_AND_LAUNCH',
          isPhaseUnlocked: true,
        },
      })

      await prisma.activityLog.create({
        data: {
          companyId,
          userId: session.user.id,
          type: 'PHASE_UNLOCKED',
          title: 'Completed customer validation',
          description: `Completed ${interviews.length} interviews. Build & Launch phase unlocked!`,
          impactScore: 150,
        },
      })
    }

    return NextResponse.json({
      success: true,
      summary,
      interviewCount: interviews.length,
      phaseUnlocked: shouldUnlock,
      needsMore: 20 - interviews.length,
    })
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
