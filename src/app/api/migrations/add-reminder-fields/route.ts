// ─── One-time Migration: Add reminder fields to Appointment ───
// This endpoint runs the ALTER TABLE migration to add reminder24hSent
// and reminder24hSentAt columns to the Appointment table.
// DELETE this file after running the migration.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  // Security check - only allow with a secret
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET
  
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 })
  }

  try {
    // Check if columns already exist by trying to query them
    try {
      await db.appointment.findFirst({
        where: { reminder24hSent: false },
        select: { id: true },
      })
      return NextResponse.json({ 
        status: 'already_exists', 
        message: 'Columns reminder24hSent and reminder24hSentAt already exist in Appointment table' 
      })
    } catch {
      // Columns don't exist, proceed with migration
    }

    // Execute raw SQL to add the columns
    await db.$executeRawUnsafe(`
      ALTER TABLE "Appointment"
      ADD COLUMN IF NOT EXISTS "reminder24hSent" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "reminder24hSentAt" TIMESTAMP(3);
    `)

    // Verify the migration worked
    await db.appointment.findFirst({
      where: { reminder24hSent: false },
      select: { id: true },
    })

    return NextResponse.json({ 
      status: 'success', 
      message: 'Added reminder24hSent and reminder24hSentAt columns to Appointment table' 
    })
  } catch (error) {
    console.error('[Migration/ReminderFields] Error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
