import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { shredIdea } from '@/lib/ai'
import { z } from 'zod'

const ideaSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(2000),
  targetMarket: z.string().min(5).max(500),
  problem: z.string().min(10).max(1000),
  solution: z.string().min(10).max(1000),
  companyId: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = ideaSchema.parse(body)

    // Check if user is a member of this company
    const membership = await prisma.companyMember.findFirst({
      where: {
        companyId: validatedData.companyId,
        userId: session.user.id,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this company' }, { status: 403 })
    }

    // Run the AI Shredder
    const shredderResult = await shredIdea({
      title: validatedData.title,
      description: validatedData.description,
      targetMarket: validatedData.targetMarket,
      problem: validatedData.problem,
      solution: validatedData.solution,
    })

    // Save or update the idea
    const idea = await prisma.idea.upsert({
      where: { companyId: validatedData.companyId },
      create: {
        companyId: validatedData.companyId,
        title: validatedData.title,
        description: validatedData.description,
        targetMarket: validatedData.targetMarket,
        problem: validatedData.problem,
        solution: validatedData.solution,
        status: 'BEING_SHREDDED',
        shredderReport: JSON.stringify(shredderResult),
        competitorsMissed: JSON.stringify(shredderResult.competitorsMissed),
        economicFlaws: JSON.stringify(shredderResult.economicFlaws),
      },
      update: {
        title: validatedData.title,
        description: validatedData.description,
        targetMarket: validatedData.targetMarket,
        problem: validatedData.problem,
        solution: validatedData.solution,
        status: 'BEING_SHREDDED',
        shredderReport: JSON.stringify(shredderResult),
        competitorsMissed: JSON.stringify(shredderResult.competitorsMissed),
        economicFlaws: JSON.stringify(shredderResult.economicFlaws),
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        companyId: validatedData.companyId,
        userId: session.user.id,
        type: 'IDEA_SUBMITTED',
        title: 'Idea submitted for validation',
        description: `Submitted "${validatedData.title}" to the Idea Shredder`,
        metadata: JSON.stringify({ ideaId: idea.id }),
      },
    })

    return NextResponse.json({
      success: true,
      idea,
      shredderResult,
    })
  } catch (error) {
    console.error('Error shredding idea:', error)
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
