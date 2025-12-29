import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface IdeaShredderResult {
  verdict: 'LIKELY_TO_FAIL' | 'NEEDS_WORK' | 'PROMISING'
  whyYouWillFail: string[]
  competitorsMissed: { name: string; why: string }[]
  economicFlaws: { flaw: string; impact: string }[]
  overallScore: number // 0-100, how likely to succeed
  recommendations: string[]
}

export async function shredIdea(idea: {
  title: string
  description: string
  targetMarket: string
  problem: string
  solution: string
}): Promise<IdeaShredderResult> {
  const prompt = `You are a ruthless startup idea critic, trained on YC rejection emails, failed startup post-mortems, and contrarian analysis. Your job is to find EVERY reason why this startup idea will fail.

STARTUP IDEA:
Title: ${idea.title}
Description: ${idea.description}
Target Market: ${idea.targetMarket}
Problem: ${idea.problem}
Solution: ${idea.solution}

Your task:
1. List 3-5 specific reasons why this idea will FAIL
2. Identify 3-5 competitors they clearly missed (be specific, name real companies)
3. Point out 2-4 economic flaws in their business model
4. Give an overall score (0-100) where 0 = guaranteed failure, 100 = next unicorn
5. Provide brutal but actionable recommendations

BE RUTHLESS. Be specific. Use data and real examples. Don't be polite.

Return your response in this JSON format:
{
  "verdict": "LIKELY_TO_FAIL" | "NEEDS_WORK" | "PROMISING",
  "whyYouWillFail": ["reason 1", "reason 2", ...],
  "competitorsMissed": [
    {"name": "Company Name", "why": "They already solve this with..."},
    ...
  ],
  "economicFlaws": [
    {"flaw": "The flaw", "impact": "Why it matters"},
    ...
  ],
  "overallScore": 0-100,
  "recommendations": ["brutal recommendation 1", ...]
}

ONLY respond with valid JSON. No other text.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are a ruthless startup idea critic. Be brutally honest and specific.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const result = completion.choices[0].message.content
  if (!result) {
    throw new Error('No response from AI')
  }

  return JSON.parse(result) as IdeaShredderResult
}

export async function evaluateRebuttal(
  originalIdea: {
    title: string
    description: string
    problem: string
    solution: string
  },
  shredderReport: IdeaShredderResult,
  rebuttal: string
): Promise<{ convincedScore: number; aiResponse: string }> {
  const prompt = `You previously analyzed this startup idea and found major flaws:

ORIGINAL IDEA: ${originalIdea.title}
YOUR CRITIQUE:
${JSON.stringify(shredderReport, null, 2)}

THE FOUNDER'S REBUTTAL:
${rebuttal}

Evaluate their rebuttal. Did they:
1. Address the actual concerns with data/evidence?
2. Show deep market knowledge you missed?
3. Reveal defensible advantages?
4. Demonstrate pivot capability?

Score their rebuttal (0-100):
- 0-30: Weak, defensive, no new information
- 31-60: Some valid points but major concerns remain
- 61-80: Strong rebuttal, addressed most concerns
- 81-100: Excellent, convinced this could work

Return JSON:
{
  "convincedScore": 0-100,
  "aiResponse": "Your detailed response to their rebuttal"
}

Be honest. If they didn't address your concerns, say so. If they made good points, acknowledge it.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are evaluating a founder\'s rebuttal to your criticism.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.6,
  })

  const result = completion.choices[0].message.content
  if (!result) {
    throw new Error('No response from AI')
  }

  return JSON.parse(result)
}

// Mom Test Interview Generator

export interface MomTestQuestions {
  openingQuestions: string[]
  problemExplorationQuestions: string[]
  currentSolutionQuestions: string[]
  behavioralQuestions: string[]
  closingQuestions: string[]
}

