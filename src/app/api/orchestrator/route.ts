// ─── AI Orchestrator — Multi-channel bridge ──────────────────────
// Routes messages to specialized agents and bridges AI responses
// back to the correct channel (WhatsApp, Instagram, Messenger).
// Now uses the shared ai-orchestrator module with full clinic context.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MetaClient, getClinicMetaConfig, getClinicMetaConnection } from '@/lib/meta-client'
import type { MetaChannel } from '@/lib/meta-client'
import {
  generateContextualResponse,
  generateEmergencyResponse,
  loadClinicContext,
  routeToAgent,
  agentLabels,
  agentToCurrentAgent,
  type AgentName,
} from '@/lib/ai-orchestrator'

// ─── Normalize Mexican phone numbers for WhatsApp API ───────
function normalizePhoneForWhatsApp(phone: string): string {
  if (/^521\d{10}$/.test(phone)) {
    return phone.replace(/^521/, '52')
  }
  return phone
}

export async function POST(req: NextRequest) {
  try {
    const { message, clinicId, patientId, conversationId, conversationHistory, targetAgent } = await req.json()

    const agent: AgentName = (targetAgent as AgentName) || routeToAgent(message || '')

    // Use the shared orchestrator with full clinic context and conversation history
    const aiResult = await generateContextualResponse(message, clinicId, conversationId, {
      targetAgent: agent,
    })

    const aiResponse = aiResult?.text || null

    // ── Multi-channel bridging: send AI response via the correct channel ──
    let channelMessageId: string | null = null

    if (aiResponse && db && clinicId) {
      try {
        // Get the conversation to check channel and find patient phone
        const conv = conversationId
          ? await db.conversation.findUnique({
              where: { id: conversationId },
              select: { channel: true, patientId: true },
            })
          : null

        const channel = (conv?.channel || 'whatsapp') as MetaChannel

        if (conv?.patientId) {
          const patient = await db.patient.findUnique({
            where: { id: conv.patientId },
            select: { phone: true },
          })

          if (patient?.phone) {
            // Normalize phone for WhatsApp (strip Mexican "1" after country code)
            const phoneToSend = channel === 'whatsapp' ? normalizePhoneForWhatsApp(patient.phone) : patient.phone
            // Try MetaConnection first (new source of truth for all channels)
            const channelConfig = await getClinicMetaConnection(clinicId, channel)

            if (channelConfig) {
              const metaClient = MetaClient.createForChannel(channel, channelConfig)
              const sendResult = await metaClient.sendTextMessage(phoneToSend, aiResponse)
              channelMessageId = sendResult.messageId
            } else if (channel === 'whatsapp') {
              // Fallback: legacy Clinic table for WhatsApp only
              const metaConfig = await getClinicMetaConfig(clinicId)
              if (metaConfig) {
                const metaClient = new MetaClient(metaConfig)
                const sendResult = await metaClient.sendTextMessage(phoneToSend, aiResponse)
                channelMessageId = sendResult.messageId
              }
            }
          }
        }
      } catch (bridgeError) {
        // Channel send failure should NOT fail the orchestrator response
        console.error('Orchestrator channel bridge error:', bridgeError)
      }
    }

    // Persist messages to DB
    if (db) {
      try {
        if (conversationId) {
          await db.conversation.update({
            where: { id: conversationId },
            data: {
              lastMessageAt: new Date(),
              currentAgent: agentToCurrentAgent[agent] || 'reception',
            },
          })

          // If channel was used, find the latest outbound AI message and set wamid
          if (channelMessageId) {
            const latestAiMsg = await db.message.findFirst({
              where: {
                conversationId,
                direction: 'outbound',
                aiGenerated: true,
                wamid: null,
              },
              orderBy: { createdAt: 'desc' },
            })
            if (latestAiMsg) {
              await db.message.update({
                where: { id: latestAiMsg.id },
                data: { wamid: channelMessageId },
              })
            }
          }
        } else if (patientId && clinicId) {
          // No conversationId but patientId + clinicId — direct API call
          let convChannel = 'whatsapp'
          let resolvedClinicId = clinicId as string
          let convId: string

          const existingConv = await db.conversation.findFirst({
            where: { patientId, clinicId, status: 'active' },
            select: { id: true, channel: true },
          })

          if (existingConv) {
            convId = existingConv.id
            convChannel = existingConv.channel
          } else {
            const newConv = await db.conversation.create({
              data: {
                clinicId,
                patientId,
                channel: 'whatsapp',
                status: 'active',
                currentAgent: agentToCurrentAgent[agent] || 'reception',
                isMock: true,
              },
            })
            convId = newConv.id
            convChannel = newConv.channel
          }

          // Save inbound message (user/patient message)
          await db.message.create({
            data: {
              clinicId: resolvedClinicId,
              conversationId: convId,
              direction: 'inbound',
              channel: convChannel,
              senderType: 'patient',
              content: message,
              messageType: 'text',
              agentName: null,
              aiGenerated: false,
              isMock: true,
            },
          })

          // Save outbound message (AI response)
          if (aiResponse) {
            await db.message.create({
              data: {
                clinicId: resolvedClinicId,
                conversationId: convId,
                direction: 'outbound',
                channel: convChannel,
                senderType: 'agent',
                content: aiResponse,
                messageType: 'text',
                agentName: agentLabels[agent],
                aiGenerated: true,
                isMock: true,
                wamid: channelMessageId,
              },
            })
          }

          await db.conversation.update({
            where: { id: convId },
            data: {
              lastMessageAt: new Date(),
              currentAgent: agentToCurrentAgent[agent] || 'reception',
            },
          })
        }
      } catch (dbError) {
        console.error('Orchestrator DB save error:', dbError)
      }
    }

    return NextResponse.json({
      response: aiResponse,
      agent: agentLabels[agent],
      routedAgent: agent,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Orchestrator error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
