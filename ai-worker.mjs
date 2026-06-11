#!/usr/bin/env node
// AI Auto-Reply Worker
// Runs on the local machine (which can reach internal-api.z.ai)
// Polls the production DB for inbound messages that need AI response,
// generates responses, and sends them via the Meta WhatsApp API.

import { execSync } from 'node:child_process'

// ─── Config ─────────────────────────────────────────────────
const CLINIC_ID = 'cmq1g50tw0000ib04slhgdhip'
const POLL_INTERVAL_MS = 5000 // 5 seconds
const DB_URL = process.env.DATABASE_URL || ''

// Meta API config
const META_GRAPH_VERSION = 'v21.0'
const META_ACCESS_TOKEN = 'EAAfxSCMvrEEBRknpbI5egSccjOIutZAN7Ls4bDoF21FwQQcaoWqaTZAeaZAPshiP4qTQvFBfptdzij4YgbjLFvqn0STvuZAfO7GdwjiB9Q3AGxqzKxtkr32UBdZAZB3erjwlbKc31I29sDgR0pPsdTV2Okws2ZCy0i2B7U4QvC7oQ2AMgJfZBJZCt5Cw99oGXWwZDZD'
const META_PHONE_NUMBER_ID = '1147269261808282'

// ─── AI via CLI ─────────────────────────────────────────────
function generateAIResponse(userMessage) {
  try {
    const escapedMsg = userMessage.replace(/"/g, '\\"').replace(/`/g, '\\`')
    const systemPrompt = 'Eres el asistente de Sinap Desk para una clinica de salud en Mexico. Tu trabajo es atender pacientes por WhatsApp. Se directo y profesional. Sin emojis. Responde en espanol mexicano. NUNCA diagnostiques ni recetes. Solo informacion y gestion de citas. Responde en menos de 100 palabras.'

    const result = execSync(
      `z-ai-generate chat -p "${escapedMsg}" -s "${systemPrompt}" -o /tmp/ai-response.json`,
      { timeout: 15000, encoding: 'utf8' }
    )

    const data = JSON.parse(require('fs').readFileSync('/tmp/ai-response.json', 'utf8'))
    return data.choices?.[0]?.message?.content || null
  } catch (err) {
    console.error('[AI Worker] AI generation failed:', err.message)
    return null
  }
}

// ─── Send via Meta API ──────────────────────────────────────
async function sendWhatsAppMessage(to, text) {
  // Normalize Mexican phone: 521XXXXXXXXXX → 52XXXXXXXXXX
  const normalizedTo = /^521\d{10}$/.test(to) ? to.replace(/^521/, '52') : to

  const response = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedTo,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    }
  )

  const data = await response.json()
  if (data.error) {
    throw new Error(`Meta API error ${data.error.code}: ${data.error.message}`)
  }
  return data
}

// ─── Main worker loop ───────────────────────────────────────
async function processPendingMessages() {
  if (!DB_URL) {
    console.error('[AI Worker] DATABASE_URL not set')
    return
  }

  try {
    // Find inbound messages that don't have an AI response yet
    // Look for the latest inbound message in conversations where auto-reply is ON
    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()

    // Check if auto-reply is enabled
    const autoReplyFlag = await db.featureFlag.findFirst({
      where: { clinicId: CLINIC_ID, module: 'desk', feature: 'auto-reply' },
      select: { state: true },
    })

    if (autoReplyFlag?.state !== 'on') {
      await db.$disconnect()
      return // Auto-reply is off, skip
    }

    // Find conversations with recent inbound messages that have no outbound AI response
    const recentCutoff = new Date(Date.now() - 2 * 60 * 1000) // Last 2 minutes

    const conversations = await db.conversation.findMany({
      where: {
        clinicId: CLINIC_ID,
        channel: 'whatsapp',
        status: 'active',
        lastMessageAt: { gte: recentCutoff },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            direction: true,
            senderType: true,
            content: true,
            aiGenerated: true,
            createdAt: true,
          },
        },
        patient: { select: { phone: true } },
      },
    })

    for (const conv of conversations) {
      const lastMsg = conv.messages[0]
      if (!lastMsg) continue

      // Only process if last message is inbound from patient
      if (lastMsg.direction !== 'inbound' || lastMsg.senderType !== 'patient') continue

      // Check if there's already an AI response after this inbound message
      const hasAIResponse = conv.messages.some(
        m => m.direction === 'outbound' && m.aiGenerated && m.createdAt > lastMsg.createdAt
      )
      // Also check if there's any outbound (doctor or AI) after the inbound
      const hasAnyResponse = conv.messages.some(
        m => m.direction === 'outbound' && m.createdAt > lastMsg.createdAt
      )
      if (hasAnyResponse) continue

      // This conversation needs an AI response!
      console.log(`[AI Worker] Processing: "${lastMsg.content}" from ${conv.patient?.phone}`)

      const aiResponse = generateAIResponse(lastMsg.content)
      if (!aiResponse) {
        console.warn('[AI Worker] No AI response generated, skipping')
        continue
      }

      console.log(`[AI Worker] AI response: "${aiResponse.substring(0, 80)}"`)

      // Send via WhatsApp
      try {
        const sendResult = await sendWhatsAppMessage(conv.patient?.phone || '', aiResponse)
        const wamid = sendResult.messages?.[0]?.id || null

        // Save AI response to DB
        await db.message.create({
          data: {
            clinicId: CLINIC_ID,
            conversationId: conv.id,
            direction: 'outbound',
            channel: 'whatsapp',
            senderType: 'agent',
            content: aiResponse,
            messageType: 'text',
            agentName: 'Sinap Desk',
            aiGenerated: true,
            wamid,
            isMock: false,
          },
        })

        await db.conversation.update({
          where: { id: conv.id },
          data: { lastMessageAt: new Date() },
        })

        console.log(`[AI Worker] ✅ Response sent and saved (wamid: ${wamid})`)
      } catch (sendError) {
        console.error('[AI Worker] Send failed:', sendError.message)

        // Still save the response locally
        await db.message.create({
          data: {
            clinicId: CLINIC_ID,
            conversationId: conv.id,
            direction: 'outbound',
            channel: 'whatsapp',
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

    await db.$disconnect()
  } catch (err) {
    console.error('[AI Worker] Error:', err.message)
  }
}

// ─── Start polling ──────────────────────────────────────────
console.log('[AI Worker] Starting... polling every', POLL_INTERVAL_MS / 1000, 'seconds')
processPendingMessages() // Initial run
setInterval(processPendingMessages, POLL_INTERVAL_MS)