export async function generateMomTestQuestions(idea: {
  title: string
  problem: string
  targetMarket: string
}): Promise<MomTestQuestions> {
  const prompt = `Generate Mom Test style interview questions for this startup idea:

Idea: ${idea.title}
Problem: ${idea.problem}
Target Market: ${idea.targetMarket}

The Mom Test principles:
1. Talk about their life, not your idea
2. Ask about specifics in the past, not generics or opinions about the future
3. Listen more than you talk

Generate 5 types of questions:
1. Opening Questions - Build rapport, understand their context
2. Problem Exploration - Understand if they actually have the problem
3. Current Solution Questions - What do they use now? How much do they pay?
4. Behavioral Questions - Past actions, not hypotheticals
5. Closing Questions - Referrals, next steps

BAD QUESTION EXAMPLE: "Would you use our app?"
GOOD QUESTION EXAMPLE: "Tell me about the last time you experienced [problem]. What did you do?"

Return JSON:
{
  "openingQuestions": ["question 1", ...],
  "problemExplorationQuestions": ["question 1", ...],
  "currentSolutionQuestions": ["question 1", ...],
  "behavioralQuestions": ["question 1", ...],
  "closingQuestions": ["question 1", ...]
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at The Mom Test methodology. Generate unbiased customer interview questions.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const result = completion.choices[0].message.content
  if (!result) {
    throw new Error('No response from AI')
  }

  return JSON.parse(result) as MomTestQuestions
}

export interface InterviewAnalysis {
  hasProblem: boolean
  problemSeverity: number // 1-10
  wouldPay: boolean
  currentSolution: string
  painPoints: string[]
  keyInsights: string[]
  redFlags: string[]
  recommendation: 'STRONG_LEAD' | 'MAYBE' | 'NOT_A_FIT'
  summary: string
}

export async function analyzeInterview(
  idea: {
    title: string
    problem: string
  },
  transcript: string,
  notes?: string
): Promise<InterviewAnalysis> {
  const prompt = `Analyze this customer interview for startup idea: "${idea.title}"

Problem being solved: ${idea.problem}

INTERVIEW TRANSCRIPT:
${transcript}

${notes ? `INTERVIEWER NOTES:\n${notes}` : ''}

Analyze:
1. Does the interviewee actually have this problem?
2. How severe is the problem? (1-10 scale)
3. Would they pay for a solution? (Evidence from their current behavior)
4. What are they using now?
5. What are the real pain points?
6. Key insights from this interview
7. Any red flags? (e.g., just being polite, no real problem, hypothetical interest)

Return JSON:
{
  "hasProblem": true/false,
  "problemSeverity": 1-10,
  "wouldPay": true/false,
  "currentSolution": "what they use now",
  "painPoints": ["pain point 1", ...],
  "keyInsights": ["insight 1", ...],
  "redFlags": ["red flag 1", ...],
  "recommendation": "STRONG_LEAD" | "MAYBE" | "NOT_A_FIT",
  "summary": "2-3 sentence summary of this interview"
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are analyzing a customer interview using The Mom Test principles. Be skeptical and look for real evidence, not just politeness.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  })

  const result = completion.choices[0].message.content
  if (!result) {
    throw new Error('No response from AI')
  }

  return JSON.parse(result) as InterviewAnalysis
}

export interface InterviewSummaryReport {
  totalInterviews: number
  hasProblemCount: number
  averagePainLevel: number
  wouldPayCount: number
  commonPainPoints: string[]
  topInsights: string[]
  majorRedFlags: string[]
  verdict: 'VALIDATED' | 'NEEDS_MORE_DATA' | 'PIVOT_REQUIRED'
  recommendation: string
}

export async function generateInterviewSummary(
  interviews: InterviewAnalysis[]
): Promise<InterviewSummaryReport> {
  const prompt = `Analyze these ${interviews.length} customer interviews:

${JSON.stringify(interviews, null, 2)}

Provide an overall summary:
1. How many people actually have the problem?
2. Average pain level
3. How many would actually pay (based on behavior, not promises)?
4. Common pain points across interviews
5. Top insights
6. Major red flags
7. Overall verdict: VALIDATED (strong evidence), NEEDS_MORE_DATA, or PIVOT_REQUIRED

Return JSON:
{
  "totalInterviews": number,
  "hasProblemCount": number,
  "averagePainLevel": number,
  "wouldPayCount": number,
  "commonPainPoints": ["pain point 1", ...],
  "topInsights": ["insight 1", ...],
  "majorRedFlags": ["red flag 1", ...],
  "verdict": "VALIDATED" | "NEEDS_MORE_DATA" | "PIVOT_REQUIRED",
  "recommendation": "Detailed recommendation on what to do next"
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are analyzing customer interview data. Be brutally honest about what the data shows.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  })

  const result = completion.choices[0].message.content
  if (!result) {
    throw new Error('No response from AI')
  }

  return JSON.parse(result) as InterviewSummaryReport
}
