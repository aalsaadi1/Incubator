// @ts-nocheck
/**
 * IRS (Investor Ready Score) Calculator
 *
 * Calculates a startup's investability score (0-1000) based on 4 pillars:
 * 1. Velocity (35%) - Speed of execution
 * 2. Harmony (20%) - Co-founder dynamics
 * 3. Market Reality (25%) - Customer validation
 * 4. Traction (20%) - Growth metrics
 */

import { prisma } from './prisma'

export interface IRSBreakdown {
  totalScore: number // 0-1000
  velocityScore: number // 0-350
  harmonyScore: number // 0-200
  marketScore: number // 0-250
  tractionScore: number // 0-200
  badges: string[]
  warnings: string[]
  tier: 'PRE_SEED' | 'SEED_READY' | 'SERIES_A_READY' | 'NOT_READY'
}

/**
 * Calculate Velocity Score (0-350 points, 35% weight)
 * Measures: Ship rate, cycle time, pivot speed
 */
async function calculateVelocityScore(companyId: string): Promise<{
  score: number
  details: string[]
}> {
  let score = 0
  const details: string[] = []

  // Get activity logs from last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const activities = await prisma.activityLog.findMany({
    where: {
      companyId,
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: { createdAt: 'desc' },
  })

  // 1. Ship Rate (0-150 points)
  const deployments = activities.filter((a: any) =>
    a.type === 'FEATURE_DEPLOYED' || a.type === 'CODE_COMMIT'
  )

  const deploymentsPerWeek = (deployments.length / 4) // Approximate

  if (deploymentsPerWeek >= 3) {
    score += 150
    details.push('✅ High ship rate: 3+ deployments/week')
  } else if (deploymentsPerWeek >= 1) {
    score += 100
    details.push('⚠️ Moderate ship rate: 1-3 deployments/week')
  } else if (deploymentsPerWeek > 0) {
    score += 50
    details.push('❌ Low ship rate: <1 deployment/week')
  } else {
    details.push('❌ No deployments in 30 days')
  }

  // 2. Consistency (0-100 points)
  const hasRecentActivity = activities.length > 0
  const lastActivity = activities[0]

  if (lastActivity) {
    const daysSinceLastActivity = Math.floor(
      (Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceLastActivity <= 2) {
      score += 100
      details.push('✅ Very active (last activity <2 days ago)')
    } else if (daysSinceLastActivity <= 7) {
      score += 70
      details.push('⚠️ Active (last activity <1 week ago)')
    } else if (daysSinceLastActivity <= 14) {
      score += 40
      details.push('⚠️ Somewhat inactive (last activity <2 weeks ago)')
    } else {
      details.push('❌ Inactive (no activity in 2+ weeks)')
    }
  }

  // 3. Pivot/Adaptation Speed (0-100 points)
  const pivots = activities.filter((a: any) =>
    a.type === 'IDEA_SUBMITTED' || a.type === 'PIVOT'
  )

  if (pivots.length > 0) {
    score += 50
    details.push('✅ Shows adaptation capability')
  }

  // Customer feedback response
  const interviews = await prisma.interview.count({
    where: { companyId },
  })

  if (interviews >= 20) {
    score += 50
    details.push('✅ Rapid customer feedback loop')
  } else if (interviews >= 10) {
    score += 30
    details.push('⚠️ Decent feedback loop')
  }

  return { score: Math.min(score, 350), details }
}

/**
 * Calculate Harmony Score (0-200 points, 20% weight)
 * Measures: Communication balance, conflict resolution, workload distribution
 */
