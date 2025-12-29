'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ShredderResult {
  verdict: 'LIKELY_TO_FAIL' | 'NEEDS_WORK' | 'PROMISING'
  whyYouWillFail: string[]
  competitorsMissed: { name: string; why: string }[]
  economicFlaws: { flaw: string; impact: string }[]
  overallScore: number
  recommendations: string[]
}

export default function IdeaShredderPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [shredderResult, setShredderResult] = useState<ShredderResult | null>(null)
  const [ideaId, setIdeaId] = useState<string | null>(null)
  const [rebuttal, setRebuttal] = useState('')
  const [rebuttalResult, setRebuttalResult] = useState<any>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetMarket: '',
    problem: '',
    solution: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // For demo, we'll use a mock company ID
      // In production, this would come from the user's session
      const companyId = 'demo-company-id'

      const response = await fetch('/api/idea/shred', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, companyId }),
      })

      const data = await response.json()

      if (data.success) {
        setShredderResult(data.shredderResult)
        setIdeaId(data.idea.id)
        setShowResults(true)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to shred idea. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRebuttal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ideaId || !rebuttal) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/idea/rebuttal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, rebuttal }),
      })

      const data = await response.json()

      if (data.success) {
        setRebuttalResult(data.evaluation)

        if (data.phaseUnlocked) {
          setTimeout(() => {
            router.push('/dashboard')
          }, 3000)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to submit rebuttal. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'PROMISING': return 'text-green-400'
      case 'NEEDS_WORK': return 'text-yellow-400'
      case 'LIKELY_TO_FAIL': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            💀 The Idea Shredder
          </h1>
          <p className="text-xl text-slate-300">
            We don't validate ideas. We destroy them.
          </p>
          <p className="text-sm text-slate-400 mt-2">
            If your idea survives, it might be worth building.
          </p>
        </div>

        {!showResults ? (
          <form onSubmit={handleSubmit} className="space-y-6 bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20">
            <div>
              <label className="block text-white font-semibold mb-2">
                Idea Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Netflix for Pets"
                required
                minLength={5}
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What are you building?"
                rows={4}
                required
                minLength={20}
                maxLength={2000}
              />
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">
                Target Market
              </label>
              <input
                type="text"
                value={formData.targetMarket}
                onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Who are your customers?"
                required
                minLength={5}
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">
                Problem
              </label>
              <textarea
                value={formData.problem}
                onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What problem does this solve?"
                rows={3}
                required
                minLength={10}
                maxLength={1000}
              />
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">
                Solution
              </label>
              <textarea
                value={formData.solution}
                onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="How do you solve it?"
                rows={3}
                required
                minLength={10}
                maxLength={1000}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-colors"
            >
              {isLoading ? 'Shredding Your Idea...' : '💀 Shred My Idea'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Shredder Results */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20">
              <div className="text-center mb-6">
                <h2 className={`text-4xl font-bold ${getVerdictColor(shredderResult!.verdict)}`}>
                  {shredderResult!.verdict.replace('_', ' ')}
                </h2>
                <div className="mt-4">
                  <div className="text-6xl font-bold text-white">
                    {shredderResult!.overallScore}<span className="text-2xl">/100</span>
                  </div>
                  <p className="text-slate-400 mt-2">Survival Score</p>
                </div>
              </div>

              <div className="space-y-6 mt-8">
                {/* Why You Will Fail */}
                <div>
                  <h3 className="text-xl font-bold text-red-400 mb-3">
                    ❌ Why You Will Fail
                  </h3>
                  <ul className="space-y-2">
                    {shredderResult!.whyYouWillFail.map((reason, i) => (
                      <li key={i} className="text-slate-300 flex items-start">
                        <span className="text-red-400 mr-2">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Competitors Missed */}
                <div>
                  <h3 className="text-xl font-bold text-yellow-400 mb-3">
                    🏢 Competitors You Missed
                  </h3>
                  <div className="space-y-3">
                    {shredderResult!.competitorsMissed.map((comp, i) => (
                      <div key={i} className="bg-white/5 p-4 rounded-lg">
                        <div className="font-semibold text-white">{comp.name}</div>
                        <div className="text-sm text-slate-400 mt-1">{comp.why}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Economic Flaws */}
                <div>
                  <h3 className="text-xl font-bold text-orange-400 mb-3">
                    💸 Economic Flaws
                  </h3>
                  <div className="space-y-3">
                    {shredderResult!.economicFlaws.map((flaw, i) => (
                      <div key={i} className="bg-white/5 p-4 rounded-lg">
                        <div className="font-semibold text-white">{flaw.flaw}</div>
                        <div className="text-sm text-slate-400 mt-1">{flaw.impact}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="text-xl font-bold text-blue-400 mb-3">
                    💡 What You Should Do
                  </h3>
                  <ul className="space-y-2">
                    {shredderResult!.recommendations.map((rec, i) => (
                      <li key={i} className="text-slate-300 flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Rebuttal Section */}
            {!rebuttalResult && (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-4">
                  🥊 Argue Your Case
                </h2>
                <p className="text-slate-300 mb-6">
                  Think the AI is wrong? Prove it. Address the concerns with data, evidence, and insight.
                  <br />
                  <span className="text-sm text-slate-400">
                    (Need 70+ convincing score to unlock the next phase)
                  </span>
                </p>

                <form onSubmit={handleRebuttal}>
                  <textarea
                    value={rebuttal}
                    onChange={(e) => setRebuttal(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    placeholder="Your rebuttal (minimum 50 characters)..."
                    rows={6}
                    required
                    minLength={50}
                    maxLength={5000}
                  />

                  <button
                    type="submit"
                    disabled={isLoading || rebuttal.length < 50}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-colors"
                  >
                    {isLoading ? 'Evaluating...' : 'Submit Rebuttal'}
                  </button>
                </form>
              </div>
            )}

            {/* Rebuttal Result */}
            {rebuttalResult && (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    AI Evaluation
                  </h2>
                  <div className="text-5xl font-bold text-white">
                    {rebuttalResult.convincedScore}<span className="text-xl">/100</span>
                  </div>
                  <p className="text-slate-400 mt-2">Convinced Score</p>
                </div>

                <div className="prose prose-invert max-w-none">
                  <div className="text-slate-300 whitespace-pre-wrap">
                    {rebuttalResult.aiResponse}
                  </div>
                </div>

                {rebuttalResult.convincedScore >= 70 ? (
                  <div className="mt-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                    <div className="text-green-400 font-bold text-center">
                      ✅ Passed Validation! Build & Launch Phase Unlocked.
                    </div>
                    <div className="text-sm text-center text-slate-300 mt-2">
                      Redirecting to dashboard...
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <div className="text-red-400 font-bold text-center">
                      ❌ Not Convinced. Revise your idea or try again.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
