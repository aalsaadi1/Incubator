import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authenticatePraxoAdmin } from '@/lib/praxo/auth'
import { courseUpdateSchema } from '@/lib/praxo/admin-schemas'

// GET /api/praxo/admin/courses/:id — full course incl. survey/template JSON.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authenticatePraxoAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const course = await prisma.praxoCourse.findUnique({
    where: { id },
    include: { chunks: { orderBy: { createdAt: 'asc' } } },
  })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ course })
}

// PATCH /api/praxo/admin/courses/:id — update any editable field.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authenticatePraxoAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const data = courseUpdateSchema.parse(await req.json())
    const course = await prisma.praxoCourse.update({ where: { id }, data })
    return NextResponse.json({ course })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid update', details: error.errors }, { status: 400 })
    }
    console.error('Admin course update failed:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
