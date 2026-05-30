import { getServerSession } from "next-auth"
import { authOptions } from "./auth"

export async function getAuthUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  return {
    id: (session.user as any).id,
    email: session.user.email!,
    name: session.user.name,
    role: (session.user as any).role,
    clinicId: (session.user as any).clinicId,
  }
}

export async function requireAuth() {
  const user = await getAuthUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

export async function requireClinicAccess(clinicId: string) {
  const user = await requireAuth()
  if (user.clinicId !== clinicId) {
    throw new Error("Forbidden")
  }
  return user
}
