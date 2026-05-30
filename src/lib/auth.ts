import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

// Lazy-load Prisma only when needed — avoids crash if DB is unavailable (e.g. Vercel serverless without SQLite)
async function getDb() {
  try {
    const { db } = await import("./db")
    return db
  } catch {
    return null
  }
}

export const authOptions: NextAuthOptions = {
  // No PrismaAdapter — we use JWT strategy, so no database sessions needed
  // The authorize() function handles user lookup with error handling
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const db = await getDb()
        if (!db) {
          console.warn("[Auth] Database not available — cannot authenticate with credentials")
          return null
        }

        try {
          const user = await db.user.findUnique({
            where: { email: credentials.email },
            include: { clinic: true },
          })

          if (!user || !user.password) {
            return null
          }

          const isValid = await bcrypt.compare(credentials.password, user.password)
          if (!isValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            clinicId: user.clinicId,
          }
        } catch (error) {
          console.error("[Auth] Database error during authorize:", error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.clinicId = (user as any).clinicId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub
        (session.user as any).role = token.role
        (session.user as any).clinicId = token.clinicId
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
