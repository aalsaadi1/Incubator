import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateIRS, getIRSHistory } from '@/lib/irs-calculator'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const includeHistory = searchParams.get('includeHistory') === 'true'

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId required' },
        { status: 400 }
      )
    }

    // Check membership
    const membership = await prisma.companyMember.findFirst({
      where: {
        companyId,
        userId: session.user.id,
      },
    })

    if (!membership && session.user.role !== 'INVESTOR') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Calculate IRS
    const irs = await calculateIRS(companyId)

    // Get history if requested
    let history = null
    if (includeHistory) {
      history = await getIRSHistory(companyId, 30)
    }

    return NextResponse.json({
      success: true,
      irs,
      history,
    })
  } catch (error) {
    console.error('Error calculating IRS:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
