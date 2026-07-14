// Client-side shapes for the Praxo web app (mirror of docs/praxo/API.md).

export interface WebCourse {
  id: string
  slug: string
  title: string
  description: string
  coverEmoji: string | null
  survey: {
    intro: string
    questions: {
      id: string
      question: string
      type: 'single_choice' | 'multi_choice' | 'text'
      options?: string[]
      required: boolean
    }[]
  }
}

export interface WebStep {
  id: string
  order: number
  title: string
  goal: string
  instructions: string
  gate: string
  status: 'LOCKED' | 'CURRENT' | 'PASSED'
}

export interface WebPlan {
  id: string
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED'
  steps: WebStep[]
  course?: { slug: string; title: string; coverEmoji: string | null }
}

export async function praxoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (res.status === 401) throw new PraxoAuthError()
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error || `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export class PraxoAuthError extends Error {
  constructor() {
    super('Not signed in')
    this.name = 'PraxoAuthError'
  }
}
