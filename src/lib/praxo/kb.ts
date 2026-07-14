import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const EMBEDDING_MODEL = 'text-embedding-3-small'

export async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  })
  return res.data[0].embedding
}

function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}

export interface KbHit {
  id: string
  title: string
  content: string
  score: number
}

// Course KBs are small (tens of chunks), so we score in-process instead of
// running pgvector. Revisit if a course KB grows past ~1k chunks.
export async function searchKb(courseId: string, query: string, topK = 4): Promise<KbHit[]> {
  const [queryEmbedding, chunks] = await Promise.all([
    embed(query),
    prisma.praxoKbChunk.findMany({ where: { courseId } }),
  ])

  return chunks
    .map((chunk) => ({
      id: chunk.id,
      title: chunk.title,
      content: chunk.content,
      score: Array.isArray(chunk.embedding)
        ? cosine(queryEmbedding, chunk.embedding as number[])
        : 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
