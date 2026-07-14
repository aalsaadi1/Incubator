'use client'

// Praxo admin: course + knowledge base editor and ops mission control.
// Password-protected via PRAXO_ADMIN_PASSWORD (cookie set by the login route).

import { useCallback, useEffect, useState } from 'react'

interface AdminCourse {
  id: string
  slug: string
  title: string
  description: string
  coverEmoji: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  survey: unknown
  planTemplate: unknown
  _count?: { chunks: number; plans: number }
}

interface AdminChunk {
  id: string
  title: string
  content: string
  stepTags: string[]
}

interface OpsData {
  plans: {
    id: string
    userKey: string
    course: string
    status: string
    createdAt: string
    passed: number
    total: number
    steps: { order: number; title: string; status: string; gate: string; evidence: string | null; stuckCount: number }[]
  }[]
  stuckHotspots: { course: string; step: string; count: number; reasons: string[] }[]
  sessions: { id: string; course: string; userKey: string; startedAt: string; endedAt: string | null }[]
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; details?: unknown } | null
    throw new Error(body?.details ? JSON.stringify(body.details, null, 2) : body?.error || `Error ${res.status}`)
  }
  return res.json() as Promise<T>
}

export default function PraxoAdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<'courses' | 'ops'>('courses')

  useEffect(() => {
    api('/api/praxo/admin/courses')
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false))
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-black text-white">
            Praxo<span className="text-indigo-400"> Admin</span>
          </h1>
          {authed && (
            <nav className="flex gap-2">
              {(['courses', 'ops'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${
                    tab === t ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {t === 'courses' ? 'Courses & KB' : 'Learners & Ops'}
                </button>
              ))}
            </nav>
          )}
        </header>

        {authed === null && <p className="text-slate-400">Loading…</p>}
        {authed === false && <AdminLogin onSuccess={() => setAuthed(true)} />}
        {authed && tab === 'courses' && <CoursesTab />}
        {authed && tab === 'ops' && <OpsTab />}
      </div>
    </main>
  )
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    try {
      await api('/api/praxo/admin/login', { method: 'POST', body: JSON.stringify({ password }) })
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
      <p className="text-sm text-slate-400">Admin password</p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void submit()}
        className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-center text-white outline-none focus:border-indigo-400"
        autoFocus
      />
      <button
        onClick={() => void submit()}
        className="mt-3 w-full rounded-lg bg-indigo-500 py-2.5 font-semibold text-white hover:bg-indigo-400"
      >
        Sign in
      </button>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  )
}

// --- Courses & KB tab ----------------------------------------------------------

