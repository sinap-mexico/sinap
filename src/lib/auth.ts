import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

// Lazy-load Prisma only when needed
async function getDb() {
  try {
    const { db } = await import("./db")
    return db
  } catch (error) {
    console.error("[Auth] Failed to import db:", error)
    return null
  }
}

// Build authOptions as a FUNCTION — ensures env vars are read at request time,
// not at module import time. This is CRITICAL for Vercel serverless where
// cold starts may not have env vars available during module initialization.
export function getAuthOptions(): NextAuthOptions {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    console.error("[Auth] NEXTAUTH_SECRET is not set — authentication will fail!")
  }

  return {
    providers: [
      CredentialsProvider({
        name: "credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            console.warn("[Auth] Missing email or password")
            return null
          }

          const db = await getDb()
          if (!db) {
            console.error("[Auth] Database not available")
            return null
          }

          try {
            const user = await db.user.findUnique({
              where: { email: credentials.email },
              include: { clinic: true },
            })

            if (!user || !user.password) {
              console.warn("[Auth] User not found or no password:", credentials.email)
              return null
            }

            const isValid = await bcrypt.compare(credentials.password, user.password)
            if (!isValid) {
              console.warn("[Auth] Invalid password for:", credentials.email)
              return null
            }

            // Check if the clinic is active (trial expired = inactive)
            if (user.clinic && !user.clinic.isActive) {
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                clinicId: user.clinicId,
                trialExpired: true,
              }
            }

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              clinicId: user.clinicId,
            }
          } catch (error) {
            console.error("[Auth] Database error:", error)
            return null
          }
        },
      }),
    ],
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.role = (user as any).role
          token.clinicId = (user as any).clinicId
          token.trialExpired = (user as any).trialExpired ?? false
        }
        return token
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as any).id = token.sub
          (session.user as any).role = token.role
          (session.user as any).clinicId = token.clinicId
          (session.user as any).trialExpired = token.trialExpired
        }
        return session
      },
    },
    pages: {
      signIn: "/login",
      error: "/login",
    },
    secret: secret,
    debug: process.env.NODE_ENV === "development",
  }
}

// Legacy static export — WARNING: this evaluates env vars at import time
// which may not work on Vercel serverless. Use getAuthOptions() for request-time evaluation.
export const authOptions = getAuthOptions()
