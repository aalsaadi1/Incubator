'use client'

import { useState, useEffect } from 'react'

interface Interview {
  id: string
  intervieweeName?: string
  intervieweeEmail?: string
  transcript: string
  notes?: string
  status: string
  insights?: string
  hasProblem?: boolean
  wouldPay?: boolean
  painLevel?: number
  completedAt?: string
}

export default function InterviewsPage() {
  const [questions, setQuestions] = useState<any>(null)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'questions' | 'add' | 'list' | 'summary'>('questions')

  const [formData, setFormData] = useState({
    intervieweeName: '',
    intervieweeEmail: '',
    transcript: '',
    notes: '',
  })

  const companyId = 'demo-company-id' // In production, from session

  const loadQuestions = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/interviews/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      const data = await res.json()
      if (data.success) {
        setQuestions(data.questions)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadInterviews = async () => {
    try {
      const res = await fetch(`/api/interviews?companyId=${companyId}`)
      const data = await res.json()
      if (data.success) {
        setInterviews(data.interviews)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const loadSummary = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/interviews/summary?companyId=${companyId}`)
      const data = await res.json()
      if (data.success) {
        setSummary(data)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Need at least one analyzed interview to generate summary')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, companyId }),
      })

      const data = await res.json()

      if (data.success) {
        // Analyze immediately
        const analyzeRes = await fetch('/api/interviews/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interviewId: data.interview.id }),
        })

        if (analyzeRes.ok) {
          alert('Interview logged and analyzed!')
          setFormData({
            intervieweeName: '',
            intervieweeEmail: '',
            transcript: '',
            notes: '',
          })
          loadInterviews()
          setActiveTab('list')
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to submit interview')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInterviews()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎤 Customer Interviews
          </h1>
          <p className="text-xl text-slate-300">
            The Mom Test: Talk about their life, not your idea
          </p>
          <p className="text-sm text-red-400 mt-2 font-semibold">
            ⚠️ Need 20 completed interviews to unlock Build & Launch phase
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-white font-semibold">Interview Progress</span>
            <span className="text-white">{interviews.length} / 20</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div
              className="bg-blue-500 h-4 rounded-full transition-all"
              style={{ width: `${Math.min((interviews.length / 20) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'questions'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            📋 Questions
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'add'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            ➕ Log Interview
          </button>
          <button
            onClick={() => {
              setActiveTab('list')
              loadInterviews()
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            📊 All Interviews ({interviews.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('summary')
              loadSummary()
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'summary'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            📈 Summary
          </button>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20">
          {/* Questions Tab */}
          {activeTab === 'questions' && (
            <div>
              {!questions ? (
                <div className="text-center">
                  <p className="text-slate-300 mb-4">
                    Generate Mom Test questions tailored to your idea
                  </p>
                  <button
                    onClick={loadQuestions}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    {isLoading ? 'Generating...' : 'Generate Questions'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">1. Opening Questions</h3>
                    <ul className="space-y-2">
                      {questions.openingQuestions.map((q: string, i: number) => (
                        <li key={i} className="text-slate-300">• {q}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">2. Problem Exploration</h3>
                    <ul className="space-y-2">
                      {questions.problemExplorationQuestions.map((q: string, i: number) => (
                        <li key={i} className="text-slate-300">• {q}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">3. Current Solution</h3>
                    <ul className="space-y-2">
                      {questions.currentSolutionQuestions.map((q: string, i: number) => (
                        <li key={i} className="text-slate-300">• {q}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">4. Behavioral Questions</h3>
                    <ul className="space-y-2">
                      {questions.behavioralQuestions.map((q: string, i: number) => (
                        <li key={i} className="text-slate-300">• {q}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">5. Closing Questions</h3>
                    <ul className="space-y-2">
                      {questions.closingQuestions.map((q: string, i: number) => (
                        <li key={i} className="text-slate-300">• {q}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add Interview Tab */}
          {activeTab === 'add' && (
            <form onSubmit={handleSubmitInterview} className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-2">
                  Interviewee Name
                </label>
                <input
                  type="text"
                  value={formData.intervieweeName}
                  onChange={(e) => setFormData({ ...formData, intervieweeName: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={formData.intervieweeEmail}
                  onChange={(e) => setFormData({ ...formData, intervieweeEmail: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">
                  Interview Transcript *
                </label>
                <textarea
                  value={formData.transcript}
                  onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Write what they said (not what you said)..."
                  rows={8}
                  required
                  minLength={50}
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">
                  Your Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What did you learn? Any insights?"
                  rows={4}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-colors"
              >
                {isLoading ? 'Analyzing Interview...' : 'Submit Interview'}
              </button>
            </form>
          )}

          {/* List Tab */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {interviews.length === 0 ? (
                <p className="text-slate-300 text-center">No interviews yet. Start talking to customers!</p>
              ) : (
                interviews.map((interview) => {
                  const analysis = interview.insights ? JSON.parse(interview.insights) : null
                  return (
                    <div key={interview.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-white font-semibold">
                            {interview.intervieweeName || 'Anonymous'}
                          </h3>
                          <p className="text-sm text-slate-400">
                            {interview.completedAt && new Date(interview.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {analysis && (
                          <div className="flex gap-2">
                            {analysis.hasProblem && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                                Has Problem
                              </span>
                            )}
                            {analysis.wouldPay && (
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                                Would Pay
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {analysis && (
                        <div className="mt-3 space-y-2">
                          <p className="text-slate-300 text-sm">
                            <span className="font-semibold">Pain Level:</span> {analysis.problemSeverity}/10
                          </p>
                          <p className="text-slate-300 text-sm">
                            <span className="font-semibold">Summary:</span> {analysis.summary}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div>
              {!summary ? (
                <div className="text-center">
                  <p className="text-slate-300">
                    {isLoading ? 'Generating summary...' : 'Click "Summary" tab to generate analysis'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className={`text-4xl font-bold ${
                      summary.summary.verdict === 'VALIDATED' ? 'text-green-400' :
                      summary.summary.verdict === 'NEEDS_MORE_DATA' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {summary.summary.verdict.replace('_', ' ')}
                    </h2>
                    <p className="text-slate-400 mt-2">Based on {summary.interviewCount} interviews</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-white">{summary.summary.hasProblemCount}</div>
                      <div className="text-sm text-slate-400">Have the Problem</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-white">{summary.summary.wouldPayCount}</div>
                      <div className="text-sm text-slate-400">Would Pay</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-white">{summary.summary.averagePainLevel.toFixed(1)}/10</div>
                      <div className="text-sm text-slate-400">Avg Pain Level</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-white">{summary.interviewCount}/20</div>
                      <div className="text-sm text-slate-400">Interviews Done</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">Common Pain Points</h3>
                    <ul className="space-y-2">
                      {summary.summary.commonPainPoints.map((pain: string, i: number) => (
                        <li key={i} className="text-slate-300">• {pain}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">Top Insights</h3>
                    <ul className="space-y-2">
                      {summary.summary.topInsights.map((insight: string, i: number) => (
                        <li key={i} className="text-slate-300">• {insight}</li>
                      ))}
                    </ul>
                  </div>

                  {summary.summary.majorRedFlags.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-red-400 mb-3">⚠️ Red Flags</h3>
                      <ul className="space-y-2">
                        {summary.summary.majorRedFlags.map((flag: string, i: number) => (
                          <li key={i} className="text-slate-300">• {flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-blue-400 mb-2">Recommendation</h3>
                    <p className="text-slate-300">{summary.summary.recommendation}</p>
                  </div>

                  {summary.phaseUnlocked && (
                    <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                      <div className="text-green-400 font-bold text-center">
                        ✅ Validation Complete! Build & Launch Phase Unlocked.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
