import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  if (!db) return NextResponse.json({ error: 'No DB' }, { status: 503 })

  try {
    const correctClinicId = 'cmq1g50tw0000ib04slhgdhip'

    // Find conversations for the correct clinic
    const conversations = await db.conversation.findMany({
      where: { clinicId: correctClinicId },
      include: {
        patient: { select: { fullName: true, phone: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            direction: true,
            channel: true,
            senderType: true,
            content: true,
            aiGenerated: true,
            agentName: true,
            wamid: true,
            createdAt: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    // Also check MetaConnection status
    const metaConnections = await db.metaConnection.findMany({
      where: { clinicId: correctClinicId },
      select: {
        id: true,
        channel: true,
        status: true,
        businessId: true,
        phoneNumberId: true,
        businessName: true,
        connectedAt: true,
      },
    })

    // Check recent webhook events (last 10)
    const recentEvents = await db.$queryRaw<Array<{
      id: string
      provider_event_id: string
      channel: string
      processing_status: string
      received_at: string
      processed_at: string | null
    }>>`
      SELECT id, provider_event_id, channel, processing_status, received_at, processed_at
      FROM meta_webhook_events
      ORDER BY received_at DESC
      LIMIT 10
    `.catch(() => [])

    // Environment variable check (no secrets exposed)
    const envCheck = {
      META_APP_ID: !!process.env.META_APP_ID,
      META_APP_SECRET: !!process.env.META_APP_SECRET,
      META_WEBHOOK_VERIFY_TOKEN: !!process.env.META_WEBHOOK_VERIFY_TOKEN,
      META_WHATSAPP_PHONE_NUMBER_ID: process.env.META_WHATSAPP_PHONE_NUMBER_ID || 'NOT SET',
      META_WHATSAPP_WABA_ID: process.env.META_WHATSAPP_WABA_ID || 'NOT SET',
      META_TOKEN_ENCRYPTION_KEY: !!process.env.META_TOKEN_ENCRYPTION_KEY,
    }

    return NextResponse.json({
      conversations,
      totalMessages: conversations.reduce((sum, c) => sum + c.messages.length, 0),
      metaConnections,
      wabaIdMismatch: metaConnections.length > 0 && process.env.META_WHATSAPP_WABA_ID
        ? metaConnections[0].businessId !== process.env.META_WHATSAPP_WABA_ID
        : false,
      envCheck,
      recentEvents,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
