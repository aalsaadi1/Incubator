import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateMomTestQuestions } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { companyId } = await req.json()

    // Get the company and idea
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { idea: true },
    })

    if (!company || !company.idea) {
      return NextResponse.json(
        { error: 'Company or idea not found' },
        { status: 404 }
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

    // Generate questions
    const questions = await generateMomTestQuestions({
      title: company.idea.title,
      problem: company.idea.problem,
      targetMarket: company.idea.targetMarket,
    })

    return NextResponse.json({ success: true, questions })
  } catch (error) {
    console.error('Error generating questions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
