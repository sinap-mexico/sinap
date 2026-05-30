import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create PrismaClient — works with both SQLite (dev) and PostgreSQL (Supabase)
// Gracefully returns null if no DATABASE_URL is set (demo mode on Vercel)
function createPrismaClient(): PrismaClient | null {
  const dbUrl = process.env.DATABASE_URL

  if (!dbUrl) {
    console.warn('[DB] No DATABASE_URL set — database features disabled')
    return null
  }

  try {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : ['warn'],
    })
    return client
  } catch (error) {
    console.error('[DB] Failed to create PrismaClient:', error)
    return null
  }
}

// In development, reuse the client to avoid connection pool exhaustion
// In production (Vercel), each cold start creates a new client
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production' && db) {
  globalForPrisma.prisma = db
}
