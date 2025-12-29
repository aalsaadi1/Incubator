import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const interviewSchema = z.object({
  companyId: z.string(),
  intervieweeEmail: z.string().email().optional(),
  intervieweeName: z.string().optional(),
  transcript: z.string().min(50),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = interviewSchema.parse(body)

    // Check membership
    const membership = await prisma.companyMember.findFirst({
      where: {
        companyId: validatedData.companyId,
        userId: session.user.id,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Create interview
    const interview = await prisma.interview.create({
      data: {
        companyId: validatedData.companyId,
        intervieweeEmail: validatedData.intervieweeEmail,
        intervieweeName: validatedData.intervieweeName,
        transcript: validatedData.transcript,
        notes: validatedData.notes,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        companyId: validatedData.companyId,
        userId: session.user.id,
        type: 'USER_INTERVIEW',
        title: 'Completed customer interview',
        description: `Interviewed ${validatedData.intervieweeName || 'a potential customer'}`,
        impactScore: 20,
      },
    })

    return NextResponse.json({ success: true, interview })
  } catch (error) {
    console.error('Error creating interview:', error)
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

    // Get interviews
    const interviews = await prisma.interview.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, interviews })
  } catch (error) {
    console.error('Error fetching interviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
