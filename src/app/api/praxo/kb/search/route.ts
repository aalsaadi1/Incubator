import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authenticatePraxo } from '@/lib/praxo/auth'
import { searchKb } from '@/lib/praxo/kb'

const searchSchema = z.object({
  planId: z.string(),
  query: z.string().min(2).max(500),
})

// POST /api/praxo/kb/search — the agent's kb_search tool.
export async function POST(req: NextRequest) {
  const caller = authenticatePraxo(req)
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { planId, query } = searchSchema.parse(await req.json())

    const plan = await prisma.praxoCoursePlan.findUnique({ where: { id: planId } })
    if (!plan || plan.userKey !== caller.userKey) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const hits = await searchKb(plan.courseId, query)
    return NextResponse.json({ hits })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    console.error('Praxo KB search failed:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
