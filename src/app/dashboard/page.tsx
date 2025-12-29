'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Company {
  id: string
  name: string
  currentPhase: string
  isPhaseUnlocked: boolean
  irsScore: number
  velocityScore: number
  harmonyScore: number
  marketScore: number
  tractionScore: number
}

interface IRSData {
  totalScore: number
  velocityScore: number
  harmonyScore: number
  marketScore: number
  tractionScore: number
  badges: string[]
  warnings: string[]
  tier: string
}

export default function DashboardPage() {
  const [company, setCompany] = useState<Company | null>(null)
  const [irs, setIRS] = useState<IRSData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const companyId = 'demo-company-id' // In production, from session

  const loadData = async () => {
    setIsLoading(true)
    try {
      // In production, fetch real company data
      // For demo, create mock data
      const mockCompany: Company = {
        id: companyId,
        name: 'My Startup',
        currentPhase: 'IDEA_VALIDATION',
        isPhaseUnlocked: false,
        irsScore: 0,
        velocityScore: 0,
        harmonyScore: 0,
        marketScore: 0,
        tractionScore: 0,
      }
      setCompany(mockCompany)

      // Fetch IRS
      const res = await fetch(`/api/irs?companyId=${companyId}`)
      if (res.ok) {
        const data = await res.json()
        setIRS(data.irs)
        setCompany(prev => prev ? { ...prev, irsScore: data.irs.totalScore } : null)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getPhaseInfo = (phase: string) => {
    const phases = {
      IDEA_VALIDATION: {
        name: 'Phase 1: Reality Check',
        icon: '🔥',
        description: 'Validate your idea or pivot',
        unlockRequirement: 'Pass Idea Shredder OR Complete 20 interviews',
      },
      BUILD_AND_LAUNCH: {
        name: 'Phase 2: Build & Launch',
        icon: '⚡',
        description: 'Build MVP and launch in 2 weeks',
        unlockRequirement: 'Ship MVP and get first users',
      },
      TRACTION_ENGINE: {
        name: 'Phase 3: Traction Engine',
        icon: '📈',
        description: 'Prove unit economics work',
        unlockRequirement: 'Achieve positive unit economics',
      },
      COFOUNDER_HARMONY: {
        name: 'Phase 4: Co-founder Harmony',
        icon: '🤝',
        description: 'Resolve conflicts and scale team',
        unlockRequirement: 'Pass vibe checks and hire first employee',
      },
      INVESTOR_READY: {
        name: 'Phase 5: Investor Ready',
        icon: '💰',
        description: 'Raise capital from investors',
        unlockRequirement: 'IRS Score 750+',
      },
    }
    return phases[phase as keyof typeof phases] || phases.IDEA_VALIDATION
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'SERIES_A_READY': return 'text-purple-400'
      case 'SEED_READY': return 'text-green-400'
      case 'PRE_SEED': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  const getTierBgColor = (tier: string) => {
    switch (tier) {
      case 'SERIES_A_READY': return 'bg-purple-500/20 border-purple-500/50'
      case 'SEED_READY': return 'bg-green-500/20 border-green-500/50'
      case 'PRE_SEED': return 'bg-blue-500/20 border-blue-500/50'
      default: return 'bg-gray-500/20 border-gray-500/50'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  const currentPhaseInfo = company ? getPhaseInfo(company.currentPhase) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            The Gatekeeper Dashboard
          </h1>
          <p className="text-xl text-slate-300">
            {company?.name || 'Your Startup'} - {currentPhaseInfo?.name}
          </p>
        </div>

        {/* IRS Score - Big Display */}
        {irs && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-300 mb-4">
                Investor Ready Score (IRS)
              </h2>
              <div className={`text-8xl font-bold ${getTierColor(irs.tier)}`}>
                {irs.totalScore}
              </div>
              <div className={`inline-block mt-4 px-6 py-2 rounded-full border ${getTierBgColor(irs.tier)}`}>
                <span className={`text-xl font-semibold ${getTierColor(irs.tier)}`}>
                  {irs.tier.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/5 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {irs.velocityScore}
                </div>
                <div className="text-sm text-slate-400 mt-1">Velocity (35%)</div>
                <div className="text-xs text-slate-500 mt-1">Max: 350</div>
              </div>
              <div className="bg-white/5 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-400">
                  {irs.harmonyScore}
                </div>
                <div className="text-sm text-slate-400 mt-1">Harmony (20%)</div>
                <div className="text-xs text-slate-500 mt-1">Max: 200</div>
              </div>
              <div className="bg-white/5 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-yellow-400">
                  {irs.marketScore}
                </div>
                <div className="text-sm text-slate-400 mt-1">Market (25%)</div>
                <div className="text-xs text-slate-500 mt-1">Max: 250</div>
              </div>
              <div className="bg-white/5 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-purple-400">
                  {irs.tractionScore}
                </div>
                <div className="text-sm text-slate-400 mt-1">Traction (20%)</div>
                <div className="text-xs text-slate-500 mt-1">Max: 200</div>
              </div>
            </div>

            {/* Badges */}
            {irs.badges.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {irs.badges.map((badge, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm border border-green-500/30"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}

            {/* Warnings */}
            {irs.warnings.length > 0 && (
              <div className="mt-6 space-y-2">
                {irs.warnings.map((warning, i) => (
                  <div
                    key={i}
                    className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm"
                  >
                    {warning}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={loadData}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                🔄 Recalculate Score
              </button>
            </div>
          </div>
        )}

        {/* Current Phase */}
        {currentPhaseInfo && (
          <div className={`bg-white/10 backdrop-blur-lg rounded-lg p-6 border mb-8 ${
            company?.isPhaseUnlocked ? 'border-green-500/50' : 'border-red-500/50'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {currentPhaseInfo.icon} {currentPhaseInfo.name}
                </h3>
                <p className="text-slate-300">{currentPhaseInfo.description}</p>
                <p className="text-sm text-slate-400 mt-2">
                  <span className="font-semibold">Unlock Requirement:</span>{' '}
                  {currentPhaseInfo.unlockRequirement}
                </p>
              </div>
              <div className="text-right">
                {company?.isPhaseUnlocked ? (
                  <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 font-semibold">
                    ✅ Unlocked
                  </span>
                ) : (
                  <span className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 font-semibold">
                    🔒 Locked
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Phase Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Phase 1 Tools */}
          <Link href="/dashboard/idea-shredder">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/20 transition-colors cursor-pointer h-full">
              <div className="text-4xl mb-3">💀</div>
              <h3 className="text-xl font-bold text-white mb-2">Idea Shredder</h3>
              <p className="text-slate-300 text-sm">
                Submit your idea for ruthless validation. Convince the AI or pivot.
              </p>
            </div>
          </Link>

          <Link href="/dashboard/interviews">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/20 transition-colors cursor-pointer h-full">
              <div className="text-4xl mb-3">🎤</div>
              <h3 className="text-xl font-bold text-white mb-2">Customer Interviews</h3>
              <p className="text-slate-300 text-sm">
                Log customer interviews using The Mom Test methodology. Need 20 to progress.
              </p>
            </div>
          </Link>

          {/* Coming Soon Tools */}
          <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/10 opacity-50 cursor-not-allowed h-full">
            <div className="text-4xl mb-3">💻</div>
            <h3 className="text-xl font-bold text-white mb-2">Vibe Coding Box</h3>
            <p className="text-slate-300 text-sm">
              Time-boxed development environment. AI blocks unnecessary features.
            </p>
            <span className="inline-block mt-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
              Coming Soon
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/10 opacity-50 cursor-not-allowed h-full">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">AARRR Dashboard</h3>
            <p className="text-slate-300 text-sm">
              Track acquisition, activation, retention, revenue, and referral metrics.
            </p>
            <span className="inline-block mt-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
              Coming Soon
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/10 opacity-50 cursor-not-allowed h-full">
            <div className="text-4xl mb-3">🤝</div>
            <h3 className="text-xl font-bold text-white mb-2">Vibe Check-ins</h3>
            <p className="text-slate-300 text-sm">
              Weekly co-founder sentiment check. AI detects conflicts before they explode.
            </p>
            <span className="inline-block mt-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
              Coming Soon
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/10 opacity-50 cursor-not-allowed h-full">
            <div className="text-4xl mb-3">💰</div>
            <h3 className="text-xl font-bold text-white mb-2">Investor Simulator</h3>
            <p className="text-slate-300 text-sm">
              Practice your pitch. AI gives you a due diligence report before real investors see you.
            </p>
            <span className="inline-block mt-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
              Coming Soon
            </span>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-12 bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            How The Gatekeeper Works
          </h2>
          <div className="space-y-4 text-slate-300">
            <p>
              <span className="font-semibold text-white">1. Linear Progression:</span> You cannot
              skip phases. Each phase must be unlocked by completing specific requirements.
            </p>
            <p>
              <span className="font-semibold text-white">2. AI Enforcement:</span> The AI blocks
              bad decisions and forces you to do the hard stuff (validation, customer interviews)
              before the fun stuff (coding, designing).
            </p>
            <p>
              <span className="font-semibold text-white">3. Real-Time Scoring:</span> Your Investor
              Ready Score (IRS) updates in real-time based on your actions. Investors see this
              score, not just your pitch deck.
            </p>
            <p>
              <span className="font-semibold text-white">4. Brutal Honesty:</span> We don't
              validate ideas. We destroy them. If your idea survives, it might be worth building.
            </p>
            <p className="pt-4 text-center text-xl font-bold text-blue-400">
              🎯 Goal: Reach IRS 750+ to become investment-ready
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
