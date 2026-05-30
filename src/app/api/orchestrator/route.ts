import ZAI from 'z-ai-web-dev-sdk'
import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(req: NextRequest) {
  try {
    const { message, clinicId, patientId, conversationHistory, targetAgent } = await req.json()

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

    return NextResponse.json({
      response: completion.choices[0]?.message?.content,
      agent: agentLabels[agent],
      routedAgent: agent,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Orchestrator error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
