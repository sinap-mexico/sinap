import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { db } from '@/lib/db'

// POST /api/clinic/upgrade-trial
// Upgrades the current clinic to enterprise plan with all premium features
// This is a one-time operation for free trial accounts
export async function POST() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }

    if (!user.clinicId) {
      return NextResponse.json({ error: 'No clinic associated' }, { status: 400 })
    }

    // Update the clinic to enterprise plan
    const now = new Date()
    const trialEnd = new Date(now)
    trialEnd.setDate(trialEnd.getDate() + 7)

    const clinic = await db.clinic.update({
      where: { id: user.clinicId },
      data: {
        plan: 'enterprise',
        maxDoctors: 999,
        monthlyConvLimit: 999999,
        isActive: true,
        trialEnd: trialEnd,
        trialStart: now,
      },
    })

    return NextResponse.json({
      success: true,
      clinic: {
        id: clinic.id,
        name: clinic.name,
        plan: clinic.plan,
        maxDoctors: clinic.maxDoctors,
        monthlyConvLimit: clinic.monthlyConvLimit,
        isActive: clinic.isActive,
        trialEnd: clinic.trialEnd?.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error upgrading clinic:', error)
    return NextResponse.json({ error: 'Failed to upgrade clinic' }, { status: 500 })
  }
}
