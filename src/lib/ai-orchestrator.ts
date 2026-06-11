// ─── AI Orchestrator — Context-aware multi-agent AI for Sinap ──────────
// Shared module that provides rich, clinic-specific AI responses
// with conversation history, business context, and TOOL CALLING.
// The AI can now check availability and CREATE appointments.

import { db } from '@/lib/db'
import { createZAI, type ChatMessage, type ToolDefinition, type ToolCall, type ChatCompletionResponse } from '@/lib/zai'

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
  services: Array<{ id: string; name: string; price: number; duration: number; category: string | null }>
  doctors: Array<{ id: string; name: string; specialty: string | null; workDays: string; workStart: string; workEnd: string }>
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  text: string
  agent: AgentName
  agentLabel: string
  actions?: Array<{ type: string; data: Record<string, unknown> }>
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
        id: true, name: true, personaName: true, phone: true,
        address: true, city: true, state: true,
      },
    })

    if (!clinic) return null

    const services = await db.service.findMany({
      where: { clinicId, isActive: true },
      select: { id: true, name: true, price: true, duration: true, category: true },
      orderBy: { name: 'asc' },
    })

    const doctors = await db.doctor.findMany({
      where: { clinicId, isActive: true },
      select: { id: true, name: true, specialty: true, workDays: true, workStart: true, workEnd: true },
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
      where: { conversationId, messageType: 'text' },
      select: { direction: true, content: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

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
function buildSystemPrompt(agent: AgentName, context: ClinicContext): string {
  const agentName = context.personaName || context.clinicName

  const servicesList = context.services.length > 0
    ? context.services.map(s => {
        const priceStr = s.price > 0 ? ` - $${s.price.toLocaleString('es-MX')} MXN` : ''
        const durationStr = s.duration > 0 ? ` (${s.duration} min)` : ''
        const categoryStr = s.category ? ` [${s.category}]` : ''
        return `  - ID: ${s.id} | ${s.name}${durationStr}${priceStr}${categoryStr}`
      }).join('\n')
    : '  (No hay servicios registrados aún)'

  const doctorsList = context.doctors.length > 0
    ? context.doctors.map(d => {
        const specialty = d.specialty ? ` — ${d.specialty}` : ''
        const dayMap: Record<string, string> = { '1': 'Lun', '2': 'Mar', '3': 'Mié', '4': 'Jue', '5': 'Vie', '6': 'Sáb', '0': 'Dom' }
        const days = d.workDays.split(',').map(day => dayMap[day.trim()] || day).join(', ')
        return `  - ID: ${d.id} | ${d.name}${specialty} | Horario: ${days} ${d.workStart}-${d.workEnd}`
      }).join('\n')
    : '  (No hay doctores registrados aún)'

  const locationParts = [context.address, context.city, context.state].filter(Boolean)
  const location = locationParts.length > 0 ? locationParts.join(', ') : 'No registrada'

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

SERVICIOS Y PRECIOS (usa el ID para agendar):
${servicesList}

DOCTORES Y HORARIOS (usa el ID para agendar):
${doctorsList}

FECHA ACTUAL: ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`

  const agentRules: Record<AgentName, string> = {
    desk: `
TU TRABAJO PRINCIPAL:
Atender pacientes por WhatsApp con información precisa y real de la clínica. Puedes AGENDAR CITAS usando las herramientas disponibles.

REGLAS:
- Usa la información REAL de la clínica (servicios, precios, doctores, horarios) para responder.
- Cuando un paciente quiera agendar una cita, USA LA HERRAMIENTA check_availability para ver horarios disponibles.
- Cuando el paciente confirme fecha, hora, servicio y doctor, USA LA HERRAMIENTA create_appointment para agendar la cita.
- Siempre confirma los detalles antes de crear la cita: fecha, hora, servicio y doctor.
- Si el paciente no especifica doctor o servicio, sugiere opciones basándote en lo que diga.
- Cuando alguien pregunte por precios, da los precios EXACTOS de la lista.
- Cuando alguien pregunte por servicios, describe los que ofrece la clínica con precios y duración.
- Cuando alguien pregunte por doctores, menciona los disponibles con sus especialidades y horarios.
- Si el paciente saluda, responde con calidez, preséntate como ${agentName} y pregunta en qué puedes ayudar.
- Si alguien pregunta por ubicación, da la dirección real de la clínica.
- Si el paciente tiene una queja o emergencia dental, muestra empatía y sugiere contactar directamente.
- NUNCA diagnostiques ni recetes medicamentos. Solo información y gestión de citas.
- Si detectas urgencia dental (dolor fuerte, sangrado, trauma), escala: ofrece el teléfono o sugiere venir de inmediato.
- NO digas "un miembro de nuestro equipo le atenderá" — TÚ eres quien atiende. Responde con información concreta.
- NO uses respuestas genéricas. Siempre usa la información específica de ESTA clínica.
- Después de agendar una cita, confirma los detalles completos: fecha, hora, doctor, servicio y precio.`,

    flow: `
TU TRABAJO PRINCIPAL: Ayudar con pre-consulta y asesoría clínica preliminar.
REGLAS: Usa información REAL de la clínica. NUNCA des diagnósticos definitivos. Siempre indica que cualquier diagnóstico requiere aprobación del médico. Si el paciente necesita cita, sugiere usar las herramientas de agendado.`,

    bill: `
TU TRABAJO PRINCIPAL: Ayudar con facturación, pagos y CFDI.
REGLAS: Usa información REAL de la clínica y precios de servicios. Para consultas fiscales complejas, sugiere contactar al contador.`,

    grow: `
TU TRABAJO PRINCIPAL: Ayudar con marketing y reactivación de pacientes.
REGLAS: Usa información REAL de la clínica. Las campañas deben ser específicas a los servicios y doctores de la clínica.`,
  }

  return `${basePersonality}\n${agentRules[agent]}`
}

// ─── Tool definitions for function calling ────────────────────
const deskTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Consulta los horarios disponibles de un doctor en una fecha específica. Usa esta herramienta cuando un paciente quiera agendar una cita para ver qué horarios hay disponibles.',
      parameters: {
        type: 'object',
        properties: {
          doctor_id: {
            type: 'string',
            description: 'ID del doctor. Si no se especifica, se consultan todos los doctores disponibles.',
          },
          date: {
            type: 'string',
            description: 'Fecha en formato YYYY-MM-DD (ej. 2026-06-12). Si no se especifica, se usa la fecha de hoy o la siguiente fecha hábil.',
          },
          service_id: {
            type: 'string',
            description: 'ID del servicio para determinar la duración de la cita. Si no se especifica, se usa la duración default (30 min).',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_appointment',
      description: 'Agenda una cita nueva en el calendario de la clínica. Úsalo SOLO cuando el paciente haya confirmado fecha, hora, servicio y doctor. Siempre confirma los detalles con el paciente antes de crear la cita.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Fecha de la cita en formato YYYY-MM-DD (ej. 2026-06-12)',
          },
          start_time: {
            type: 'string',
            description: 'Hora de inicio en formato HH:MM (ej. "10:00", "14:30")',
          },
          doctor_id: {
            type: 'string',
            description: 'ID del doctor que atenderá la cita',
          },
          service_id: {
            type: 'string',
            description: 'ID del servicio/tipo de consulta',
          },
          patient_name: {
            type: 'string',
            description: 'Nombre del paciente (si lo proporcionó)',
          },
          notes: {
            type: 'string',
            description: 'Notas adicionales o motivo de la cita mencionado por el paciente',
          },
        },
        required: ['date', 'start_time', 'doctor_id', 'service_id'],
      },
    },
  },
]

// ─── Tool execution handlers ──────────────────────────────────
async function executeToolCall(
  toolCall: ToolCall,
  context: ClinicContext,
  patientId: string
): Promise<string> {
  const args = JSON.parse(toolCall.function.arguments)

  switch (toolCall.function.name) {
    case 'check_availability':
      return await handleCheckAvailability(args, context)
    case 'create_appointment':
      return await handleCreateAppointment(args, context, patientId)
    default:
      return JSON.stringify({ error: `Herramienta desconocida: ${toolCall.function.name}` })
  }
}

/**
 * Check available time slots for a doctor on a given date.
 * Returns slots that don't conflict with existing appointments.
 */
async function handleCheckAvailability(
  args: { doctor_id?: string; date?: string; service_id?: string },
  context: ClinicContext
): Promise<string> {
  if (!db) return JSON.stringify({ error: 'Base de datos no disponible' })

  try {
    // Determine the date to check
    let checkDate: Date
    if (args.date) {
      checkDate = new Date(args.date + 'T12:00:00')
    } else {
      checkDate = new Date()
      // If it's after 6pm, check tomorrow
      if (checkDate.getHours() >= 18) {
        checkDate.setDate(checkDate.getDate() + 1)
      }
    }

    const dayOfWeek = checkDate.getDay() // 0=Sun, 1=Mon, ...

    // Determine which doctors to check
    let doctorsToCheck = context.doctors
    if (args.doctor_id) {
      doctorsToCheck = context.doctors.filter(d => d.id === args.doctor_id)
      if (doctorsToCheck.length === 0) {
        return JSON.stringify({ error: 'Doctor no encontrado', available_doctors: context.doctors.map(d => ({ id: d.id, name: d.name })) })
      }
    }

    // Determine service duration
    let slotDuration = 30 // default
    if (args.service_id) {
      const service = context.services.find(s => s.id === args.service_id)
      if (service) {
        slotDuration = service.duration
      }
    }

    const dateStr = checkDate.toISOString().split('T')[0]
    const result: Array<{
      doctor_id: string
      doctor_name: string
      available_slots: Array<{ start: string; end: string }>
    }> = []

    for (const doctor of doctorsToCheck) {
      // Check if doctor works on this day
      const workDays = doctor.workDays.split(',').map(d => d.trim())
      if (!workDays.includes(String(dayOfWeek))) {
        result.push({
          doctor_id: doctor.id,
          doctor_name: doctor.name,
          available_slots: [],
        })
        continue
      }

      // Get existing appointments for this doctor on this date
      const existingAppointments = await db.appointment.findMany({
        where: {
          doctorId: doctor.id,
          date: checkDate,
          status: { in: ['scheduled', 'confirmed', 'in_progress'] },
        },
        select: { startTime: true, endTime: true },
        orderBy: { startTime: 'asc' },
      })

      // Generate available slots
      const slots: Array<{ start: string; end: string }> = []
      const workStart = doctor.workStart // e.g., "08:00"
      const workEnd = doctor.workEnd     // e.g., "18:00"

      let currentMinutes = timeToMinutes(workStart)
      const endMinutes = timeToMinutes(workEnd)

      while (currentMinutes + slotDuration <= endMinutes) {
        const slotStart = minutesToTime(currentMinutes)
        const slotEnd = minutesToTime(currentMinutes + slotDuration)

        // Check if this slot conflicts with any existing appointment
        const hasConflict = existingAppointments.some(apt => {
          const aptStart = timeToMinutes(apt.startTime)
          const aptEnd = timeToMinutes(apt.endTime)
          return currentMinutes < aptEnd && (currentMinutes + slotDuration) > aptStart
        })

        if (!hasConflict) {
          slots.push({ start: slotStart, end: slotEnd })
        }

        currentMinutes += slotDuration
      }

      result.push({
        doctor_id: doctor.id,
        doctor_name: doctor.name,
        available_slots: slots,
      })
    }

    const totalSlots = result.reduce((sum, r) => sum + r.available_slots.length, 0)

    console.log(`[AI Orchestrator] check_availability: date=${dateStr}, doctors=${doctorsToCheck.length}, total_slots=${totalSlots}`)

    return JSON.stringify({
      date: dateStr,
      day_name: checkDate.toLocaleDateString('es-MX', { weekday: 'long' }),
      slot_duration: slotDuration,
      doctors: result,
      total_available_slots: totalSlots,
    })
  } catch (error) {
    console.error('[AI Orchestrator] check_availability error:', error)
    return JSON.stringify({ error: 'Error al consultar disponibilidad' })
  }
}

/**
 * Create a new appointment in the database.
 */
async function handleCreateAppointment(
  args: {
    date: string
    start_time: string
    doctor_id: string
    service_id: string
    patient_name?: string
    notes?: string
  },
  context: ClinicContext,
  patientId: string
): Promise<string> {
  if (!db) return JSON.stringify({ error: 'Base de datos no disponible' })

  try {
    // Validate doctor belongs to this clinic
    const doctor = context.doctors.find(d => d.id === args.doctor_id)
    if (!doctor) {
      return JSON.stringify({ error: 'Doctor no encontrado en esta clínica' })
    }

    // Validate service belongs to this clinic
    const service = context.services.find(s => s.id === args.service_id)
    if (!service) {
      return JSON.stringify({ error: 'Servicio no encontrado en esta clínica', available_services: context.services.map(s => ({ id: s.id, name: s.name })) })
    }

    const appointmentDate = new Date(args.date + 'T12:00:00')
    const endTime = minutesToTime(timeToMinutes(args.start_time) + service.duration)

    // Check for conflicts
    const conflicting = await db.appointment.findFirst({
      where: {
        doctorId: args.doctor_id,
        date: appointmentDate,
        status: { in: ['scheduled', 'confirmed', 'in_progress'] },
        startTime: { lt: endTime },
        endTime: { gt: args.start_time },
      },
    })

    if (conflicting) {
      return JSON.stringify({
        error: 'Conflicto de horario',
        message: `Ya hay una cita agendada para el Dr. ${doctor.name} a las ${args.start_time}. Por favor elige otro horario.`,
        suggestion: 'Usa check_availability para ver horarios disponibles.',
      })
    }

    // Create the appointment
    const appointment = await db.appointment.create({
      data: {
        clinicId: context.clinicId,
        patientId,
        doctorId: args.doctor_id,
        serviceId: args.service_id,
        date: appointmentDate,
        startTime: args.start_time,
        endTime,
        status: 'scheduled',
        channel: 'whatsapp',
        notes: args.notes || null,
      },
    })

    const dateFormatted = appointmentDate.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    console.log(`[AI Orchestrator] Cita creada: ${appointment.id} | ${dateFormatted} | ${args.start_time}-${endTime} | Dr. ${doctor.name} | ${service.name}`)

    return JSON.stringify({
      success: true,
      appointment_id: appointment.id,
      date: args.date,
      date_formatted: dateFormatted,
      start_time: args.start_time,
      end_time: endTime,
      doctor_name: doctor.name,
      service_name: service.name,
      service_price: service.price,
      duration: service.duration,
      status: appointment.status,
    })
  } catch (error) {
    console.error('[AI Orchestrator] create_appointment error:', error)
    return JSON.stringify({ error: 'Error al crear la cita. Intenta de nuevo.' })
  }
}

// ─── Time utility functions ──────────────────────────────────
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

// ─── Generate AI response with full context + tool calling ────
export async function generateContextualResponse(
  message: string,
  clinicId: string,
  conversationId: string,
  patientId?: string,
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

    // 2. Route to agent
    const agent = options?.targetAgent || routeToAgent(message)
    const systemPrompt = buildSystemPrompt(agent, context)

    // 3. Load conversation history
    const history = await loadConversationHistory(conversationId, 15)

    // 4. Build messages array
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: message },
    ]

    // 5. Determine which tools to use (only desk agent gets appointment tools)
    const tools = agent === 'desk' ? deskTools : undefined

    console.log(`[AI Orchestrator] Agent: ${agent} | History: ${history.length} msgs | Tools: ${tools?.length || 0}`)

    // 6. Call the LLM with tool support
    const zai = await createZAI()

    const completion: ChatCompletionResponse = await zai.chat.completions.create({
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 800,
      tools,
    })

    const choice = completion.choices?.[0]
    if (!choice) {
      console.warn('[AI Orchestrator] No response from LLM')
      return null
    }

    // 7. Handle tool calls if present
    const actions: Array<{ type: string; data: Record<string, unknown> }> = []
    let finalText = choice.message?.content || ''

    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      console.log(`[AI Orchestrator] Tool calls: ${choice.message.tool_calls.map(tc => tc.function.name).join(', ')}`)

      // Add assistant message with tool calls to conversation
      messages.push({
        role: 'assistant',
        content: choice.message.content,
        tool_calls: choice.message.tool_calls,
      })

      // Execute each tool call
      for (const toolCall of choice.message.tool_calls) {
        const toolResult = await executeToolCall(
          toolCall,
          context,
          patientId || 'unknown'
        )

        console.log(`[AI Orchestrator] Tool ${toolCall.function.name} result: ${toolResult.substring(0, 150)}`)

        // Add tool result to conversation
        messages.push({
          role: 'tool',
          content: toolResult,
          tool_call_id: toolCall.id,
        })

        // Track actions for the response
        try {
          const parsed = JSON.parse(toolResult)
          if (parsed.success) {
            actions.push({ type: toolCall.function.name, data: parsed })
          }
        } catch {
          // Tool result isn't JSON or doesn't have success flag
        }
      }

      // 8. Call LLM again with tool results so it can generate a natural response
      const secondCompletion: ChatCompletionResponse = await zai.chat.completions.create({
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 800,
        tools,
      })

      finalText = secondCompletion.choices?.[0]?.message?.content || finalText
    }

    if (!finalText) {
      console.warn('[AI Orchestrator] LLM returned empty final response')
      return null
    }

    // 9. Update conversation's current agent
    if (db) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { currentAgent: agentToCurrentAgent[agent] || 'reception' },
      }).catch(() => {})
    }

    console.log(`[AI Orchestrator] Final response (${finalText.length} chars, ${actions.length} actions): "${finalText.substring(0, 100)}"`)

    return {
      text: finalText,
      agent,
      agentLabel: agentLabels[agent],
      actions: actions.length > 0 ? actions : undefined,
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

// Export helpers
export { routeToAgent, agentLabels, agentToCurrentAgent }
export type { AgentName }
