import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
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
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!secret) {
    console.error("[Auth] NEXTAUTH_SECRET is not set — authentication will fail!")
  }
  if (!googleClientId || !googleClientSecret) {
    console.error("[Auth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set!", {
      hasClientId: !!googleClientId,
      hasClientSecret: !!googleClientSecret,
      clientIdPrefix: googleClientId?.slice(0, 10),
    })
  }

  return {
    providers: [
      // ─── Google OAuth ───────────────────────────────────
      GoogleProvider({
        clientId: googleClientId || "",
        clientSecret: googleClientSecret || "",
        allowDangerousEmailAccountLinking: true, // Permite vincular cuenta existente con Google
      }),

      // ─── Credentials (email + password) ─────────────────
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
            // But allow login for premium/enterprise accounts regardless
            if (user.clinic && !user.clinic.isActive && user.clinic.plan !== 'premium' && user.clinic.plan !== 'enterprise') {
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
      async signIn({ user, account, profile }) {
        // ─── Google OAuth sign-in ───────────────────────
        if (account?.provider === "google" && user.email) {
          const db = await getDb()
          if (!db) {
            console.error("[Auth] Database not available for Google sign-in — allowing login without DB")
            // Still allow sign-in even without DB — JWT will work
            ;(user as any).role = "owner"
            return true
          }

          try {
            // Check if user already exists
            const existingUser = await db.user.findUnique({
              where: { email: user.email },
              include: { clinic: true },
            })

            if (existingUser) {
              // User exists — check if clinic is active (skip for premium/enterprise)
              if (existingUser.clinic && !existingUser.clinic.isActive && existingUser.clinic.plan !== 'premium' && existingUser.clinic.plan !== 'enterprise') {
                // Trial expired — still allow sign in but flag it
                ;(user as any).trialExpired = true
              }
              // Update image & emailVerified if Google provides them
              try {
                if (user.image && !existingUser.image) {
                  await db.user.update({
                    where: { id: existingUser.id },
                    data: { image: user.image, emailVerified: new Date() },
                  })
                } else if (!existingUser.emailVerified) {
                  await db.user.update({
                    where: { id: existingUser.id },
                    data: { emailVerified: new Date() },
                  })
                }
              } catch (updateErr) {
                console.warn("[Auth] Non-critical: failed to update user image/emailVerified:", updateErr)
              }

              // Upsert Account record to store OAuth tokens (non-blocking)
              try {
                const providerAccountId = account.providerAccountId || user.id
                await db.account.upsert({
                  where: {
                    provider_providerAccountId: {
                      provider: "google",
                      providerAccountId,
                    },
                  },
                  create: {
                    userId: existingUser.id,
                    type: account.type || "oauth",
                    provider: "google",
                    providerAccountId,
                    refresh_token: account.refresh_token ?? null,
                    access_token: account.access_token ?? null,
                    expires_at: account.expires_at ?? null,
                    token_type: account.token_type ?? null,
                    scope: account.scope ?? null,
                    id_token: account.id_token ?? null,
                    session_state: account.session_state ?? null,
                  },
                  update: {
                    refresh_token: account.refresh_token ?? undefined,
                    access_token: account.access_token ?? undefined,
                    expires_at: account.expires_at ?? undefined,
                    scope: account.scope ?? undefined,
                    id_token: account.id_token ?? undefined,
                  },
                })
              } catch (accountErr) {
                console.warn("[Auth] Non-critical: failed to upsert Account record:", accountErr)
              }

              // Pass data to JWT callback
              ;(user as any).id = existingUser.id   // Override Google OAuth ID with our DB user ID
              ;(user as any).role = existingUser.role
              ;(user as any).clinicId = existingUser.clinicId
              return true
            }

            // New user — create account with trial
            const now = new Date()
            const trialEnd = new Date(now)
            trialEnd.setDate(trialEnd.getDate() + 7) // 7-day free trial with all features

            // Create a solo clinic for the new user
            const slug = (user.name || "clinica").toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40) + "-" + Date.now().toString(36)
            const clinic = await db.clinic.create({
              data: {
                name: user.name || "Mi Consultorio",
                slug,
                email: user.email,
                mode: "solo",
                plan: "enterprise",
                maxDoctors: 999,
                monthlyConvLimit: 999999,
                trialStart: now,
                trialEnd: trialEnd,
                isActive: true,
              },
            })

            // Create user without password (Google auth)
            const newUser = await db.user.create({
              data: {
                name: user.name || "",
                email: user.email,
                image: user.image,
                password: null, // No password — Google only
                role: "owner",
                clinicId: clinic.id,
                emailVerified: new Date(),
              },
            })

            // Create Account record to store Google OAuth tokens (non-blocking)
            try {
              const providerAccountId = account.providerAccountId || user.id
              await db.account.create({
                data: {
                  userId: newUser.id,
                  type: account.type || "oauth",
                  provider: "google",
                  providerAccountId,
                  refresh_token: account.refresh_token ?? null,
                  access_token: account.access_token ?? null,
                  expires_at: account.expires_at ?? null,
                  token_type: account.token_type ?? null,
                  scope: account.scope ?? null,
                  id_token: account.id_token ?? null,
                  session_state: account.session_state ?? null,
                },
              })
            } catch (accountErr) {
              console.warn("[Auth] Non-critical: failed to create Account record:", accountErr)
            }

            // Pass data to JWT callback
            ;(user as any).id = newUser.id   // Override Google OAuth ID with our DB user ID
            ;(user as any).role = newUser.role
            ;(user as any).clinicId = newUser.clinicId
            ;(user as any).isNewUser = true

            return true
          } catch (error) {
            console.error("[Auth] Google sign-in error:", error)
            // Don't block sign-in for DB errors — at least let JWT auth work
            ;(user as any).role = "owner"
            return true
          }
        }

        // ─── Credentials sign-in (handled by authorize()) ──
        return true
      },
      async jwt({ token, user, account }) {
        if (user) {
          token.role = (user as any).role
          token.clinicId = (user as any).clinicId
          token.trialExpired = (user as any).trialExpired ?? false
          token.isNewUser = (user as any).isNewUser ?? false
          // If we got a DB user id from signIn callback, use it instead of OAuth subject
          if ((user as any).id) {
            token.sub = (user as any).id
          }
        }
        // Ensure token.sub is always our DB user ID (not Google OAuth subject)
        // Check on every JWT refresh if sub looks like a non-CUID (Google IDs are numeric)
        if (token.email && token.sub && !token.sub.startsWith('cl')) {
          const db = await getDb()
          if (db) {
            const dbUser = await db.user.findUnique({
              where: { email: token.email },
              select: { id: true, role: true, clinicId: true },
            })
            if (dbUser) {
              token.sub = dbUser.id
              token.role = dbUser.role
              token.clinicId = dbUser.clinicId
            }
          }
        }
        // For Google OAuth first sign-in, fetch user data from DB if not in token
        if (!token.clinicId && token.email) {
          const db = await getDb()
          if (db) {
            const dbUser = await db.user.findUnique({
              where: { email: token.email },
              select: { id: true, role: true, clinicId: true },
            })
            if (dbUser) {
              token.sub = dbUser.id       // Ensure sub is our DB user ID
              token.role = dbUser.role
              token.clinicId = dbUser.clinicId
            }
          }
        }
        return token
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as any).id = token.sub
          (session.user as any).role = token.role
          (session.user as any).clinicId = token.clinicId
          (session.user as any).trialExpired = token.trialExpired
          ;(session.user as any).isNewUser = token.isNewUser
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
