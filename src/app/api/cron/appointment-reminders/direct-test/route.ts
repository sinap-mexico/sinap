// ─── Direct Meta API Test ──────────────────────────────────
// Makes a raw API call to Meta's WhatsApp Cloud API and returns
// the FULL response including headers, status, and body.
// This helps diagnose why messages aren't being delivered.
//
// Usage: GET /api/cron/appointment-reminders/direct-test?clinicId=xxx
// Requires: Authorization: Bearer <CRON_SECRET>

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getClinicMetaConfig, getClinicMetaConnection } from '@/lib/meta-client'

const CRON_SECRET = process.env.CRON_SECRET

function normalizePhoneForWhatsApp(phone: string): string {
  if (/^521\d{10}$/.test(phone)) {
    return phone.replace(/^521/, '52')
  }
  return phone
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!db) {
    return NextResponse.json({ error: 'DB unavailable' }, { status: 500 })
  }

  try {
    const url = new URL(req.url)
    const clinicId = url.searchParams.get('clinicId') || 'cmq1g50tw0000ib04slhgdhip'
    const testPhone = url.searchParams.get('phone') // Optional: override phone number

    // 1. Get Meta connection
    const channelConfig = await getClinicMetaConnection(clinicId, 'whatsapp')
    const metaConfig = await getClinicMetaConfig(clinicId)

    let phoneNumberId: string
    let accessToken: string
    let wabaId: string

    if (channelConfig) {
      phoneNumberId = channelConfig.phoneNumberId || ''
      accessToken = channelConfig.accessToken
      wabaId = channelConfig.businessId || ''
    } else if (metaConfig) {
      phoneNumberId = metaConfig.phoneNumberId
      accessToken = metaConfig.accessToken
      wabaId = metaConfig.wabaId
    } else {
      return NextResponse.json({ error: 'No WhatsApp connection found' }, { status: 400 })
    }

    // 2. Get patient phone
    const patient = await db.patient.findFirst({
      where: {
        clinicId,
        phone: { not: null },
        doNotContact: false,
      },
      select: { id: true, fullName: true, phone: true },
    })

    const rawPhone = testPhone || patient?.phone || ''
    const normalizedPhone = normalizePhoneForWhatsApp(rawPhone)

    // 3. Test 1: Send free-form text message
    const textMessageBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: '🧪 Sinap Test - Si ves este mensaje, los recordatorios funcionan! Puedes ignorar este mensaje de prueba.',
      },
    }

    console.log(`[DirectTest] Sending text to ${normalizedPhone} via phone ${phoneNumberId}`)

    const textResponse = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(textMessageBody),
      }
    )

    const textResponseBody = await textResponse.json()

    // 4. Test 2: Try template message (hello_world is always approved)
    const templateMessageBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'template',
      template: {
        name: 'hello_world',
        language: { code: 'en_US' },
      },
    }

    const templateResponse = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateMessageBody),
      }
    )

    const templateResponseBody = await templateResponse.json()

    // 5. Check 24h conversation window status
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const conversation = await db.conversation.findFirst({
      where: {
        clinicId,
        patientId: patient?.id,
        channel: 'whatsapp',
      },
      select: { id: true, lastMessageAt: true },
    })

    const lastInboundMessage = conversation
      ? await db.message.findFirst({
          where: {
            conversationId: conversation.id,
            direction: 'inbound',
            createdAt: { gte: twentyFourHoursAgo },
          },
          select: { id: true, createdAt: true },
        })
      : null

    const windowOpen = !!lastInboundMessage

    // 6. Return full diagnostic
    return NextResponse.json({
      patient: {
        name: patient?.fullName,
        rawPhone,
        normalizedPhone,
      },
      connection: {
        phoneNumberId,
        wabaId,
        tokenPrefix: accessToken.substring(0, 15) + '...',
      },
      conversationWindow: {
        open: windowOpen,
        lastInbound: lastInboundMessage?.createdAt || null,
        windowClosesAt: lastInboundMessage
          ? new Date(new Date(lastInboundMessage.createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
          : null,
      },
      testResults: {
        freeText: {
          status: textResponse.status,
          statusText: textResponse.statusText,
          body: textResponseBody,
        },
        template: {
          status: templateResponse.status,
          statusText: templateResponse.statusText,
          body: templateResponseBody,
        },
      },
      diagnosis: {
        canSendFreeText: textResponse.ok && !!textResponseBody.messages?.[0]?.id,
        canSendTemplate: templateResponse.ok && !!templateResponseBody.messages?.[0]?.id,
        recommendation: !textResponse.ok && !templateResponse.ok
          ? 'WhatsApp Business account may need verification. Neither free-text nor template messages are being accepted.'
          : !windowOpen && textResponse.ok
            ? 'WARNING: Free-text was accepted but 24h window is closed. Message may be queued but not delivered. Use templates for business-initiated messages.'
            : templateResponse.ok
              ? 'Template messages work! Recommend using templates for reminders.'
              : 'Check WhatsApp Business account status.',
      },
    })

  } catch (error) {
    console.error('[DirectTest] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
