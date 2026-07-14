import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authenticatePraxoAdmin } from '@/lib/praxo/auth'
import { courseCreateSchema } from '@/lib/praxo/admin-schemas'

// GET /api/praxo/admin/courses — all courses incl. drafts, with counts.
export async function GET(req: NextRequest) {
  if (!authenticatePraxoAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const courses = await prisma.praxoCourse.findMany({
    include: { _count: { select: { chunks: true, plans: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ courses })
}

// POST /api/praxo/admin/courses — create a course.
export async function POST(req: NextRequest) {
  if (!authenticatePraxoAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = courseCreateSchema.parse(await req.json())
    const course = await prisma.praxoCourse.create({
      data: { ...data, status: data.status ?? 'DRAFT' },
    })
    return NextResponse.json({ course }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid course', details: error.errors }, { status: 400 })
    }
    console.error('Admin course create failed:', error)
    return NextResponse.json({ error: 'Create failed' }, { status: 500 })
  }
}
