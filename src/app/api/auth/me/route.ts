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

    // Get user with clinic info
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            slug: true,
            rfc: true,
            address: true,
            city: true,
            state: true,
            phone: true,
            email: true,
            mode: true,
            plan: true,
            isActive: true,
            trialStart: true,
            trialEnd: true,
          },
        },
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get first doctor in the user's clinic (the owner is typically the first doctor)
    // Doctor model doesn't have userId — linked via clinicId
    let doctor = null
    if (dbUser.clinicId) {
      doctor = await db.doctor.findFirst({
        where: { clinicId: dbUser.clinicId },
        orderBy: { createdAt: "asc" },
      })
    }

    // Calculate trial status
    let trialDaysRemaining = 0
    let isTrialExpired = false
    const clinic = dbUser.clinic

    if (clinic?.trialEnd) {
      const now = new Date()
      const diffMs = clinic.trialEnd.getTime() - now.getTime()
      trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
      isTrialExpired = diffMs <= 0
    }

    return NextResponse.json({
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
      },
      clinic: clinic
        ? {
            id: clinic.id,
            name: clinic.name,
            slug: clinic.slug,
            rfc: clinic.rfc,
            address: clinic.address,
            city: clinic.city,
            state: clinic.state,
            phone: clinic.phone,
            email: clinic.email,
            mode: clinic.mode,
            plan: clinic.plan,
            isActive: clinic.isActive,
            trialStart: clinic.trialStart?.toISOString() ?? null,
            trialEnd: clinic.trialEnd?.toISOString() ?? null,
          }
        : null,
      doctor: doctor
        ? {
            id: doctor.id,
            name: doctor.name,
            specialty: doctor.specialty,
            license: doctor.license,
            email: doctor.email,
            phone: doctor.phone,
          }
        : null,
      trial: {
        daysRemaining: trialDaysRemaining,
        isTrialExpired,
      },
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