async function calculateHarmonyScore(companyId: string): Promise<{
  score: number
  details: string[]
}> {
  let score = 0
  const details: string[] = []

  // Get co-founders
  const members = await prisma.companyMember.findMany({
    where: { companyId, isActive: true },
  })

  if (members.length === 1) {
    score += 100
    details.push('✅ Solo founder (no co-founder risk)')
    return { score, details }
  }

  // Get activities by user in last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const activitiesByUser = await prisma.activityLog.groupBy({
    by: ['userId'],
    where: {
      companyId,
      createdAt: { gte: thirtyDaysAgo },
      userId: { not: null },
    },
    _count: true,
  })

  // 1. Workload Balance (0-100 points)
  if (activitiesByUser.length > 0) {
    const activityCounts = activitiesByUser.map(a => a._count)
    const max = Math.max(...activityCounts)
    const min = Math.min(...activityCounts)
    const imbalance = max > 0 ? ((max - min) / max) * 100 : 0

    if (imbalance < 30) {
      score += 100
      details.push('✅ Balanced workload distribution')
    } else if (imbalance < 50) {
      score += 60
      details.push('⚠️ Slight workload imbalance')
    } else {
      score += 30
      details.push('❌ Significant workload imbalance')
    }
  }

  // 2. Conflict Management (0-100 points)
  const conflicts = await prisma.conflict.findMany({
    where: { companyId },
  })

  const unresolvedConflicts = conflicts.filter(c => !c.isResolved)
  const criticalConflicts = conflicts.filter(c =>
    c.severity === 'CRITICAL' && !c.isResolved
  )

  if (criticalConflicts.length > 0) {
    details.push('❌ Critical unresolved conflicts')
  } else if (unresolvedConflicts.length > 0) {
    score += 50
    details.push('⚠️ Minor unresolved conflicts')
  } else if (conflicts.length === 0) {
    score += 100
    details.push('✅ No detected conflicts')
  } else {
    score += 100
    details.push('✅ All conflicts resolved')
  }

  return { score: Math.min(score, 200), details }
}

/**
 * Calculate Market Score (0-250 points, 25% weight)
 * Measures: Customer interaction volume, validation data, data-driven decisions
 */
async function calculateMarketScore(companyId: string): Promise<{
  score: number
  details: string[]
}> {
  let score = 0
  const details: string[] = []

  // 1. Customer Interviews (0-100 points)
  const interviews = await prisma.interview.findMany({
    where: { companyId },
  })

  if (interviews.length >= 20) {
    score += 100
    details.push(`✅ Extensive validation (${interviews.length} interviews)`)
  } else if (interviews.length >= 10) {
    score += 70
    details.push(`⚠️ Good validation (${interviews.length} interviews)`)
  } else if (interviews.length >= 5) {
    score += 40
    details.push(`⚠️ Limited validation (${interviews.length} interviews)`)
  } else {
    details.push(`❌ Insufficient validation (${interviews.length} interviews)`)
  }

  // 2. Problem-Market Fit (0-100 points)
  const analyzedInterviews = interviews.filter(i => i.insights)

  if (analyzedInterviews.length >= 10) {
    let hasProblemCount = 0
    let wouldPayCount = 0

    analyzedInterviews.forEach(i => {
      if (i.hasProblem) hasProblemCount++
      if (i.wouldPay) wouldPayCount++
    })

    const problemFitRate = hasProblemCount / analyzedInterviews.length
    const willPayRate = wouldPayCount / analyzedInterviews.length

    if (problemFitRate >= 0.7 && willPayRate >= 0.5) {
      score += 100
      details.push('✅ Strong problem-market fit')
    } else if (problemFitRate >= 0.5) {
      score += 60
      details.push('⚠️ Moderate problem-market fit')
    } else {
      score += 20
      details.push('❌ Weak problem-market fit')
    }
  }

  // 3. Idea Validation (0-50 points)
  const idea = await prisma.idea.findUnique({
    where: { companyId },
  })

  if (idea?.status === 'PASSED_VALIDATION') {
    score += 50
    details.push('✅ Idea passed AI validation')
  } else if (idea?.status === 'IN_REVISION') {
    score += 25
    details.push('⚠️ Idea needs revision')
  } else if (idea?.status === 'FAILED_VALIDATION') {
    details.push('❌ Idea failed validation')
  }

  return { score: Math.min(score, 250), details }
}

/**
 * Calculate Traction Score (0-200 points, 20% weight)
 * Measures: Growth, retention, organic growth
 */
