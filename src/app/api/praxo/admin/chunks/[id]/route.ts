import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authenticatePraxoAdmin } from '@/lib/praxo/auth'
import { chunkSchema } from '@/lib/praxo/admin-schemas'
import { embed } from '@/lib/praxo/kb'

// PATCH /api/praxo/admin/chunks/:id — edit a KB chunk (re-embeds).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authenticatePraxoAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const data = chunkSchema.partial().parse(await req.json())

    const existing = await prisma.praxoKbChunk.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const title = data.title ?? existing.title
    const content = data.content ?? existing.content
    const embedding = await embed(`${title}\n\n${content}`)

    const chunk = await prisma.praxoKbChunk.update({
      where: { id },
      data: { ...data, embedding },
    })
    return NextResponse.json({ chunk })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid update', details: error.errors }, { status: 400 })
    }
    console.error('Admin chunk update failed:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

// DELETE /api/praxo/admin/chunks/:id — remove a KB chunk.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authenticatePraxoAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  try {
    await prisma.praxoKbChunk.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
