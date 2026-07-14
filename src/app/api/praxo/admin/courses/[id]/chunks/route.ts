import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authenticatePraxoAdmin } from '@/lib/praxo/auth'
import { chunkSchema } from '@/lib/praxo/admin-schemas'
import { embed } from '@/lib/praxo/kb'

// POST /api/praxo/admin/courses/:id/chunks — add a KB chunk (auto-embeds).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authenticatePraxoAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const data = chunkSchema.parse(await req.json())

    const course = await prisma.praxoCourse.findUnique({ where: { id } })
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    const embedding = await embed(`${data.title}\n\n${data.content}`)
    const chunk = await prisma.praxoKbChunk.create({
      data: { courseId: id, ...data, embedding },
    })
    return NextResponse.json({ chunk }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid chunk', details: error.errors }, { status: 400 })
    }
    console.error('Admin chunk create failed:', error)
    return NextResponse.json({ error: 'Create failed' }, { status: 500 })
  }
}