async function calculateTractionScore(companyId: string): Promise<{
  score: number
  details: string[]
}> {
  let score = 0
  const details: string[] = []

  // Get latest metrics
  const latestMetric = await prisma.metric.findFirst({
    where: { companyId },
    orderBy: { date: 'desc' },
  })

  if (!latestMetric) {
    details.push('❌ No traction data available')
    return { score: 0, details }
  }

  // 1. User Acquisition (0-70 points)
  if (latestMetric.acquisition >= 100) {
    score += 70
    details.push(`✅ Strong acquisition (${latestMetric.acquisition} users)`)
  } else if (latestMetric.acquisition >= 50) {
    score += 50
    details.push(`⚠️ Moderate acquisition (${latestMetric.acquisition} users)`)
  } else if (latestMetric.acquisition > 0) {
    score += 30
    details.push(`⚠️ Early traction (${latestMetric.acquisition} users)`)
  }

  // 2. Retention (0-80 points)
  if (latestMetric.retention >= 0.4) { // 40%+ retention
    score += 80
    details.push(`✅ Excellent retention (${(latestMetric.retention * 100).toFixed(0)}%)`)
  } else if (latestMetric.retention >= 0.2) { // 20%+ retention
    score += 50
    details.push(`⚠️ Good retention (${(latestMetric.retention * 100).toFixed(0)}%)`)
  } else if (latestMetric.retention > 0) {
    score += 20
    details.push(`❌ Low retention (${(latestMetric.retention * 100).toFixed(0)}%)`)
  }

  // 3. Viral Coefficient (0-50 points)
  if (latestMetric.viralCoefficient >= 1.0) {
    score += 50
    details.push(`✅ Viral growth (${latestMetric.viralCoefficient.toFixed(2)}x)`)
  } else if (latestMetric.viralCoefficient >= 0.5) {
    score += 30
    details.push(`⚠️ Some virality (${latestMetric.viralCoefficient.toFixed(2)}x)`)
  }

  return { score: Math.min(score, 200), details }
}

/**
 * Main IRS Calculation Function
 */
export async function calculateIRS(companyId: string): Promise<IRSBreakdown> {
  const [velocity, harmony, market, traction] = await Promise.all([
    calculateVelocityScore(companyId),
    calculateHarmonyScore(companyId),
    calculateMarketScore(companyId),
    calculateTractionScore(companyId),
  ])

  const totalScore = velocity.score + harmony.score + market.score + traction.score

  // Update company scores
  await prisma.company.update({
    where: { id: companyId },
    data: {
      irsScore: totalScore,
      velocityScore: velocity.score,
      harmonyScore: harmony.score,
      marketScore: market.score,
      tractionScore: traction.score,
    },
  })

  // Determine tier
  let tier: IRSBreakdown['tier'] = 'NOT_READY'
  if (totalScore >= 800) tier = 'SERIES_A_READY'
  else if (totalScore >= 700) tier = 'SEED_READY'
  else if (totalScore >= 500) tier = 'PRE_SEED'

  // Generate badges
  const badges: string[] = []
  if (velocity.score >= 300) badges.push('🏆 High Velocity')
  if (harmony.score >= 180) badges.push('🤝 Team Harmony')
  if (market.score >= 200) badges.push('✅ Market Validated')
  if (traction.score >= 150) badges.push('📈 Strong Traction')
  if (totalScore >= 750) badges.push('⭐ Investor Ready')

  // Generate warnings
  const warnings: string[] = []
  if (velocity.score < 150) warnings.push('⚠️ Slow execution speed')
  if (harmony.score < 100) warnings.push('⚠️ Co-founder issues')
  if (market.score < 100) warnings.push('⚠️ Weak market validation')
  if (traction.score < 50) warnings.push('⚠️ No traction yet')

  return {
    totalScore,
    velocityScore: velocity.score,
    harmonyScore: harmony.score,
    marketScore: market.score,
    tractionScore: traction.score,
    badges,
    warnings,
    tier,
  }
}

/**
 * Get historical IRS data for charts
 */
export async function getIRSHistory(companyId: string, days: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // In a real system, you'd store daily snapshots
  // For now, we'll just return current score
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  })

  if (!company) return []

  return [{
    date: new Date(),
    totalScore: company.irsScore,
    velocityScore: company.velocityScore,
    harmonyScore: company.harmonyScore,
    marketScore: company.marketScore,
    tractionScore: company.tractionScore,
  }]
}
