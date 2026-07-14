// Shared shapes for Praxo course content stored in Json columns.

export interface SurveyQuestion {
  id: string
  question: string
  type: 'single_choice' | 'multi_choice' | 'text'
  options?: string[]
  required: boolean
}

export interface SurveyDefinition {
  intro: string
  questions: SurveyQuestion[]
}

// One step in the authored course skeleton. `gate` is authored, never
// generated — the plan generator personalizes wording but cannot remove it.
export interface TemplateStep {
  id: string
  title: string
  goal: string
  baseInstructions: string
  gate: string
  // Survey conditions under which this step is skipped, e.g. the "install
  // pixel" step when the learner already has one. Keys are question ids,
  // values are answers that make the step unnecessary.
  skipIf?: Record<string, string[]>
}

export interface PlanTemplate {
  teacherPersona: string
  steps: TemplateStep[]
}

export interface GeneratedStep {
  templateId: string
  title: string
  goal: string
  instructions: string
  gate: string
}
