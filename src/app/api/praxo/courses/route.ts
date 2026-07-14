import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticatePraxo } from '@/lib/praxo/auth'

// GET /api/praxo/courses — the course cards for the Mac app's library view.
export async function GET(req: NextRequest) {
  const caller = authenticatePraxo(req)
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const courses = await prisma.praxoCourse.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      coverEmoji: true,
      survey: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ courses })
}
