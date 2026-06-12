// ─── Meta Send — Send a message from Desk via WhatsApp/Instagram/Messenger ──
// Used when a doctor/staff member replies from the Sinap Desk UI.
// Sends the message directly to the patient via the connected channel
// without generating an AI auto-response.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MetaClient, getClinicMetaConfig, getClinicMetaConnection, type MetaChannel } from '@/lib/meta-client'

// ─── Normalize Mexican phone numbers for WhatsApp API ───────
// WhatsApp Cloud API requires format: 52 + 10 digits (without the "1" after 52)
// But incoming webhooks may store numbers as 521 + 10 digits (old Mexican format)
// Examples:
//   DB: 5216624618691 → API: 526624618691
//   DB: 5215512345678 → API: 5215512345678 (11-digit local, keep as-is)
function normalizePhoneForWhatsApp(phone: string): string {
  // If starts with 521 and has 13 digits total (521 + 10), strip the "1"
  // Mexican mobile: +52 1 XXX XXX XXXX → WhatsApp wants 52XXXXXXXXXX
  if (/^521\d{10}$/.test(phone)) {
    return phone.replace(/^521/, '52')
  }
  return phone
}

export async function POST(req: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
    }

    const body = await req.json()
    const { clinicId, conversationId, content, channel } = body

    if (!clinicId || !conversationId || !content) {
      return NextResponse.json(
        { error: 'clinicId, conversationId, and content are required' },
        { status: 400 }
      )
    }

    // 1. Look up the conversation to get patient and channel info
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: {
        channel: true,
        patientId: true,
        patient: { select: { phone: true } },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversacion no encontrada' }, { status: 404 })
    }

    const targetChannel = (channel || conversation.channel) as MetaChannel
    const rawPhone = conversation.patient?.phone || ''
    const patientPhone = targetChannel === 'whatsapp' ? normalizePhoneForWhatsApp(rawPhone) : rawPhone

    if (!patientPhone) {
      return NextResponse.json({ error: 'Paciente sin telefono' }, { status: 400 })
    }

    // 2. Save the doctor's outbound message to DB first
    const savedMessage = await db.message.create({
      data: {
        clinicId,
        conversationId,
        direction: 'outbound',
        channel: targetChannel,
        senderType: 'doctor',
        content,
        messageType: 'text',
        isMock: false,
      },
    })

    // 3. Update conversation lastMessageAt
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    // 4. Send via the connected channel
    let wamid: string | null = null

    try {
      // Try MetaConnection first (new source of truth)
      const channelConfig = await getClinicMetaConnection(clinicId, targetChannel)

      if (channelConfig) {
        const metaClient = MetaClient.createForChannel(targetChannel, channelConfig)
        const sendResult = await metaClient.sendTextMessage(patientPhone, content)
        wamid = sendResult.messageId
      } else if (targetChannel === 'whatsapp') {
        // Fallback: legacy Clinic table
        const metaConfig = await getClinicMetaConfig(clinicId)
        if (metaConfig) {
          const metaClient = new MetaClient(metaConfig)
          const sendResult = await metaClient.sendTextMessage(patientPhone, content)
          wamid = sendResult.messageId
        }
      }

      // Update message with wamid if we got one
      if (wamid) {
        await db.message.update({
          where: { id: savedMessage.id },
          data: { wamid },
        })
      }
    } catch (sendError) {
      const sendErrMsg = sendError instanceof Error ? sendError.message : String(sendError)
      console.error('[Meta Send] Failed to send via channel:', sendErrMsg)
      // Message is already saved locally — the doctor's message persists even if channel send fails
      return NextResponse.json({
        message: savedMessage,
        sent: false,
        error: 'Mensaje guardado pero no enviado por el canal',
        detail: sendErrMsg,
      })
    }

    return NextResponse.json({
      message: savedMessage,
      sent: true,
      wamid,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Meta Send] Error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
