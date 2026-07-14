'use client'

// Praxo learner app: access code → course cards → survey → plan → session.

import { useCallback, useEffect, useState } from 'react'
import TeacherSession from './_components/TeacherSession'
import { praxoFetch, PraxoAuthError, WebCourse, WebPlan } from './_lib/types'

type Stage =
  | { kind: 'loading' }
  | { kind: 'login' }
  | { kind: 'library' }
  | { kind: 'survey'; course: WebCourse }
  | { kind: 'plan'; plan: WebPlan }

export default function PraxoPage() {
  const [stage, setStage] = useState<Stage>({ kind: 'loading' })
  const [courses, setCourses] = useState<WebCourse[]>([])
  const [plans, setPlans] = useState<WebPlan[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (goTo?: 'library') => {
    try {
      const [{ courses }, { plans }] = await Promise.all([
        praxoFetch<{ courses: WebCourse[] }>('/api/praxo/courses'),
        praxoFetch<{ plans: WebPlan[] }>('/api/praxo/plans'),
      ])
      setCourses(courses)
      setPlans(plans)
      setStage((prev) =>
        goTo === 'library' || prev.kind === 'loading' || prev.kind === 'login'
          ? { kind: 'library' }
          : prev
      )
      return plans
    } catch (e) {
      if (e instanceof PraxoAuthError) setStage({ kind: 'login' })
      else setError(e instanceof Error ? e.message : 'Something went wrong.')
      return []
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const activePlanFor = (course: WebCourse) =>
    plans.find((p) => p.course?.slug === course.slug && p.status === 'ACTIVE')

  const refreshPlan = useCallback(
    async (planId: string) => {
      const fresh = await load()
      const updated = fresh.find((p) => p.id === planId)
      if (updated) setStage({ kind: 'plan', plan: updated })
    },
    [load]
  )

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <button
            onClick={() => setStage({ kind: 'library' })}
            className="text-2xl font-black tracking-tight text-white"
          >
            Praxo<span className="text-indigo-400">.</span>
          </button>
          {stage.kind !== 'login' && stage.kind !== 'loading' && (
            <span className="text-xs text-slate-500">learn by doing</span>
          )}
        </header>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {stage.kind === 'loading' && <p className="text-slate-400">Loading…</p>}
        {stage.kind === 'login' && <Login onSuccess={() => void load('library')} />}
        {stage.kind === 'library' && (
          <Library
            courses={courses}
            activePlanFor={activePlanFor}
            onPick={(course) => {
              const active = activePlanFor(course)
              setStage(active ? { kind: 'plan', plan: active } : { kind: 'survey', course })
            }}
          />
        )}
        {stage.kind === 'survey' && (
          <Survey
            course={stage.course}
            onDone={(plan) => {
              void load()
              setStage(plan ? { kind: 'plan', plan } : { kind: 'library' })
            }}
          />
        )}
        {stage.kind === 'plan' && (
          <PlanView plan={stage.plan} onStepPassed={() => void refreshPlan(stage.plan.id)} />
        )}
      </div>
    </main>
  )
}

// --- Login -------------------------------------------------------------------

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await praxoFetch('/api/praxo/web/login', { method: 'POST', body: JSON.stringify({ code }) })
      onSuccess()
    } catch (e) {
      setError(e instanceof PraxoAuthError ? 'That code is not valid.' : e instanceof Error ? e.message : 'Login failed.')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
      <h1 className="text-xl font-bold text-white">Welcome to Praxo</h1>
      <p className="mt-2 text-sm text-slate-400">Enter your access code to start learning.</p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && code.length >= 6 && void submit()}
        placeholder="Access code"
        className="mt-5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-center text-white outline-none focus:border-indigo-400"
        autoFocus
      />
      <button
        onClick={() => void submit()}
        disabled={busy || code.length < 6}
        className="mt-3 w-full rounded-lg bg-indigo-500 py-2.5 font-semibold text-white hover:bg-indigo-400 disabled:opacity-40"
      >
        {busy ? 'Checking…' : 'Enter'}
      </button>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  )
}

// --- Library -------------------------------------------------------------------