function CoursesTab() {
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [selected, setSelected] = useState<AdminCourse | null>(null)
  const [chunks, setChunks] = useState<AdminChunk[]>([])
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { courses } = await api<{ courses: AdminCourse[] }>('/api/praxo/admin/courses')
    setCourses(courses)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCourse = async (id: string) => {
    const { course } = await api<{ course: AdminCourse & { chunks: AdminChunk[] } }>(
      `/api/praxo/admin/courses/${id}`
    )
    setSelected(course)
    setChunks(course.chunks)
    setMessage(null)
  }

  const loadStarter = async () => {
    setMessage('⏳ Loading the starter course (indexing the knowledge base takes ~15 seconds)…')
    try {
      const res = await api<{ course: string; chunks: number }>('/api/praxo/admin/seed', {
        method: 'POST',
      })
      setMessage(`✅ "${res.course}" is live with ${res.chunks} knowledge entries.`)
      await load()
    } catch (e) {
      setMessage(`⚠️ ${e instanceof Error ? e.message : 'Seed failed'}`)
    }
  }

  if (!selected) {
    return (
      <div className="space-y-3">
        {message && <p className="rounded-lg bg-slate-900 px-4 py-2 text-sm">{message}</p>}
        {courses.length === 0 && (
          <div className="rounded-2xl border border-indigo-500/40 bg-slate-900 p-6 text-center">
            <p className="font-semibold text-white">No courses yet.</p>
            <p className="mt-1 text-sm text-slate-400">
              Load the starter course — “Run Your First Ad Campaign” — to get Praxo live in one click.
            </p>
            <button
              onClick={() => void loadStarter()}
              className="mt-4 rounded-lg bg-indigo-500 px-5 py-2 font-semibold text-white hover:bg-indigo-400"
            >
              Load starter course
            </button>
          </div>
        )}
        {courses.map((c) => (
          <button
            key={c.id}
            onClick={() => void openCourse(c.id)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 text-left hover:border-indigo-500/60"
          >
            <div>
              <span className="mr-2">{c.coverEmoji}</span>
              <span className="font-semibold text-white">{c.title}</span>
              <span className="ml-3 text-xs text-slate-500">/{c.slug}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>{c._count?.chunks ?? 0} KB entries</span>
              <span>{c._count?.plans ?? 0} learners</span>
              <span
                className={`rounded px-2 py-0.5 font-semibold ${
                  c.status === 'PUBLISHED' ? 'bg-green-500/15 text-green-400' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {c.status}
              </span>
            </div>
          </button>
        ))}
        <p className="pt-2 text-xs text-slate-500">
          New courses: duplicate an existing one's JSON for now — a full course wizard comes later.
        </p>
      </div>
    )
  }

  return (
    <CourseEditor
      course={selected}
      chunks={chunks}
      message={message}
      setMessage={setMessage}
      onBack={() => {
        setSelected(null)
        void load()
      }}
      onChunksChanged={() => void openCourse(selected.id)}
    />
  )
}

function CourseEditor({
  course,
  chunks,
  message,
  setMessage,
  onBack,
  onChunksChanged,
}: {
  course: AdminCourse
  chunks: AdminChunk[]
  message: string | null
  setMessage: (m: string | null) => void
  onBack: () => void
  onChunksChanged: () => void
}) {
  const [title, setTitle] = useState(course.title)
  const [description, setDescription] = useState(course.description)
  const [emoji, setEmoji] = useState(course.coverEmoji ?? '')
  const [status, setStatus] = useState(course.status)
  const [surveyJson, setSurveyJson] = useState(JSON.stringify(course.survey, null, 2))
  const [templateJson, setTemplateJson] = useState(JSON.stringify(course.planTemplate, null, 2))
  const [newChunk, setNewChunk] = useState({ title: '', content: '', stepTags: '' })

  const save = async () => {
    setMessage(null)
    let survey: unknown, planTemplate: unknown
    try {
      survey = JSON.parse(surveyJson)
      planTemplate = JSON.parse(templateJson)
    } catch {
      setMessage('⚠️ Survey or template is not valid JSON — check for missing commas/brackets.')
      return
    }
    try {
      await api(`/api/praxo/admin/courses/${course.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title, description, coverEmoji: emoji || undefined, status, survey, planTemplate }),
      })
      setMessage('✅ Saved.')
    } catch (e) {
      setMessage(`⚠️ ${e instanceof Error ? e.message : 'Save failed'}`)
    }
  }

  const addChunk = async () => {
    setMessage(null)
    try {
      await api(`/api/praxo/admin/courses/${course.id}/chunks`, {
        method: 'POST',
        body: JSON.stringify({
          title: newChunk.title,
          content: newChunk.content,
          stepTags: newChunk.stepTags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      })
      setNewChunk({ title: '', content: '', stepTags: '' })
      onChunksChanged()
      setMessage('✅ Knowledge added and indexed.')
    } catch (e) {
      setMessage(`⚠️ ${e instanceof Error ? e.message : 'Add failed'}`)
    }
  }

  const deleteChunk = async (id: string) => {
    await api(`/api/praxo/admin/chunks/${id}`, { method: 'DELETE' })
    onChunksChanged()
  }

  const field = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400'

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-200">
        ← All courses
      </button>

      {message && <p className="rounded-lg bg-slate-900 px-4 py-2 text-sm">{message}</p>}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 font-bold text-white">Course settings</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <div className="flex gap-3">
            <input className={`${field} w-20`} value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="📣" />
            <select className={field} value={status} onChange={(e) => setStatus(e.target.value as AdminCourse['status'])}>
              <option value="DRAFT">Draft (hidden)</option>
              <option value="PUBLISHED">Published (live)</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
        <textarea className={`${field} mt-3`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-300">Survey (JSON)</summary>
          <textarea className={`${field} mt-2 font-mono text-xs`} rows={14} value={surveyJson} onChange={(e) => setSurveyJson(e.target.value)} />
        </details>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-300">Step template & gates (JSON)</summary>
          <textarea className={`${field} mt-2 font-mono text-xs`} rows={18} value={templateJson} onChange={(e) => setTemplateJson(e.target.value)} />
        </details>
        <button onClick={() => void save()} className="mt-4 rounded-lg bg-indigo-500 px-5 py-2 font-semibold text-white hover:bg-indigo-400">
          Save course
        </button>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-1 font-bold text-white">Knowledge base ({chunks.length})</h2>
        <p className="mb-4 text-xs text-slate-500">
          What the teacher is allowed to teach from. Each entry is indexed for search automatically on save.
        </p>
        <div className="space-y-2">
          {chunks.map((chunk) => (
            <details key={chunk.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                {chunk.title}
                <span className="ml-2 text-xs font-normal text-slate-500">{chunk.stepTags.join(', ')}</span>
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-400">{chunk.content}</p>
              <button onClick={() => void deleteChunk(chunk.id)} className="mt-2 text-xs text-red-400 hover:text-red-300">
                Delete
              </button>
            </details>
          ))}
        </div>
        <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
          <input className={field} placeholder="New entry title" value={newChunk.title} onChange={(e) => setNewChunk({ ...newChunk, title: e.target.value })} />
          <textarea className={field} rows={4} placeholder="Content the teacher can use…" value={newChunk.content} onChange={(e) => setNewChunk({ ...newChunk, content: e.target.value })} />
          <input className={field} placeholder="Related step ids, comma-separated (e.g. campaign, checkin)" value={newChunk.stepTags} onChange={(e) => setNewChunk({ ...newChunk, stepTags: e.target.value })} />
          <button
            onClick={() => void addChunk()}
            disabled={newChunk.title.length < 3 || newChunk.content.length < 20}
            className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-40"
          >
            Add knowledge
          </button>
        </div>
      </section>
    </div>
  )
}

// --- Ops tab ---------------------------------------------------------------------

function OpsTab() {
  const [data, setData] = useState<OpsData | null>(null)

  useEffect(() => {
    void api<OpsData>('/api/praxo/admin/ops').then(setData)
  }, [])

  if (!data) return <p className="text-slate-400">Loading…</p>

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-bold text-white">🔥 Where learners get stuck</h2>
        {data.stuckHotspots.length === 0 && <p className="text-sm text-slate-500">No stuck flags yet — good sign (or no learners yet).</p>}
        <div className="space-y-2">
          {data.stuckHotspots.map((h, i) => (
            <div key={i} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <span className="font-semibold text-amber-300">{h.count}×</span>{' '}
              <span className="text-white">{h.step}</span>
              <span className="ml-2 text-slate-500">({h.course})</span>
              {h.reasons.length > 0 && <p className="mt-1 text-xs text-slate-400">“{h.reasons[0]}”</p>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-white">Learners ({data.plans.length})</h2>
        <div className="space-y-2">
          {data.plans.map((plan) => (
            <details key={plan.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
              <summary className="cursor-pointer text-sm">
                <span className="font-semibold text-white">{plan.course}</span>
                <span className="ml-2 text-slate-400">
                  {plan.passed}/{plan.total} steps
                </span>
                <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-semibold ${plan.status === 'COMPLETED' ? 'bg-green-500/15 text-green-400' : 'bg-slate-700 text-slate-300'}`}>
                  {plan.status}
                </span>
                <span className="ml-2 font-mono text-xs text-slate-600">{plan.userKey.slice(0, 12)}…</span>
              </summary>
              <ul className="mt-3 space-y-1.5">
                {plan.steps.map((s) => (
                  <li key={s.order} className="text-xs">
                    <span className="text-slate-300">
                      {s.status === 'PASSED' ? '✅' : s.status === 'CURRENT' ? '👉' : '🔒'} {s.order}. {s.title}
                    </span>
                    {s.stuckCount > 0 && <span className="ml-2 text-amber-400">stuck ×{s.stuckCount}</span>}
                    {s.evidence && <p className="ml-6 mt-0.5 text-slate-500">evidence: {s.evidence}</p>}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-white">Voice sessions ({data.sessions.length})</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2">Course</th>
                <th className="px-3 py-2">Learner</th>
                <th className="px-3 py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s) => (
                <tr key={s.id} className="border-t border-slate-800/60 text-slate-300">
                  <td className="px-3 py-2">{new Date(s.startedAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{s.course}</td>
                  <td className="px-3 py-2 font-mono text-slate-500">{s.userKey.slice(0, 12)}…</td>
                  <td className="px-3 py-2">
                    {s.endedAt ? `${Math.max(1, Math.round((+new Date(s.endedAt) - +new Date(s.startedAt)) / 60000))} min` : 'live / unclosed'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
