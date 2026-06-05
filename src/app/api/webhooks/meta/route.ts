import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MetaClient, getClinicMetaConfig } from '@/lib/meta-client'
import { createZAI } from '@/lib/zai'

// ─── GET: Webhook verification ─────────────────────────────
// Meta sends GET with hub.mode=subscribe, hub.verify_token, hub.challenge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN

  if (!verifyToken) {
    console.error('[Webhook] META_WEBHOOK_VERIFY_TOKEN not configured')
    return NextResponse.json({ error: 'Webhook no configurado' }, { status: 500 })
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] Verification successful')
    // Return the challenge as plain text (Meta expects this)
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  console.warn('[Webhook] Verification failed', { mode, token })
  return NextResponse.json({ error: 'Verificacion fallida' }, { status: 403 })
}

// ─── POST: Inbound messages & status updates ───────────────
export async function POST(req: NextRequest) {
  // ALWAYS return 200 quickly to Meta — they retry otherwise
  // Process everything asynchronously

  const bodyText = await req.text()

  // Parse body for processing
  let body: Record<string, unknown>
  try {
    body = JSON.parse(bodyText)
  } catch {
    console.error('[Webhook] Invalid JSON body')
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  }

  // Process asynchronously
  processWebhookPayload(body).catch((error) => {
    console.error('[Webhook] Async processing error:', error)
  })

  // Always return 200 immediately
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

// ─── Async webhook processing ──────────────────────────────
async function processWebhookPayload(body: Record<string, unknown>) {
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
        await handleIncomingMessage(msg)
      }
    } catch (error) {
      console.error('[Webhook] Error processing message:', error)
    }
  }
}

// ─── Handle message status updates (delivered, read) ───────
async function handleStatusUpdate(msg: { messageId: string; status?: string; errors?: Array<{ code: number; message: string }> }) {
  if (!db) return

  try {
    // Find message by wamid
    const message = await db.message.findFirst({
      where: { wamid: msg.messageId },
      select: { id: true },
    })

    if (message && msg.status === 'failed') {
      // Could update a status field, but for now just log
      console.warn(`[Webhook] Message ${msg.messageId} failed:`, msg.errors)
    }
  } catch (error) {
    console.error('[Webhook] handleStatusUpdate error:', error)
  }
}

// ─── Handle incoming message ───────────────────────────────
async function handleIncomingMessage(msg: {
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
}) {
  if (!db) return

  // 1. Find the clinic by wabaId
  const clinic = await db.clinic.findFirst({
    where: { wabaId: msg.clinicWabaId },
    select: { id: true, personaName: true },
  })

  if (!clinic) {
    console.warn(`[Webhook] No clinic found for wabaId: ${msg.clinicWabaId}`)
    return
  }

  // 2. Find or create a Patient by phone number
  const phoneRaw = msg.from  // e.g. "5215512345678"
  // Strip country code prefix for matching (MX: "52" or "521")
  const phoneForLookup = phoneRaw.replace(/^521?/, '')

  let patient = await db.patient.findFirst({
    where: {
      clinicId: clinic.id,
      phone: { contains: phoneForLookup },
    },
  })

  if (!patient) {
    // Create a new patient from the phone number
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

  // 3. Find or create a Conversation for this patient+clinic
  let conversation = await db.conversation.findFirst({
    where: {
      clinicId: clinic.id,
      patientId: patient.id,
      status: 'active',
      channel: 'whatsapp',
    },
  })

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        channel: 'whatsapp',
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

  // 5. Create inbound Message record
  const inboundMessage = await db.message.create({
    data: {
      clinicId: clinic.id,
      conversationId: conversation.id,
      direction: 'inbound',
      channel: 'whatsapp',
      senderType: 'patient',
      content,
      messageType,
      wamid: msg.messageId,
      isMock: false,
    },
  })

  // 6. Update conversation lastMessageAt
  await db.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  })

  // 7. Trigger the orchestrator to generate AI response
  try {
    const aiResponse = await generateAIResponse(content, clinic.id, conversation.id)

    // 8. Send AI response back via WhatsApp
    if (aiResponse) {
      const metaConfig = await getClinicMetaConfig(clinic.id)
      if (metaConfig) {
        const metaClient = new MetaClient(metaConfig)
        try {
          const sendResult = await metaClient.sendTextMessage(msg.from, aiResponse)

          // 9. Persist the AI response as outbound Message with wamid
          await db.message.create({
            data: {
              clinicId: clinic.id,
              conversationId: conversation.id,
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

          // Update conversation lastMessageAt again
          await db.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date() },
          })
        } catch (sendError) {
          console.error('[Webhook] Failed to send WhatsApp response:', sendError)
          // Still save the AI response without wamid
          await db.message.create({
            data: {
              clinicId: clinic.id,
              conversationId: conversation.id,
              direction: 'outbound',
              channel: 'whatsapp',
              senderType: 'agent',
              content: aiResponse,
              messageType: 'text',
              agentName: 'Sinap Desk',
              aiGenerated: true,
              isMock: false,
            },
          })
        }
      }
    }
  } catch (orchestratorError) {
    console.error('[Webhook] Orchestrator error:', orchestratorError)
  }

  // Mark incoming message as read on WhatsApp
  const metaConfig = await getClinicMetaConfig(clinic.id)
  if (metaConfig) {
    const metaClient = new MetaClient(metaConfig)
    metaClient.markAsRead(msg.messageId).catch(() => {
      // Silently ignore read receipt failures
    })
  }
}

// ─── Generate AI response (same logic as orchestrator) ──────
async function generateAIResponse(
  message: string,
  clinicId: string,
  conversationId: string
): Promise<string | null> {
  try {
    // Route to agent based on keywords
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
- NUNCA diagnostiques ni recetes. Solo informacion y gestion de citas.`,

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
      }).catch(() => {
        // Ignore DB errors in this update
      })
    }

    return aiResponse || null
  } catch (error) {
    console.error('[Webhook] generateAIResponse error:', error)
    return null
  }
}