function Library({
  courses,
  activePlanFor,
  onPick,
}: {
  courses: WebCourse[]
  activePlanFor: (c: WebCourse) => WebPlan | undefined
  onPick: (c: WebCourse) => void
}) {
  return (
    <div>
      <h1 className="text-3xl font-black text-white">What do you want to get done?</h1>
      <p className="mt-2 text-slate-400">
        Pick a course. Your teacher builds the plan around you, then coaches you through it — live, on your real screen.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {courses.map((course) => {
          const active = activePlanFor(course)
          const progress = active
            ? `${active.steps.filter((s) => s.status === 'PASSED').length}/${active.steps.length} steps`
            : null
          return (
            <button
              key={course.id}
              onClick={() => onPick(course)}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:border-indigo-500/60 hover:bg-slate-900/60"
            >
              <div className="text-4xl">{course.coverEmoji ?? '🎓'}</div>
              <h2 className="mt-3 text-lg font-bold text-white">{course.title}</h2>
              <p className="mt-1 text-sm text-slate-400">{course.description}</p>
              <p className="mt-4 text-sm font-semibold text-indigo-400">
                {active ? `Continue → ${progress}` : 'Start →'}
              </p>
            </button>
          )
        })}
        {courses.length === 0 && <p className="text-slate-500">No courses published yet.</p>}
      </div>
    </div>
  )
}

// --- Survey -------------------------------------------------------------------

function Survey({ course, onDone }: { course: WebCourse; onDone: (plan: WebPlan | null) => void }) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const questions = course.survey.questions
  const question = questions[index]

  const answer = (value: string) => {
    const next = { ...answers, [question.id]: value }
    setAnswers(next)
    setDraft('')
    if (index + 1 < questions.length) setIndex(index + 1)
    else void submit(next)
  }

  const submit = async (finalAnswers: Record<string, string>) => {
    setBuilding(true)
    setError(null)
    try {
      const { plan } = await praxoFetch<{ plan: WebPlan }>('/api/praxo/plans', {
        method: 'POST',
        body: JSON.stringify({ courseSlug: course.slug, surveyAnswers: finalAnswers }),
      })
      onDone({ ...plan, course: { slug: course.slug, title: course.title, coverEmoji: course.coverEmoji } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Plan generation failed.')
      setBuilding(false)
    }
  }

  if (building) {
    return (
      <div className="py-24 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-400" />
        <p className="mt-6 text-lg font-semibold text-white">Your teacher is building your plan…</p>
        <p className="mt-1 text-sm text-slate-400">Personalizing every step to your answers. ~10 seconds.</p>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <button onClick={() => (index > 0 ? setIndex(index - 1) : onDone(null))} className="hover:text-slate-300">
          ← Back
        </button>
        <span>
          {index + 1} / {questions.length}
        </span>
      </div>

      {index === 0 && <p className="mt-6 text-slate-400">{course.survey.intro}</p>}
      <h2 className="mt-4 text-2xl font-bold text-white">{question.question}</h2>

      {question.type === 'text' ? (
        <div className="mt-6">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Type your answer…"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-400"
            autoFocus
          />
          <button
            onClick={() => draft.trim().length >= 3 && answer(draft.trim())}
            disabled={draft.trim().length < 3}
            className="mt-3 rounded-lg bg-indigo-500 px-5 py-2.5 font-semibold text-white hover:bg-indigo-400 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {(question.options ?? []).map((option) => (
            <button
              key={option}
              onClick={() => answer(option)}
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-left text-white transition hover:border-indigo-400"
            >
              {option}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  )
}

// --- Plan ---------------------------------------------------------------------

function PlanView({ plan, onStepPassed }: { plan: WebPlan; onStepPassed: () => void }) {
  const steps = [...plan.steps].sort((a, b) => a.order - b.order)
  const completed = plan.status === 'COMPLETED'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">
          {plan.course?.coverEmoji} {plan.course?.title}
        </h1>
        {completed && (
          <p className="mt-2 rounded-lg bg-green-500/10 px-4 py-2 font-semibold text-green-400">
            🎉 Course complete — you shipped the real thing.
          </p>
        )}
      </div>

      {!completed && <TeacherSession plan={plan} onStepPassed={onStepPassed} />}

      <ol className="space-y-2">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`rounded-xl border p-4 ${
              step.status === 'CURRENT'
                ? 'border-indigo-500/60 bg-slate-900'
                : 'border-slate-800 bg-slate-900/40'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">
                {step.status === 'PASSED' ? '✅' : step.status === 'CURRENT' ? '👉' : '🔒'}
              </span>
              <div>
                <p className={`font-semibold ${step.status === 'LOCKED' ? 'text-slate-500' : 'text-white'}`}>
                  {step.order}. {step.title}
                </p>
                {step.status === 'CURRENT' && (
                  <>
                    <p className="mt-1 text-sm text-slate-300">{step.instructions}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-400">
                      Done when: <span className="normal-case">{step.gate}</span>
                    </p>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
