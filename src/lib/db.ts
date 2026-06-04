import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create PrismaClient — works with PostgreSQL (Supabase)
// Returns null only if no DATABASE_URL is set (shouldn't happen on Vercel)
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
// In production (Vercel), also cache to avoid creating new clients on warm functions
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (db) {
  globalForPrisma.prisma = db
}
