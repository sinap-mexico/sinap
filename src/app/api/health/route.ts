import { NextResponse } from "next/server"

export async function GET() {
  const checks: Record<string, { status: string; detail?: string }> = {}

  // Check 1: DATABASE_URL env var
  const dbUrl = process.env.DATABASE_URL
  checks.database_url = {
    status: dbUrl ? "ok" : "missing",
    detail: dbUrl ? `${dbUrl.substring(0, 30)}...` : "DATABASE_URL not set",
  }

  // Check 2: NEXTAUTH_SECRET env var
  const secret = process.env.NEXTAUTH_SECRET
  checks.nextauth_secret = {
    status: secret ? "ok" : "missing",
    detail: secret ? `Set (${secret.length} chars)` : "NEXTAUTH_SECRET not set",
  }

  // Check 3: NEXTAUTH_URL env var
  const authUrl = process.env.NEXTAUTH_URL
  checks.nextauth_url = {
    status: authUrl ? "ok" : "missing",
    detail: authUrl || "NEXTAUTH_URL not set",
  }

  // Check 4: Database connection
  try {
    const { db } = await import("@/lib/db")
    if (!db) {
      checks.database_connection = {
        status: "error",
        detail: "PrismaClient is null — DATABASE_URL may be missing or invalid",
      }
    } else {
      await db.$queryRaw`SELECT 1`
      checks.database_connection = { status: "ok", detail: "Connected" }
    }
  } catch (error: any) {
    checks.database_connection = {
      status: "error",
      detail: error.message || "Unknown error",
    }
  }

  // Check 5: Clinic count
  try {
    const { db } = await import("@/lib/db")
    if (db) {
      const clinics = await db.clinic.findMany({ select: { id: true, name: true, isActive: true, trialEnd: true } })
      checks.clinics = {
        status: "ok",
        detail: `${clinics.length} clinics found`,
      }
    }
  } catch {
    checks.clinics = { status: "error", detail: "Could not query clinics" }
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok")

  return NextResponse.json({
    status: allOk ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    checks,
  }, { status: allOk ? 200 : 503 })
}
