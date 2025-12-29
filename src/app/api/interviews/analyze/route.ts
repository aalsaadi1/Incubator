import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeInterview } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { interviewId } = await req.json()

    // Get the interview
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        company: {
          include: { idea: true },
        },
      },
    })

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    if (!interview.company.idea) {
      return NextResponse.json({ error: 'No idea found for this company' }, { status: 400 })
    }

    // Check membership
    const membership = await prisma.companyMember.findFirst({
      where: {
        companyId: interview.companyId,
        userId: session.user.id,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Analyze the interview
    const analysis = await analyzeInterview(
      {
        title: interview.company.idea.title,
        problem: interview.company.idea.problem,
      },
      interview.transcript,
      interview.notes || undefined
    )

    // Update interview with analysis
    const updatedInterview = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        insights: JSON.stringify(analysis),
        hasProblem: analysis.hasProblem,
        wouldPay: analysis.wouldPay,
        painLevel: analysis.problemSeverity,
        status: 'ANALYZED',
      },
    })

    return NextResponse.json({
      success: true,
      analysis,
      interview: updatedInterview,
    })
  } catch (error) {
    console.error('Error analyzing interview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
