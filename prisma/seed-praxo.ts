/**
 * CLI seed for the starter Praxo course ("Run Your First Ad Campaign").
 *
 * Usage: npx tsx prisma/seed-praxo.ts   (needs DATABASE_URL; OPENAI_API_KEY
 * for embeddings). Non-technical alternative: the "Load starter course"
 * button in /praxo/admin runs the same seed server-side.
 */
import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import { adsCourse } from '../src/lib/praxo/seed-data'

const prisma = new PrismaClient()

async function main() {
  const openaiKey = process.env.OPENAI_API_KEY
  const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null
  if (!openai) {
    console.warn('⚠️  OPENAI_API_KEY not set — seeding chunks without embeddings.')
  }

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
    let embedding: number[] | undefined
    if (openai) {
      const res = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: `${chunk.title}\n\n${chunk.content}`,
      })
      embedding = res.data[0].embedding
    }
    await prisma.praxoKbChunk.create({
      data: { courseId: course.id, ...chunk, embedding },
    })
  }

  console.log(`✅ Seeded course "${course.title}" with ${adsCourse.kbChunks.length} KB chunks.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
