import ZAI from 'z-ai-web-dev-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
- Puedes dar informacion medica general, pero no diagnostica.
- Responde en espanol mexicano.`,

  bill: `Eres el asistente de Sinap Bill para una clinica de salud en Mexico.
Tu trabajo es ayudar con facturacion y CFDI.
Reglas:
- Se directo y profesional. Sin emojis.
- Puedes informar sobre estados de facturas, montos y metodos de pago.
- Puedes ayudar a generar CFDI 4.0.
- Puedes explicar conceptos fiscales basicos (forma de pago, metodo de pago, uso CFDI).
- Responde en espanol mexicano.
- Para consultas fiscales complejas, sugiere contactar al contador.`,

  grow: `Eres el asistente de Sinap Grow para una clinica de salud en Mexico.
Tu trabajo es ayudar con marketing y reactivacion de pacientes.
Reglas:
- Se directo y profesional. Sin emojis.
- Puedes sugerir campanas de reactivacion para pacientes inactivos.
- Puedes ayudar a segmentar pacientes y crear mensajes personalizados.
- Puedes dar sugerencias de contenido para redes sociales.
- Responde en espanol mexicano, cercano pero profesional.`,
}

function routeToAgent(message: string): AgentName {
  const lower = message.toLowerCase()

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

  if (maxScore === 0) return 'desk' // Default to reception

  if (score.desk === maxScore) return 'desk'
  if (score.flow === maxScore) return 'flow'
  if (score.bill === maxScore) return 'bill'
  return 'grow'
}

const agentLabels: Record<AgentName, string> = {
  desk: 'Sinap Desk',
  flow: 'Sinap Flow',
  bill: 'Sinap Bill',
  grow: 'Sinap Grow',
}

// Map agent names to conversation currentAgent values
const agentToCurrentAgent: Record<AgentName, string> = {
  desk: 'reception',
  flow: 'clinical',
  bill: 'billing',
  grow: 'marketing',
}

export async function POST(req: NextRequest) {
  try {
    const { message, clinicId, patientId, conversationId, conversationHistory, targetAgent } = await req.json()

    const agent: AgentName = (targetAgent as AgentName) || routeToAgent(message || '')
    const systemPrompt = agentSystemPrompts[agent] || agentSystemPrompts.desk

    const zai = await ZAI.create()

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(conversationHistory || []).map((m: { direction: string; text: string }) => ({
        role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      })),
      { role: 'user' as const, content: message },
    ]

    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 400,
    })

    const aiResponse = completion.choices[0]?.message?.content

    // Persist messages to DB
    if (db) {
      try {
        if (conversationId) {
          // conversationId provided — the Desk component handles message creation
          // via fire-and-forget POST /api/messages. We only update conversation metadata
          // here to avoid duplicate message records.
          await db.conversation.update({
            where: { id: conversationId },
            data: {
              lastMessageAt: new Date(),
              currentAgent: agentToCurrentAgent[agent] || 'reception',
            },
          })
        } else if (patientId && clinicId) {
          // No conversationId but patientId + clinicId — this is a direct API call
          // (not from the Desk component). We handle full persistence here.
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
            // Create a new conversation for this patient
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
              },
            })
          }

          // Update conversation's lastMessageAt and currentAgent
          await db.conversation.update({
            where: { id: convId },
            data: {
              lastMessageAt: new Date(),
              currentAgent: agentToCurrentAgent[agent] || 'reception',
            },
          })
        }
      } catch (dbError) {
        // DB persistence failure should NOT fail the overall request
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
