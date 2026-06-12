// ─── Admin: Sync Prisma Schema to Database via raw SQL ──────
// Adds missing columns/tables that the Prisma schema expects
// but the production DB doesn't have yet.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  // Simple auth check
  const authHeader = req.headers.get('authorization')
  const body = await req.json().catch(() => ({}))
  const secret = body.secret || authHeader?.replace('Bearer ', '')

  if (!secret || secret !== process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized — provide secret' }, { status: 401 })
  }

  if (!db) {
    return NextResponse.json({ error: 'DB no disponible' }, { status: 503 })
  }

  const results: { step: string; status: string; detail?: string }[] = []

  // Step 1: Add wamid column to Message table
  try {
    await db.$executeRaw`ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "wamid" TEXT`
    results.push({ step: 'Message.wamid', status: 'ok' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    results.push({ step: 'Message.wamid', status: 'error', detail: msg })
  }

  // Step 2: Add mediaUrl column to Message table if missing
  try {
    await db.$executeRaw`ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT`
    results.push({ step: 'Message.mediaUrl', status: 'ok' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    results.push({ step: 'Message.mediaUrl', status: 'error', detail: msg })
  }

  // Step 3: Add confidence column to Message table if missing
  try {
    await db.$executeRaw`ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION`
    results.push({ step: 'Message.confidence', status: 'ok' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    results.push({ step: 'Message.confidence', status: 'error', detail: msg })
  }

  // Step 4: Ensure meta_connections table exists
  try {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "meta_connections" (
        "id" TEXT NOT NULL,
        "clinicId" TEXT NOT NULL,
        "channel" TEXT NOT NULL,
        "businessId" TEXT,
        "phoneNumberId" TEXT,
        "pageId" TEXT,
        "accessToken" TEXT NOT NULL,
        "tokenExpiresAt" TIMESTAMP(3),
        "status" TEXT NOT NULL DEFAULT 'active',
        "businessName" TEXT,
        "oauthCode" TEXT,
        "connectedAt" TIMESTAMP(3),
        "disconnectedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "meta_connections_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "meta_connections_clinicId_channel_key" UNIQUE ("clinicId", "channel")
      )
    `
    results.push({ step: 'meta_connections table', status: 'ok' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    results.push({ step: 'meta_connections table', status: 'error', detail: msg })
  }

  // Step 5: Add foreign key for meta_connections if not exists
  try {
    // Check if FK already exists
    const fkCheck = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM information_schema.table_constraints
      WHERE constraint_name = 'meta_connections_clinicId_fkey'
      AND table_name = 'meta_connections'
    `
    if (fkCheck[0]?.count === BigInt(0)) {
      await db.$executeRaw`
        ALTER TABLE "meta_connections"
        ADD CONSTRAINT "meta_connections_clinicId_fkey"
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `
      results.push({ step: 'meta_connections FK', status: 'ok' })
    } else {
      results.push({ step: 'meta_connections FK', status: 'already_exists' })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    results.push({ step: 'meta_connections FK', status: 'error', detail: msg })
  }

  // Step 6: Ensure meta_webhook_events table exists
  try {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "meta_webhook_events" (
        "id" TEXT NOT NULL,
        "providerEventId" TEXT UNIQUE,
        "clinicId" TEXT,
        "channel" TEXT,
        "payload" JSONB NOT NULL,
        "signatureValid" BOOLEAN NOT NULL DEFAULT false,
        "processingStatus" TEXT NOT NULL DEFAULT 'pending',
        "errorMessage" TEXT,
        "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "processedAt" TIMESTAMP(3),

        CONSTRAINT "meta_webhook_events_pkey" PRIMARY KEY ("id")
      )
    `
    results.push({ step: 'meta_webhook_events table', status: 'ok' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    results.push({ step: 'meta_webhook_events table', status: 'error', detail: msg })
  }

  // Step 7: Ensure Clinic table has WhatsApp columns
  try {
    await db.$executeRaw`ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "wabaId" TEXT`
    await db.$executeRaw`ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "phoneNumberId" TEXT`
    await db.$executeRaw`ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "metaAccessToken" TEXT`
    results.push({ step: 'Clinic WhatsApp columns', status: 'ok' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    results.push({ step: 'Clinic WhatsApp columns', status: 'error', detail: msg })
  }

  // Step 8: Add Conversation.currentAgent column if missing
  try {
    await db.$executeRaw`ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "currentAgent" TEXT`
    results.push({ step: 'Conversation.currentAgent', status: 'ok' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    results.push({ step: 'Conversation.currentAgent', status: 'error', detail: msg })
  }

  const hasErrors = results.some(r => r.status === 'error')

  return NextResponse.json({
    success: !hasErrors,
    results,
    message: hasErrors
      ? 'Migration completed with some errors — check details'
      : 'All migrations applied successfully',
  })
}
