// ─── AI Orchestrator — Context-aware multi-agent AI for Sinap ──────────
// Shared module that provides rich, clinic-specific AI responses
// with conversation history and business context.
// Used by the webhook auto-reply and the orchestrator API route.

import { db } from '@/lib/db'
import { createZAI, type ZAIClient } from '@/lib/zai'

// ─── Types ────────────────────────────────────────────────────
type AgentName = 'desk' | 'flow' | 'bill' | 'grow'

export interface ClinicContext {
  clinicId: string
  clinicName: string
  personaName: string
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  services: Array<{ name: string; price: number; duration: number; category: string | null }>
  doctors: Array<{ name: string; specialty: string | null; workDays: string; workStart: string; workEnd: string }>
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  text: string
  agent: AgentName
  agentLabel: string
}

// ─── Agent routing ────────────────────────────────────────────
function routeToAgent(message: string): AgentName {
  const lower = message.toLowerCase()
  const deskKeywords = ['cita', 'agendar', 'horario', 'confirmar', 'cancelar', 'reagendar', 'precio', 'costo', 'servicio', 'disponib', 'consultorio', 'hora', 'turno', 'hola', 'buenos', 'buenas', 'gracias', 'ubicacion', 'direccion', 'telefono']
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

const agentLabels: Record<AgentName, string> = {
  desk: 'Sinap Desk',
  flow: 'Sinap Flow',
  bill: 'Sinap Bill',
  grow: 'Sinap Grow',
}

const agentToCurrentAgent: Record<AgentName, string> = {
  desk: 'reception',
  flow: 'clinical',
  bill: 'billing',
  grow: 'marketing',
}

// ─── Load clinic context from database ────────────────────────
export async function loadClinicContext(clinicId: string): Promise<ClinicContext | null> {
  if (!db) return null

  try {
    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        name: true,
        personaName: true,
        phone: true,
        address: true,
        city: true,
        state: true,
      },
    })

    if (!clinic) return null

    // Load services with prices
    const services = await db.service.findMany({
      where: { clinicId, isActive: true },
      select: { name: true, price: true, duration: true, category: true },
      orderBy: { name: 'asc' },
    })

    // Load doctors with specialties and schedules
    const doctors = await db.doctor.findMany({
      where: { clinicId, isActive: true },
      select: {
        name: true,
        specialty: true,
        workDays: true,
        workStart: true,
        workEnd: true,
      },
      orderBy: { name: 'asc' },
    })

    return {
      clinicId: clinic.id,
      clinicName: clinic.name,
      personaName: clinic.personaName || clinic.name,
      phone: clinic.phone,
      address: clinic.address,
      city: clinic.city,
      state: clinic.state,
      services,
      doctors,
    }
  } catch (error) {
    console.error('[AI Orchestrator] Error loading clinic context:', error)
    return null
  }
}

