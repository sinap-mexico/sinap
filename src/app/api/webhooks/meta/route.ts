// ─── Meta Universal Webhook — WhatsApp + Instagram + Messenger ──────
// Receives inbound messages, validates signature, normalizes,
// persists, and triggers AI orchestrator.
// Follows the Sinap Meta Integration Guide (v1.0).

import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MetaClient, getClinicMetaConfig, getClinicMetaConnection, type MetaChannel } from '@/lib/meta-client'
import { createZAI } from '@/lib/zai'

// ─── Config ────────────────────────────────────────────────
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN
const APP_SECRET = process.env.META_APP_SECRET

// ─── GET: Webhook verification ─────────────────────────────
// Meta sends GET with hub.mode=subscribe, hub.verify_token, hub.challenge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (!VERIFY_TOKEN) {
    console.error('[Webhook] META_WEBHOOK_VERIFY_TOKEN not configured')
    return NextResponse.json({ error: 'Webhook no configurado' }, { status: 500 })
  }

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    console.log('[Webhook] Verification successful')
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  console.warn('[Webhook] Verification failed', { mode, token: token ? '***' : 'missing' })
  return NextResponse.json({ error: 'Verificacion fallida' }, { status: 403 })
}

// ─── Signature verification ────────────────────────────────
// Per the guide: validate X-Hub-Signature-256 before trusting the body.
function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!APP_SECRET) {
    // In development without APP_SECRET, log a warning but allow
    console.warn('[Webhook] META_APP_SECRET not set — signature verification disabled. Set it for production!')
    return true
  }

  if (!signature?.startsWith('sha256=')) {
    console.warn('[Webhook] Missing or invalid signature format')
    return false
  }

  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', APP_SECRET)
      .update(rawBody)
      .digest('hex')

  // Timing-safe comparison to prevent timing attacks
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// ─── POST: Inbound messages & status updates ───────────────
export async function POST(req: NextRequest) {
  // 1. Read raw body as text (required for signature verification)
  const rawBody = await req.text()

  // 2. Validate signature BEFORE parsing
  const signature = req.headers.get('x-hub-signature-256')
  if (!verifySignature(rawBody, signature)) {
    console.error('[Webhook] Invalid signature — rejecting payload')
    return new NextResponse('Invalid signature', { status: 401 })
  }

  // 3. Parse body
  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    console.error('[Webhook] Invalid JSON body')
    return new NextResponse('EVENT_RECEIVED', { status: 200 })
  }

  // 4. Persist raw webhook event for audit (fire-and-forget)
  persistWebhookEvent(body, signature).catch((err) => {
    console.error('[Webhook] Event persistence error:', err)
  })

  // 5. Process asynchronously — always return 200 immediately
  processWebhookPayload(body).catch((error) => {
    console.error('[Webhook] Async processing error:', error)
  })

  // Meta requires a fast 200 response
  return new NextResponse('EVENT_RECEIVED', { status: 200 })
}

