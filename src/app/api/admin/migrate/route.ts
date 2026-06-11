// ─── Admin: Sync Prisma Schema to Database ──────────────────
// One-time endpoint to push schema changes to the production DB.
// Run this after adding new columns/tables to prisma/schema.prisma.
// Can be deleted after successful migration.

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Simple auth check — require a secret to prevent abuse
  const authHeader = req.headers.get('authorization')
  const body = await req.json().catch(() => ({}))
  const secret = body.secret || authHeader?.replace('Bearer ', '')

  if (!secret || secret !== process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized — provide secret' }, { status: 401 })
  }

  try {
    const { execSync } = await import('node:child_process')

    // Run prisma db push to sync schema
    const output = execSync('npx prisma db push --accept-data-loss 2>&1', {
      timeout: 60_000,
      env: {
        ...process.env,
        // Ensure we use the production DATABASE_URL (already set in Vercel env)
      },
    })

    const result = output.toString()

    return NextResponse.json({
      success: true,
      output: result,
      message: 'Schema synced successfully',
    })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Migration] Failed:', errMsg)
    return NextResponse.json({
      success: false,
      error: errMsg,
    }, { status: 500 })
  }
}