// ─── Load conversation history ────────────────────────────────
export async function loadConversationHistory(
  conversationId: string,
  limit: number = 15
): Promise<ConversationMessage[]> {
  if (!db) return []

  try {
    const messages = await db.message.findMany({
      where: {
        conversationId,
        messageType: 'text', // Only text messages for AI context
      },
      select: {
        direction: true,
        content: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Reverse to chronological order and map roles
    return messages.reverse().map((m) => ({
      role: m.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }))
  } catch (error) {
    console.error('[AI Orchestrator] Error loading conversation history:', error)
    return []
  }
}

// ─── Build context-rich system prompt ─────────────────────────
function buildSystemPrompt(agent: AgentName, context: ClinicContext, patientPhone?: string): string {
  const agentName = context.personaName || context.clinicName

  // Format services list
  const servicesList = context.services.length > 0
    ? context.services.map(s => {
        const priceStr = s.price > 0 ? ` - $${s.price.toLocaleString('es-MX')} MXN` : ''
        const durationStr = s.duration > 0 ? ` (${s.duration} min)` : ''
        const categoryStr = s.category ? ` [${s.category}]` : ''
        return `  - ${s.name}${durationStr}${priceStr}${categoryStr}`
      }).join('\n')
    : '  (No hay servicios registrados aún — si preguntan, ofrece contactar a la clínica para información)'

  // Format doctors list with schedules
  const doctorsList = context.doctors.length > 0
    ? context.doctors.map(d => {
        const specialty = d.specialty ? ` — ${d.specialty}` : ''
        const dayMap: Record<string, string> = { '1': 'Lun', '2': 'Mar', '3': 'Mié', '4': 'Jue', '5': 'Vie', '6': 'Sáb', '0': 'Dom' }
        const days = d.workDays.split(',').map(day => dayMap[day.trim()] || day).join(', ')
        return `  - ${d.name}${specialty} | Horario: ${days} ${d.workStart}-${d.workEnd}`
      }).join('\n')
    : '  (No hay doctores registrados aún)'

  // Format location
  const locationParts = [context.address, context.city, context.state].filter(Boolean)
  const location = locationParts.length > 0 ? locationParts.join(', ') : 'No registrada'

  // Base personality and rules shared by all agents
  const basePersonality = `
IDENTIDAD:
Eres ${agentName}, el asistente virtual de ${context.clinicName}.
Eres una clínica dental (odontológica) en México.
Tu personalidad es profesional, cálida y confiable. Hablas como el personal de recepción de una clínica dental de confianza.
Siempre respondes en español mexicano, de manera cercana pero profesional.

INFORMACIÓN DE LA CLÍNICA:
- Nombre: ${context.clinicName}
- Teléfono: ${context.phone || 'No disponible'}
- Ubicación: ${location}

SERVICIOS Y PRECIOS:
${servicesList}

DOCTORES Y HORARIOS:
${doctorsList}`

  // Agent-specific rules
  const agentRules: Record<AgentName, string> = {
    desk: `
TU TRABAJO PRINCIPAL:
Atender pacientes por WhatsApp con información precisa y real de la clínica.

REGLAS:
- Usa la información REAL de la clínica (servicios, precios, doctores, horarios) para responder.
- Cuando alguien pregunte por precios, da los precios EXACTOS que aparecen en la lista de servicios.
- Cuando alguien pregunte por servicios, describe los que ofrece la clínica con los precios y duración.
- Cuando alguien pregunte por doctores, menciona los disponibles con sus especialidades y horarios.
- Puedes agendar, confirmar, cancelar y reagendar citas — pregunta fecha, hora y doctor preferido.
- Si el paciente saluda (hola, buenos días, etc.), responde con calidez, preséntate brevemente como ${agentName} y pregunta en qué puedes ayudar.
- Si alguien pregunta por ubicación, da la dirección real de la clínica.
- Si el paciente tiene una queja o emergencia dental, muestra empatía y sugiere contactar directamente o venir a la clínica.
- NUNCA diagnostiques ni recetes medicamentos. Solo información y gestión de citas.
- Si detectas urgencia dental (dolor fuerte, sangrado, trauma), escala: ofrece el teléfono de la clínica o sugiere venir de inmediato.
- Si no estás seguro de algo que no está en la información de la clínica, ofrece conectar con el personal.
- NO digas "un miembro de nuestro equipo le atenderá" — TÚ eres quien atiende. Responde con información concreta.
- NO uses respuestas genéricas. Siempre usa la información específica de ESTA clínica.`,

    flow: `
TU TRABAJO PRINCIPAL:
Ayudar con pre-consulta y asesoría clínica preliminar.

REGLAS:
- Usa la información REAL de la clínica (servicios, doctores) para dar contexto.
- Puedes generar preguntas de pre-consulta personalizadas según el servicio que van a recibir.
- Puedes ayudar a generar borradores de notas SOAP basándote en los síntomas descritos.
- NUNCA des diagnósticos definitivos. Solo sugerencias marcadas como "SUGERIDO".
- Siempre indica que cualquier diagnóstico o plan requiere aprobación del médico.
- Terminología médica profesional en español.
- Si el paciente describe una urgencia, escala al personal de inmediato.`,

    bill: `
TU TRABAJO PRINCIPAL:
Ayudar con facturación, pagos y CFDI.

REGLAS:
- Usa la información REAL de la clínica y los precios de servicios.
- Puedes informar sobre estados de facturas, montos y métodos de pago.
- Puedes explicar conceptos fiscales básicos (forma de pago, método de pago, uso CFDI).
- Para consultas fiscales complejas, sugiere contactar al contador de la clínica.
- Responde en español mexicano.`,

    grow: `
TU TRABAJO PRINCIPAL:
Ayudar con marketing y reactivación de pacientes.

REGLAS:
- Usa la información REAL de la clínica (servicios, doctores) para crear campañas relevantes.
- Puedes sugerir campañas de reactivación para pacientes inactivos.
- Puedes ayudar a crear mensajes personalizados para campañas de WhatsApp.
- Las campañas deben ser específicas a los servicios y doctores de la clínica.
- Responde en español mexicano, cercano pero profesional.`,
  }

  return `${basePersonality}\n${agentRules[agent]}`
}

// ─── Generate AI response with full context ───────────────────
export async function generateContextualResponse(
  message: string,
  clinicId: string,
  conversationId: string,
  options?: {
    targetAgent?: AgentName
    maxTokens?: number
    temperature?: number
  }
): Promise<AIResponse | null> {
  try {
    // 1. Load clinic context
    const context = await loadClinicContext(clinicId)
    if (!context) {
      console.error('[AI Orchestrator] Could not load clinic context for:', clinicId)
      return null
    }

    // 2. Route to agent (or use specified agent)
    const agent = options?.targetAgent || routeToAgent(message)
    const systemPrompt = buildSystemPrompt(agent, context)

    // 3. Load conversation history
    const history = await loadConversationHistory(conversationId, 15)

    // 4. Build messages array with history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ]

    console.log(`[AI Orchestrator] Agent: ${agent} | History: ${history.length} msgs | Clinic: ${context.clinicName} | Services: ${context.services.length} | Doctors: ${context.doctors.length}`)

    // 5. Call the LLM
    const zai = await createZAI()

    const completion = await zai.chat.completions.create({
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 500,
    })

    const aiResponseText = completion.choices[0]?.message?.content

    if (!aiResponseText) {
      console.warn('[AI Orchestrator] LLM returned empty response')
      return null
    }

    // 6. Update conversation's current agent
    if (db) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { currentAgent: agentToCurrentAgent[agent] || 'reception' },
      }).catch(() => {})
    }

    console.log(`[AI Orchestrator] Response generated (${aiResponseText.length} chars): "${aiResponseText.substring(0, 100)}"`)

    return {
      text: aiResponseText,
      agent,
      agentLabel: agentLabels[agent],
    }
  } catch (error) {
    console.error('[AI Orchestrator] Error generating response:', error)
    return null
  }
}

