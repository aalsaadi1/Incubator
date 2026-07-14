import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticatePraxo } from '@/lib/praxo/auth'

// POST /api/praxo/sessions/:id/end — close out a voice session. Clients call
// this on disconnect (the web app also fires it via sendBeacon on unload).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = authenticatePraxo(req)
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const session = await prisma.praxoSession.findUnique({
    where: { id },
    include: { plan: { select: { userKey: true } } },
  })
  if (!session || session.plan.userKey !== caller.userKey) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (!session.endedAt) {
    await prisma.praxoSession.update({ where: { id }, data: { endedAt: new Date() } })
  }
  return NextResponse.json({ ok: true })
}
