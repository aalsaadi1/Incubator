import OpenAI from 'openai'
import type { GeneratedStep, PlanTemplate, TemplateStep } from './types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function applySkips(steps: TemplateStep[], answers: Record<string, string>): TemplateStep[] {
  return steps.filter((step) => {
    if (!step.skipIf) return true
    return !Object.entries(step.skipIf).some(([questionId, skipAnswers]) =>
      skipAnswers.includes(answers[questionId])
    )
  })
}

// Personalizes the authored skeleton with one LLM call. Gates come from the
// template verbatim — the model rewrites titles/goals/instructions only, so
// it can't weaken or drop a verification criterion.
export async function generatePlan(
  template: PlanTemplate,
  surveyAnswers: Record<string, string>
): Promise<GeneratedStep[]> {
  const steps = applySkips(template.steps, surveyAnswers)

  const prompt = `You are a curriculum personalizer for a hands-on course. Rewrite each step of the course skeleton for THIS specific learner. Keep every step, keep the order, keep each step's intent. Make instructions concrete: use the learner's actual product, platform, and budget numbers from their survey answers. Instructions should be 2-5 sentences, actionable, no fluff.

LEARNER SURVEY ANSWERS:
${JSON.stringify(surveyAnswers, null, 2)}

COURSE SKELETON:
${JSON.stringify(
    steps.map(({ id, title, goal, baseInstructions }) => ({ id, title, goal, baseInstructions })),
    null,
    2
  )}

Return ONLY valid JSON in this shape:
{"steps": [{"id": "<same id as skeleton>", "title": "...", "goal": "...", "instructions": "..."}]}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  })

  const parsed = JSON.parse(completion.choices[0].message.content || '{}') as {
    steps?: { id: string; title: string; goal: string; instructions: string }[]
  }
  const byId = new Map((parsed.steps ?? []).map((s) => [s.id, s]))

  // The template is the source of truth for step existence and gates; the
  // model output only overrides wording where it produced a matching id.
  return steps.map((step) => {
    const generated = byId.get(step.id)
    return {
      templateId: step.id,
      title: generated?.title ?? step.title,
      goal: generated?.goal ?? step.goal,
      instructions: generated?.instructions ?? step.baseInstructions,
      gate: step.gate,
    }
  })
}

// System instructions for the Realtime voice teacher, built per session.
export function buildTeacherInstructions(args: {
  persona: string
  courseTitle: string
  steps: { order: number; title: string; goal: string; instructions: string; gate: string; status: string }[]
}): string {
  const current = args.steps.find((s) => s.status === 'CURRENT')
  const planSummary = args.steps
    .map((s) => `${s.order}. [${s.status}] ${s.title} — gate: ${s.gate}`)
    .join('\n')

  return `${args.persona}

You are teaching the course "${args.courseTitle}". The learner has a personalized step plan; your job is to get them through the CURRENT step by doing, not lecturing.

PLAN:
${planSummary}

CURRENT STEP:
${current ? `${current.title}\nGoal: ${current.goal}\nInstructions: ${current.instructions}\nGate: ${current.gate}` : 'All steps passed — run the graduation retro.'}

RULES:
- Work only on the current step. If the learner asks about later steps, give a one-line preview and steer back.
- Use kb_search before answering substantive course questions; ground answers in the returned chunks.
- Use look_at_screen when the learner is working in another app and you need to see their state, and point_at to show them exactly where to click.
- A step is complete ONLY when its gate is verifiably met. Verify with look_at_screen where possible, then call complete_step with concrete evidence. Never pass a gate on the learner's say-so alone when the gate is visible on screen.
- If the learner is stuck on the same obstacle after two attempts, call flag_stuck with a specific reason, then try a different approach.
- Keep spoken replies short — two or three sentences, then let the learner act.`
}
