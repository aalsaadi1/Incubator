import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticatePraxoAdmin } from '@/lib/praxo/auth'
import { embed } from '@/lib/praxo/kb'
import { adsCourse } from '@/lib/praxo/seed-data'

// POST /api/praxo/admin/seed — load (or refresh) the starter ads course.
// Runs on the server where the database and OpenAI are reachable, so a
// non-technical admin can set up the whole product from the dashboard.
export async function POST(req: NextRequest) {
  if (!authenticatePraxoAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const course = await prisma.praxoCourse.upsert({
      where: { slug: adsCourse.slug },
      create: {
        slug: adsCourse.slug,
        title: adsCourse.title,
        description: adsCourse.description,
        coverEmoji: adsCourse.coverEmoji,
        status: 'PUBLISHED',
        survey: adsCourse.survey,
        planTemplate: adsCourse.planTemplate,
      },
      update: {
        survey: adsCourse.survey,
        planTemplate: adsCourse.planTemplate,
        status: 'PUBLISHED',
      },
    })

    await prisma.praxoKbChunk.deleteMany({ where: { courseId: course.id } })
    for (const chunk of adsCourse.kbChunks) {
      const embedding = await embed(`${chunk.title}\n\n${chunk.content}`)
      await prisma.praxoKbChunk.create({
        data: { courseId: course.id, ...chunk, embedding },
      })
    }

    return NextResponse.json({
      ok: true,
      course: course.title,
      chunks: adsCourse.kbChunks.length,
    })
  } catch (error) {
    console.error('Praxo starter seed failed:', error)
    return NextResponse.json(
      { error: `Seed failed: ${error instanceof Error ? error.message : 'unknown error'}` },
      { status: 500 }
    )
  }
}
