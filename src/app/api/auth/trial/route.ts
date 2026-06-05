import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-api"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
    }

    // Get clinic with trial info
    if (!user.clinicId) {
      return NextResponse.json({ error: "No clinic associated" }, { status: 400 })
    }

    const clinic = await db.clinic.findUnique({
      where: { id: user.clinicId },
      select: {
        id: true,
        name: true,
        plan: true,
        isActive: true,
        trialStart: true,
        trialEnd: true,
      },
    })

    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    }

    const now = new Date()
    const trialStart = clinic.trialStart
    const trialEnd = clinic.trialEnd

    // Calculate trial status
    let daysRemaining = 0
    let isTrialActive = false
    let isTrialExpired = false

    if (trialEnd) {
      const diffMs = trialEnd.getTime() - now.getTime()
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
      isTrialActive = diffMs > 0 || clinic.plan === 'premium' || clinic.plan === 'enterprise'
      // Enterprise/premium accounts never expire
      isTrialExpired = diffMs <= 0 && clinic.plan !== 'premium' && clinic.plan !== 'enterprise'
    }

    return NextResponse.json({
      clinicId: clinic.id,
      clinicName: clinic.name,
      plan: clinic.plan,
      isActive: clinic.isActive,
      trial: {
        startDate: trialStart?.toISOString() ?? null,
        endDate: trialEnd?.toISOString() ?? null,
        daysRemaining,
        isTrialActive,
        isTrialExpired,
      },
    })
  } catch (error) {
    console.error("Error fetching trial status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
