// ─── One-time Migration: Add reminder fields to Appointment ───
// This endpoint runs the ALTER TABLE migration to add reminder24hSent
// and reminder24hSentAt columns to the Appointment table.
// Safe: uses IF NOT EXISTS, idempotent, can be called multiple times.
// After confirming it works, this endpoint should be removed.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  return runMigration()
}

export async function POST(req: NextRequest) {
  // Security check for POST
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET
  
  if (secret && authHeader && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // POST without auth header is allowed (for initial setup)
  return runMigration()
}

async function runMigration() {
  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 })
  }

  try {
    // Check if columns already exist by trying to query them
    let columnsExist = false
    try {
      await db.appointment.findFirst({
        where: { reminder24hSent: false },
        select: { id: true },
      })
      columnsExist = true
    } catch {
      // Columns don't exist, proceed with migration
    }

    if (columnsExist) {
      return NextResponse.json({ 
        status: 'already_exists', 
        message: 'Columns reminder24hSent and reminder24hSentAt already exist in Appointment table' 
      })
    }

    // Execute raw SQL to add the columns
    await db.$executeRawUnsafe(`
      ALTER TABLE "Appointment"
      ADD COLUMN IF NOT EXISTS "reminder24hSent" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "reminder24hSentAt" TIMESTAMP(3);
    `)

    // Verify the migration worked
    let verified = false
    try {
      await db.appointment.findFirst({
        where: { reminder24hSent: false },
        select: { id: true },
      })
      verified = true
    } catch {
      // Still can't query, something went wrong
    }

    if (verified) {
      return NextResponse.json({ 
        status: 'success', 
        message: 'Added reminder24hSent and reminder24hSentAt columns to Appointment table' 
      })
    } else {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Migration SQL executed but columns still not accessible. May need Prisma regeneration.' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[Migration/ReminderFields] Error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
