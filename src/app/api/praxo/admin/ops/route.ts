import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticatePraxoAdmin } from '@/lib/praxo/auth'

// GET /api/praxo/admin/ops — mission control: learner plans with evidence,
// stuck-flag hotspots grouped by step, and recent voice sessions.
export async function GET(req: NextRequest) {
  if (!authenticatePraxoAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [plans, sessions] = await Promise.all([
    prisma.praxoCoursePlan.findMany({
      include: {
        course: { select: { title: true, slug: true } },
        steps: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.praxoSession.findMany({
      include: { plan: { select: { userKey: true, course: { select: { title: true } } } } },
      orderBy: { startedAt: 'desc' },
      take: 50,
    }),
  ])

  // Group stuck flags by course + step title — the course-improvement signal.
  const stuckMap = new Map<string, { course: string; step: string; count: number; reasons: string[] }>()
  for (const plan of plans) {
    for (const step of plan.steps) {
      const flags = Array.isArray(step.stuckFlags) ? (step.stuckFlags as { reason?: string }[]) : []
      if (flags.length === 0) continue
      const key = `${plan.course.slug}::${step.title}`
      const entry = stuckMap.get(key) ?? {
        course: plan.course.title,
        step: step.title,
        count: 0,
        reasons: [],
      }
      entry.count += flags.length
      entry.reasons.push(...flags.map((f) => f.reason ?? '').filter(Boolean).slice(0, 3))
      stuckMap.set(key, entry)
    }
  }
  const stuckHotspots = [...stuckMap.values()].sort((a, b) => b.count - a.count)

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      userKey: p.userKey,
      course: p.course.title,
      status: p.status,
      createdAt: p.createdAt,
      completedAt: p.completedAt,
      passed: p.steps.filter((s) => s.status === 'PASSED').length,
      total: p.steps.length,
      steps: p.steps.map((s) => ({
        order: s.order,
        title: s.title,
        status: s.status,
        gate: s.gate,
        evidence: s.evidence,
        passedAt: s.passedAt,
        stuckCount: Array.isArray(s.stuckFlags) ? s.stuckFlags.length : 0,
      })),
    })),
    stuckHotspots,
    sessions: sessions.map((s) => ({
      id: s.id,
      course: s.plan.course.title,
      userKey: s.plan.userKey,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      costCents: s.costCents,
    })),
  })
}