// ─── Persist raw webhook event for audit and idempotency ───
async function persistWebhookEvent(body: Record<string, unknown>, signature: string | null) {
  if (!db) return

  try {
    const channel = MetaClient.detectChannel(body)
    const entries = body.entry as Array<Record<string, unknown>> | undefined
    const entryId = entries?.[0]?.id as string | undefined

    // Generate a stable event ID from the payload
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(body))
      .digest('hex')
      .slice(0, 32)

    const providerEventId = `wh_${entryId || 'unknown'}_${payloadHash}`

    // Check for duplicate (idempotency)
    const existing = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM meta_webhook_events WHERE provider_event_id = ${providerEventId} LIMIT 1
    `.catch(() => [])

    if (existing && existing.length > 0) {
      console.log('[Webhook] Duplicate event detected, skipping persistence:', providerEventId)
      return
    }

    await db.$executeRaw`
      INSERT INTO meta_webhook_events (id, provider_event_id, channel, payload, signature_valid, processing_status, received_at)
      VALUES (
        gen_random_uuid(),
        ${providerEventId},
        ${channel},
        ${JSON.stringify(body)}::jsonb,
        ${signature !== null},
        'pending',
        now()
      )
      ON CONFLICT (provider_event_id) DO NOTHING
    `
  } catch (error) {
    // Audit persistence failure should not block processing
    console.error('[Webhook] Event persistence error (non-blocking):', error)
  }
}

// ─── Async webhook processing ──────────────────────────────
async function processWebhookPayload(body: Record<string, unknown>) {
  const channel = MetaClient.detectChannel(body)
  const parsedMessages = MetaClient.parseWebhookPayload(body)

  for (const msg of parsedMessages) {
    try {
      // ── Handle status updates ─────────────────────
      if (msg.type === 'system' && msg.status) {
        await handleStatusUpdate(msg)
        continue
      }

      // ── Handle incoming messages ──────────────────
      if (msg.type !== 'system') {
        console.log(`[Webhook] Processing ${channel} message from ${msg.from}, type: ${msg.type}, wamid: ${msg.messageId}, hasText: ${!!msg.text}`)
        await handleIncomingMessage(msg, channel)
      }
    } catch (error) {
      console.error('[Webhook] Error processing message:', error, {
        from: msg.from,
        messageId: msg.messageId,
        type: msg.type,
        channel,
      })
    }
  }

  // Mark webhook event as processed
  try {
    const entries = body.entry as Array<Record<string, unknown>> | undefined
    const entryId = entries?.[0]?.id as string | undefined
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(body))
      .digest('hex')
      .slice(0, 32)
    const providerEventId = `wh_${entryId || 'unknown'}_${payloadHash}`

    if (db) {
      await db.$executeRaw`
        UPDATE meta_webhook_events
        SET processing_status = 'processed', processed_at = now()
        WHERE provider_event_id = ${providerEventId}
      `.catch(() => {})
    }
  } catch {
    // Non-critical
  }
}

// ─── Handle message status updates (delivered, read, failed) ──
async function handleStatusUpdate(msg: { messageId: string; status?: string; errors?: Array<{ code: number; message: string }> }) {
  if (!db) return

  try {
    const message = await db.message.findFirst({
      where: { wamid: msg.messageId },
      select: { id: true },
    })

    if (message && msg.status === 'failed') {
      console.warn(`[Webhook] Message ${msg.messageId} failed:`, msg.errors)
    }

    // Update message status in the future could go here
    // e.g., db.message.update({ where: { id: message.id }, data: { deliveryStatus: msg.status } })
  } catch (error) {
    console.error('[Webhook] handleStatusUpdate error:', error)
  }
}

// ─── Find clinic by channel and business ID ────────────────
async function findClinicByChannel(channel: MetaChannel, businessId: string, phoneNumberId?: string): Promise<{ id: string; personaName: string | null } | null> {
  if (!db) return null

  try {
    // First try MetaConnection table (new source of truth)
    let connectionData: { clinicId: string; clinic: { id: string; personaName: string | null } } | null = null

    switch (channel) {
      case 'whatsapp':
        // Try by businessId first, then by phoneNumberId
        connectionData = await db.metaConnection.findFirst({
          where: { businessId, channel: 'whatsapp', status: 'active' },
          select: { clinicId: true, clinic: { select: { id: true, personaName: true } } },
        }) as { clinicId: string; clinic: { id: string; personaName: string | null } } | null

        if (!connectionData && phoneNumberId) {
          connectionData = await db.metaConnection.findFirst({
            where: { phoneNumberId, channel: 'whatsapp', status: 'active' },
            select: { clinicId: true, clinic: { select: { id: true, personaName: true } } },
          }) as { clinicId: string; clinic: { id: string; personaName: string | null } } | null
        }

        // Also try any active WhatsApp connection regardless of specific IDs
        if (!connectionData) {
          connectionData = await db.metaConnection.findFirst({
            where: { channel: 'whatsapp', status: 'active' },
            select: { clinicId: true, clinic: { select: { id: true, personaName: true } } },
          }) as { clinicId: string; clinic: { id: string; personaName: string | null } } | null
        }
        break
      case 'instagram':
        connectionData = await db.metaConnection.findFirst({
          where: { businessId, channel: 'instagram', status: 'active' },
          select: { clinicId: true, clinic: { select: { id: true, personaName: true } } },
        }) as { clinicId: string; clinic: { id: string; personaName: string | null } } | null

        if (!connectionData) {
          connectionData = await db.metaConnection.findFirst({
            where: { channel: 'instagram', status: 'active' },
            select: { clinicId: true, clinic: { select: { id: true, personaName: true } } },
          }) as { clinicId: string; clinic: { id: string; personaName: string | null } } | null
        }
        break
      case 'messenger':
        connectionData = await db.metaConnection.findFirst({
          where: { pageId: businessId, channel: 'messenger', status: 'active' },
          select: { clinicId: true, clinic: { select: { id: true, personaName: true } } },
        }) as { clinicId: string; clinic: { id: string; personaName: string | null } } | null

        if (!connectionData) {
          connectionData = await db.metaConnection.findFirst({
            where: { channel: 'messenger', status: 'active' },
            select: { clinicId: true, clinic: { select: { id: true, personaName: true } } },
          }) as { clinicId: string; clinic: { id: string; personaName: string | null } } | null
        }
        break
    }

    if (connectionData?.clinic) {
      return connectionData.clinic
    }

    // Fallback: legacy Clinic table fields (for backward compat)
    if (channel === 'whatsapp') {
      const clinic = await db.clinic.findFirst({
        where: { wabaId: businessId },
        select: { id: true, personaName: true },
      })
      if (clinic) return clinic

      // Last resort: try by phoneNumberId on Clinic table
      if (phoneNumberId) {
        const clinicByPhone = await db.clinic.findFirst({
          where: { phoneNumberId },
          select: { id: true, personaName: true },
        })
        if (clinicByPhone) return clinicByPhone
      }

      // Ultimate fallback: if env vars are set, use the first clinic with matching env config
      const envWabaId = process.env.META_WHATSAPP_WABA_ID
      const envPhoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID
      if (envWabaId && (businessId === envWabaId || phoneNumberId === envPhoneNumberId)) {
        console.log('[Webhook] Using env var fallback to find clinic')
        const anyClinic = await db.clinic.findFirst({
          select: { id: true, personaName: true },
        })
        if (anyClinic) {
          // Auto-create MetaConnection for future lookups
          try {
            const envToken = process.env.META_WHATSAPP_ACCESS_TOKEN
            if (envToken) {
              const { encryptToken } = await import('@/lib/meta/token-vault')
              await db.metaConnection.upsert({
                where: { clinicId_channel: { clinicId: anyClinic.id, channel: 'whatsapp' } },
                create: {
                  clinicId: anyClinic.id,
                  channel: 'whatsapp',
                  businessId: envWabaId,
                  phoneNumberId: envPhoneNumberId || null,
                  accessToken: encryptToken(envToken),
                  status: 'active',
                  businessName: 'Sinap WhatsApp',
                },
                update: {
                  businessId: envWabaId,
                  phoneNumberId: envPhoneNumberId || null,
                  accessToken: encryptToken(envToken),
                  status: 'active',
                },
              })
              // Also update legacy Clinic fields
              await db.clinic.update({
                where: { id: anyClinic.id },
                data: { wabaId: envWabaId, phoneNumberId: envPhoneNumberId || null, metaAccessToken: encryptToken(envToken) },
              }).catch(() => {})
              console.log('[Webhook] Auto-created MetaConnection from env vars for clinic:', anyClinic.id)
            }
          } catch (e) {
            console.error('[Webhook] Auto-create MetaConnection failed:', e)
          }
          return anyClinic
        }
      }
    }

    return null
  } catch (error) {
    console.error('[Webhook] findClinicByChannel error:', error)
    return null
  }
}

// ─── Handle incoming message ───────────────────────────────
async function handleIncomingMessage(
  msg: {
    channel: MetaChannel
    clinicWabaId: string
    from: string
    messageId: string
    timestamp: number
    type: string
    text?: string
    mediaId?: string
    caption?: string
    interactiveResponse?: string
    buttonReply?: string
    igUserId?: string
    psid?: string
    pageId?: string
    phoneNumberId?: string
    displayPhoneNumber?: string
  },
  detectedChannel: MetaChannel
) {
  if (!db) return

  const channel = msg.channel || detectedChannel

  // ── Guard: Skip echo messages from our own business phone number ──
  // When Sinap sends an outbound message via the Meta API, Meta may echo
  // it back via the webhook (if message_echoes is subscribed). We must
  // detect and skip these to prevent infinite AI response loops.
  //
  // Detection strategy: Compare msg.from (sender phone) with the business
  // display_phone_number from webhook metadata. For a real user message,
  // msg.from is the user's phone number. For an echo, msg.from is the
  // business phone number itself.
  if (channel === 'whatsapp') {
    if (msg.displayPhoneNumber) {
      // Normalize both numbers (strip non-digits) for comparison
      const fromClean = msg.from.replace(/\D/g, '')
      const displayClean = msg.displayPhoneNumber.replace(/\D/g, '')
      if (fromClean && displayClean && fromClean === displayClean) {
        console.log('[Webhook] Skipping echo message — from matches business display phone:', msg.from)
        return
      }
    }
    // Fallback: also check via env var phone number ID if displayPhoneNumber not available
    const envPhoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID
    if (envPhoneNumberId && msg.phoneNumberId === envPhoneNumberId) {
      // phoneNumberId in metadata is ALWAYS the business number for incoming messages.
      // But if from also looks like our number, it's definitely an echo.
      // We can't rely solely on phoneNumberId match (it matches for ALL inbound messages).
      // Only skip if we have strong evidence this is an echo.
      // The displayPhoneNumber check above should catch most cases.
      console.log('[Webhook] Note: phoneNumberId matches env var for message:', msg.messageId, 'from:', msg.from)
    }
  }

  // 1. Find the clinic — use businessId and phoneNumberId from webhook
  const businessId = msg.clinicWabaId
  const clinic = await findClinicByChannel(channel, businessId, msg.phoneNumberId)

  if (!clinic) {
    console.warn(`[Webhook] No clinic found for ${channel} businessId: ${businessId}`)
    return
  }

  // 2. Find or create a Patient
  let patient: { id: string; [key: string]: unknown } | null = null
  const channelSource: Record<string, string> = {
    whatsapp: 'whatsapp',
    instagram: 'instagram',
    messenger: 'facebook',
  }

  if (channel === 'whatsapp') {
    const phoneRaw = msg.from
    const phoneForLookup = phoneRaw.replace(/^521?/, '')

    patient = await db.patient.findFirst({
      where: {
        clinicId: clinic.id,
        phone: { contains: phoneForLookup },
      },
    })

    if (!patient) {
      patient = await db.patient.create({
        data: {
          clinicId: clinic.id,
          firstName: 'Paciente',
          lastName: phoneRaw.slice(-4),
          fullName: `Paciente ${phoneRaw.slice(-4)}`,
          phone: phoneRaw,
          source: 'whatsapp',
          firstContactDate: new Date(),
          preferredChannel: 'whatsapp',
        },
      })
    }
  } else {
    // Instagram or Messenger — use platform user ID as identifier
    const platformUserId = msg.from
    const idForLookup = `${channel}:${platformUserId}`

    patient = await db.patient.findFirst({
      where: {
        clinicId: clinic.id,
        phone: idForLookup,
      },
    })

    if (!patient) {
      patient = await db.patient.create({
        data: {
          clinicId: clinic.id,
          firstName: 'Paciente',
          lastName: platformUserId.slice(-4),
          fullName: `Paciente ${platformUserId.slice(-4)}`,
          phone: idForLookup,
          source: channelSource[channel] || channel,
          firstContactDate: new Date(),
          preferredChannel: channel === 'instagram' ? 'instagram' : 'facebook',
        },
      })
    }
  }

  if (!patient) {
    console.warn(`[Webhook] Could not find or create patient for ${channel}`)
    return
  }

  // 3. Find or create a Conversation for this patient+clinic+channel
  let conversation = await db.conversation.findFirst({
    where: {
      clinicId: clinic.id,
      patientId: patient.id,
      status: 'active',
      channel: channel,
    },
  })

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        channel: channel,
        status: 'active',
        currentAgent: 'reception',
        isMock: false,
      },
    })
  }

  // 4. Determine message content
  let content = msg.text || msg.buttonReply || msg.interactiveResponse || ''
  if (msg.caption) {
    content = msg.caption + (content ? ` — ${content}` : '')
  }
  if (!content && msg.type !== 'text') {
    content = `[${msg.type}]`
  }

  // Determine message type for DB
  let messageType = 'text'
  if (msg.type === 'image' || msg.type === 'document' || msg.type === 'audio' || msg.type === 'video') {
    messageType = msg.type
  } else if (msg.type === 'interactive') {
    messageType = 'interactive'
  }

  // 5. Create inbound Message record (with duplicate detection by wamid)
  try {
    // Check if message already exists (duplicate webhook delivery)
    if (msg.messageId) {
      const existing = await db.message.findFirst({
        where: { wamid: msg.messageId },
        select: { id: true },
      })
      if (existing) {
        console.log('[Webhook] Skipping duplicate message with wamid:', msg.messageId)
        return
      }
    }

    await db.message.create({
      data: {
        clinicId: clinic.id,
        conversationId: conversation.id,
        direction: 'inbound',
        channel: channel,
        senderType: 'patient',
        content,
        messageType,
        wamid: msg.messageId,
        isMock: false,
      },
    })

    console.log(`[Webhook] Saved inbound message from ${msg.from} (wamid: ${msg.messageId}) in conversation ${conversation.id}`)
  } catch (msgCreateError) {
    console.error('[Webhook] Failed to create message:', msgCreateError, {
      wamid: msg.messageId,
      from: msg.from,
      conversationId: conversation.id,
    })
    // If it's a unique constraint violation on wamid, it's a duplicate — skip
    const errMsg = msgCreateError instanceof Error ? msgCreateError.message : String(msgCreateError)
    if (errMsg.includes('Unique') || errMsg.includes('unique') || errMsg.includes('duplicate')) {
      console.log('[Webhook] Duplicate message detected via DB constraint, skipping:', msg.messageId)
      return
    }
    throw msgCreateError // Re-throw other errors
  }

  // 6. Update conversation lastMessageAt
  await db.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  })

  // 7. Trigger the orchestrator to generate AI response
  try {
    const aiResponse = await generateAIResponse(content, clinic.id, conversation.id)

    // 8. Send AI response back via the appropriate channel
    if (aiResponse) {
      const normalizedRecipient = channel === 'whatsapp' ? normalizePhoneForWhatsApp(msg.from) : msg.from
      await sendAIResponse(aiResponse, clinic.id, channel, normalizedRecipient, conversation.id)
    }
  } catch (orchestratorError) {
    console.error('[Webhook] Orchestrator error:', orchestratorError)
  }

  // 9. Mark as read (all channels that support it)
  try {
    const channelConfig = await getClinicMetaConnection(clinic.id, channel)
    if (channelConfig) {
      const metaClient = MetaClient.createForChannel(channel, channelConfig)
      metaClient.markAsRead(msg.messageId).catch(() => {
        // Silently ignore read receipt failures
      })
    }
  } catch {
    // Non-critical
  }
}

// ─── Normalize Mexican phone numbers for WhatsApp API ───────
function normalizePhoneForWhatsApp(phone: string): string {
  if (/^521\d{10}$/.test(phone)) {
    return phone.replace(/^521/, '52')
  }
  return phone
}

// ─── Send AI response via the correct channel ──────────────
async function sendAIResponse(
  aiResponse: string,
  clinicId: string,
  channel: MetaChannel,
  recipientId: string,
  conversationId: string
) {
  if (!db) return

  try {
    // Try MetaConnection first (new source of truth)
    const channelConfig = await getClinicMetaConnection(clinicId, channel)

    if (channelConfig) {
      const metaClient = MetaClient.createForChannel(channel, channelConfig)
      const sendResult = await metaClient.sendTextMessage(recipientId, aiResponse)

      // Persist the AI response
      await db.message.create({
        data: {
          clinicId,
          conversationId,
          direction: 'outbound',
          channel,
          senderType: 'agent',
          content: aiResponse,
          messageType: 'text',
          agentName: 'Sinap Desk',
          aiGenerated: true,
          wamid: sendResult.messageId,
          isMock: false,
        },
      })

      await db.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      })
      return
    }

    // Fallback: legacy Clinic table for WhatsApp only
    if (channel === 'whatsapp') {
      const metaConfig = await getClinicMetaConfig(clinicId)
      if (metaConfig) {
        const metaClient = new MetaClient(metaConfig)
        const sendResult = await metaClient.sendTextMessage(recipientId, aiResponse)

        await db.message.create({
          data: {
            clinicId,
            conversationId,
            direction: 'outbound',
            channel: 'whatsapp',
            senderType: 'agent',
            content: aiResponse,
            messageType: 'text',
            agentName: 'Sinap Desk',
            aiGenerated: true,
            wamid: sendResult.messageId,
            isMock: false,
          },
        })

        await db.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        })
        return
      }
    }

    // No connection found — save AI response without sending
    console.warn(`[Webhook] No ${channel} connection for clinic ${clinicId} — saving response locally`)
    await db.message.create({
      data: {
        clinicId,
        conversationId,
        direction: 'outbound',
        channel,
        senderType: 'agent',
        content: aiResponse,
        messageType: 'text',
        agentName: 'Sinap Desk',
        aiGenerated: true,
        isMock: false,
      },
    })
  } catch (sendError) {
    console.error(`[Webhook] Failed to send ${channel} response:`, sendError)
    // Still save the AI response without wamid
    await db.message.create({
      data: {
        clinicId,
        conversationId,
        direction: 'outbound',
        channel,
        senderType: 'agent',
        content: aiResponse,
        messageType: 'text',
        agentName: 'Sinap Desk',
        aiGenerated: true,
        isMock: false,
      },
    }).catch(() => {})
  }
}

// ─── Generate AI response ──────────────────────────────────
async function generateAIResponse(
  message: string,
  clinicId: string,
  conversationId: string
): Promise<string | null> {
  try {
    type AgentName = 'desk' | 'flow' | 'bill' | 'grow'

    const agentSystemPrompts: Record<AgentName, string> = {
      desk: `Eres el asistente de Sinap Desk para una clinica de salud en Mexico.
Tu trabajo es atender pacientes por WhatsApp/Instagram/Facebook Messenger.
Reglas:
- Se directo y profesional. Sin emojis. Sin jerga innecesaria.
- Puedes agendar, confirmar, cancelar y reagendar citas.
- Puedes dar informacion de precios y servicios de la clinica.
- Si el paciente tiene una queja o emergencia, sugiere contactar directamente al doctor.
- Si no estas seguro de algo, ofrece conectar con el personal.
- Responde en espanol mexicano, cercano pero profesional.
- NUNCA diagnostiques ni recetes. Solo informacion y gestion de citas.
- Si detectas urgencia, reclamacion o solicitud clinica, escala a personal.`,

      flow: `Eres el asistente clinico de Sinap Flow para una clinica de salud en Mexico.
Tu trabajo es ayudar con pre-consulta y notas SOAP.
Reglas:
- Se directo y profesional. Sin emojis. Terminologia medica en espanol.
- Puedes generar preguntas de pre-consulta personalizadas.
- Puedes ayudar a generar borradores de notas SOAP.
- NUNCA des diagnosticos definitivos. Solo sugerencias marcadas como SUGERIDO.
- Siempre indica que cualquier diagnostico o plan requiere aprobacion del medico.
- Responde en espanol mexicano.`,

      bill: `Eres el asistente de Sinap Bill para una clinica de salud en Mexico.
Tu trabajo es ayudar con facturacion y CFDI.
Reglas:
- Se directo y profesional. Sin emojis.
- Puedes informar sobre estados de facturas, montos y metodos de pago.
- Puedes ayudar a generar CFDI 4.0.
- Responde en espanol mexicano.
- Para consultas fiscales complejas, sugiere contactar al contador.`,

      grow: `Eres el asistente de Sinap Grow para una clinica de salud en Mexico.
Tu trabajo es ayudar con marketing y reactivacion de pacientes.
Reglas:
- Se directo y profesional. Sin emojis.
- Puedes sugerir campanas de reactivacion para pacientes inactivos.
- Responde en espanol mexicano, cercano pero profesional.`,
    }

    function routeToAgent(msg: string): AgentName {
      const lower = msg.toLowerCase()
      const deskKeywords = ['cita', 'agendar', 'horario', 'confirmar', 'cancelar', 'reagendar', 'precio', 'costo', 'servicio', 'disponib', 'consultorio', 'hora', 'turno']
      const flowKeywords = ['sintoma', 'dolor', 'molesta', 'pre-consulta', 'preconsulta', 'soap', 'nota clinica', 'consulta medica', 'diagnostico', 'tratamiento', 'receta', 'exploracion']
      const billKeywords = ['factura', 'pago', 'cobro', 'cfdi', 'timbre', 'xml', 'pdf', 'facturar', 'recibo', 'comprobante', 'metodo de pago', 'forma de pago', 'iva']
      const growKeywords = ['campana', 'marketing', 'reactivar', 'inactivo', 'redes sociales', 'promocion', 'descuento', 'paciente nuevo']

      const score: Record<AgentName, number> = { desk: 0, flow: 0, bill: 0, grow: 0 }
      deskKeywords.forEach((kw) => { if (lower.includes(kw)) score.desk += 1 })
      flowKeywords.forEach((kw) => { if (lower.includes(kw)) score.flow += 1 })
      billKeywords.forEach((kw) => { if (lower.includes(kw)) score.bill += 1 })
      growKeywords.forEach((kw) => { if (lower.includes(kw)) score.grow += 1 })

      const maxScore = Math.max(score.desk, score.flow, score.bill, score.grow)
      if (maxScore === 0) return 'desk'
      if (score.desk === maxScore) return 'desk'
      if (score.flow === maxScore) return 'flow'
      if (score.bill === maxScore) return 'bill'
      return 'grow'
    }

    const agent = routeToAgent(message)
    const systemPrompt = agentSystemPrompts[agent]

    const zai = await createZAI()

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 400,
    })

    const aiResponse = completion.choices[0]?.message?.content

    // Update conversation currentAgent
    const agentToCurrentAgent: Record<string, string> = {
      desk: 'reception',
      flow: 'clinical',
      bill: 'billing',
      grow: 'marketing',
    }

    if (db) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { currentAgent: agentToCurrentAgent[agent] || 'reception' },
      }).catch(() => {})
    }

    return aiResponse || null
  } catch (error) {
    console.error('[Webhook] generateAIResponse error:', error)
    return null
  }
}