// ─── Simple response for when clinic context is unavailable ───
export function generateEmergencyResponse(message: string, clinicName?: string): string {
  const name = clinicName || 'la clínica'
  const lower = message.toLowerCase()

  if (lower.includes('hola') || lower.includes('buenos') || lower.includes('buenas')) {
    return `Hola, gracias por contactar a ${name}. En este momento estoy teniendo dificultades técnicas, pero un miembro de nuestro equipo le atenderá pronto. Si es urgente, por favor llámenos directamente.`
  }

  if (lower.includes('cita') || lower.includes('agendar')) {
    return `Gracias por su interés en agendar una cita en ${name}. Estoy experimentando problemas técnicos temporales. Por favor intente de nuevo en unos minutos o llámenos directamente para agendar.`
  }

  if (lower.includes('urgencia') || lower.includes('emergencia') || lower.includes('dolor')) {
    return `Entendemos su urgencia. Si es una emergencia dental, por favor acuda directamente a ${name} o llámenos por teléfono para atención inmediata.`
  }

  return `Gracias por contactar a ${name}. Estoy teniendo dificultades técnicas temporales. Un miembro de nuestro equipo le atenderá pronto. Si es urgente, por favor llámenos directamente.`
}

// Export helpers for use by other modules
export { routeToAgent, agentLabels, agentToCurrentAgent, buildSystemPrompt }
export type { AgentName }
