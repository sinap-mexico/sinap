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
  specialty: string // "odontología" | "podología" | "medicina general" | etc.
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  services: Array<{ id: string; name: string; price: number; duration: number; category: string | null }>
  doctors: Array<{ id: string; name: string; specialty: string | null; workDays: string; workStart: string; workEnd: string }>
}

export interface PatientInfo {
  id: string
  fullName: string
  phone: string | null
  isKnown: boolean // true if patient has a real name (not "Paciente 1234")
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

    // Infer clinic specialty from doctor specialties or service categories
    let specialty = 'salud' // default
    const allSpecialties = doctors.map(d => d.specialty).filter(Boolean).map(s => s!.toLowerCase())
    if (allSpecialties.some(s => s.includes('odont') || s.includes('dental') || s.includes('dent'))) {
      specialty = 'odontología'
    } else if (allSpecialties.some(s => s.includes('podol'))) {
      specialty = 'podología'
    } else if (allSpecialties.some(s => s.includes('medi'))) {
      specialty = 'medicina general'
    } else if (allSpecialties.some(s => s.includes('derm'))) {
      specialty = 'dermatología'
    } else if (services.some(s => s.name.toLowerCase().includes('dental') || s.name.toLowerCase().includes('odont'))) {
      specialty = 'odontología'
    } else if (services.some(s => s.name.toLowerCase().includes('podol'))) {
      specialty = 'podología'
    } else if (clinic.name.toLowerCase().includes('podol')) {
      specialty = 'podología'
    } else if (clinic.name.toLowerCase().includes('odont') || clinic.name.toLowerCase().includes('dental')) {
      specialty = 'odontología'
    }

    return {
      clinicId: clinic.id,
      clinicName: clinic.name,
      personaName: clinic.personaName || clinic.name,
      specialty,
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

// ─── Load patient info ─────────────────────────────────────────
export async function loadPatientInfo(patientId: string): Promise<PatientInfo | null> {
  if (!db || !patientId || patientId === 'unknown') return null

  try {
    const patient = await db.patient.findUnique({
      where: { id: patientId },
      select: { id: true, fullName: true, phone: true },
    })

    if (!patient) return null

    // Check if patient has a real name (not generic "Paciente XXXX")
    const isKnown = patient.fullName !== 'Paciente' && !patient.fullName.startsWith('Paciente ')

    return {
      id: patient.id,
      fullName: patient.fullName,
      phone: patient.phone,
      isKnown,
    }
  } catch (error) {
    console.error('[AI Orchestrator] Error loading patient info:', error)
    return null
  }
}

// ─── Build context-rich system prompt ─────────────────────────
function buildSystemPrompt(agent: AgentName, context: ClinicContext, patientInfo?: PatientInfo | null): string {
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
Eres una clínica de ${context.specialty} en México.
Tu tono es cálido, profesional y NATURAL — como la chica de recepción que todos quieren.
Hablas en español mexicano, de manera cercana pero profesional.
NO suenes como un bot. NO listes información en exceso. Sé breve y conversacional.

═══════════════════════════════════════════
LÍMITES DE CONTEXTO — OBLIGATORIO:
═══════════════════════════════════════════
Eres el RECEPCIONISTA de ${context.clinicName}. SOLO puedes hablar de temas relacionados con la clínica de ${context.specialty}:
- Agendar, confirmar, cancelar o reagendar citas
- Información de servicios, precios, doctores y horarios
- Ubicación y datos de contacto de la clínica
- Pre-consulta y preguntas generales sobre los servicios
- Facturación y pagos de la clínica

🚫 NUNCA respondas temas fuera de contexto. Si el paciente pregunta sobre:
- Programación, código, matemáticas, tareas, recetas de cocina, etc.
- Cualquier tema que NO sea sobre la clínica dental
→ Responde: "Disculpa, solo puedo ayudarte con temas de nuestra clínica de ${context.specialty}. ¿Necesitas agendar una cita o tienes alguna duda sobre nuestros servicios?"

🚫 NUNCA generes código, programas, scripts, ni nada técnico.
🚫 NUNCA actúes como asistente general. Eres EXCLUSIVAMENTE recepcionista de esta clínica.

INFORMACIÓN DE LA CLÍNICA:
- Nombre: ${context.clinicName}
- Teléfono: ${context.phone || 'No disponible'}
- Ubicación: ${location}

SERVICIOS Y PRECIOS (usa el ID para agendar):
${servicesList}

DOCTORES Y HORARIOS (usa el ID para agendar):
${doctorsList}

FECHA ACTUAL: ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

PACIENTE ACTUAL:
${patientInfo?.isKnown
    ? `- Nombre: ${patientInfo.fullName} (paciente REGISTRADO — ya lo conoces, NO preguntes su nombre de nuevo, solo confírmalo al agendar: "¿La cita queda a tu nombre, ${patientInfo.fullName}?")`
    : patientInfo
      ? `- Teléfono: ${patientInfo.phone || 'No disponible'} (paciente NUEVO — no sabemos su nombre, pregunta "¿A nombre de quién agendo?" JUSTO ANTES de crear la cita)`
      : '- (Sin información del paciente — pregunta el nombre al momento de agendar)'
}`

  const agentRules: Record<AgentName, string> = {
    desk: `
TU TRABAJO PRINCIPAL:
Atender pacientes por WhatsApp. Puedes AGENDAR CITAS usando las herramientas disponibles.

═══════════════════════════════════════════
REGLAS CRÍTICAS — INFRACCIÓN = FALLA TOTAL:
═══════════════════════════════════════════

🚫 NUNCA digas que una cita quedó agendada/confirmada/reservada sin haber llamado la herramienta create_appointment Y haber recibido {"success": true}.
   - Si NO llamaste create_appointment, la cita NO existe. Decir que sí es MENTIRA y daña la confianza del paciente.
   - Si el tool devuelve error, informa al paciente y ofrece alternativas.

🚫 NUNCA agendes una cita sin saber el NOMBRE del paciente. Es obligatorio para create_appointment.
   - Si es un PACIENTE NUEVO (no tiene nombre real en el contexto), pregunta "¿A nombre de quién agenda?" JUSTO ANTES de crear la cita, cuando ya tengas fecha, hora y doctor.
   - NO preguntes el nombre al inicio de la conversación. Espera hasta que sea momento de agendar.
   - Si es un PACIENTE REGRESA (ya tiene nombre real en el contexto), CONFIRMA: "¿La cita queda a tu nombre, [nombre]?"

🚫 NUNCA listes todos los horarios disponibles como un menú robot. Eso suena a máquina, no a recepcionista.
   - Cuando uses check_availability, NO repitas la lista completa de slots al paciente.
   - En su lugar, resume: "Tenemos disponibilidad por la mañana y tarde" o "Hay espacio a las 11:00 y 3:00 pm".
   - Máximo menciona 2-3 horarios sugeridos. No más.

🚫 NUNCA escribas texto como <function=...> o ```json en tus respuestas. Las herramientas se invocan internamente, NO como texto visible.

═══════════════════════════════════════════
FLUJO DE AGENDADO (SIGUE ESTE ORDEN):
═══════════════════════════════════════════

1. Paciente quiere cita → USA check_availability para verificar disponibilidad.
2. Pregunta al paciente: "¿Qué horario te queda mejor y con cuál doctor?"
   - NO listes todos los slots. Solo pregunta naturalmente.
   - Si el paciente ya dijo fecha/hora/doctor, ve al paso 3.
3. Cuando tengas fecha, hora, doctor Y servicio → Pregunta o confirma el NOMBRE del paciente:
   - Si es paciente nuevo: "¿A nombre de quién agendo la cita?"
   - Si ya sabes su nombre: "¿La cita queda a tu nombre, [nombre]?"
4. USA create_appointment con todos los datos incluyendo patient_name.
5. Si create_appointment devuelve success → Confirma los detalles al paciente.
6. Si devuelve error → Ofrece alternativas y vuelve al paso 2.

═══════════════════════════════════════════
REGLAS DE COMUNICACIÓN:
═══════════════════════════════════════════

- Sé BREVE. 2-4 oraciones máximo por mensaje. No escribas párrafos largos.
- Suena HUMANO, no como un bot. Usa lenguaje natural y conversacional.
- Si el paciente saluda, saluda con calidez, preséntate como ${agentName} y pregunta en qué puedes ayudar. Máximo 2 líneas.
- Si preguntan precios, da los EXACTOS de la lista, sin rodeos.
- Si preguntan por servicios, menciona 2-3 relevantes, no todos.
- Si preguntan por doctores, menciona los disponibles brevemente.
- Si alguien pregunta por ubicación, da la dirección.
- Si detectas urgencia dental (dolor fuerte, sangrado, trauma), muestra empatía y sugiere contactar de inmediato.
- NO digas "un miembro de nuestro equipo le atenderá" — TÚ atiendes.
- NO diagnostiques ni recetes. Solo info y gestión de citas.
- NO repitas la misma información que ya diste en mensajes anteriores.`,

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
            description: 'Nombre completo del paciente. OBLIGATORIO — si no lo tienes, pregúntalo antes de llamar esta herramienta.',
          },
          notes: {
            type: 'string',
            description: 'Notas adicionales o motivo de la cita mencionado por el paciente',
          },
        },
        required: ['date', 'start_time', 'doctor_id', 'service_id', 'patient_name'],
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

    // Build a concise summary instead of returning ALL slots
    // The AI should NOT repeat all slots to the patient — just know what's available
    const conciseResult = result.map(r => {
      if (r.available_slots.length === 0) {
        return {
          doctor_id: r.doctor_id,
          doctor_name: r.doctor_name,
          status: 'no_disponible',
          note: 'No trabaja este día o no hay horarios disponibles',
        }
      }

      const firstSlot = r.available_slots[0]?.start
      const lastSlot = r.available_slots[r.available_slots.length - 1]?.start
      const totalAvailable = r.available_slots.length

      // Pick 2-3 suggested slots: first, one in the middle, and last
      const suggestions: string[] = []
      if (r.available_slots.length <= 3) {
        r.available_slots.forEach(s => suggestions.push(s.start))
      } else {
        suggestions.push(r.available_slots[0].start)
        const mid = Math.floor(r.available_slots.length / 2)
        suggestions.push(r.available_slots[mid].start)
        suggestions.push(r.available_slots[r.available_slots.length - 1].start)
      }

      return {
        doctor_id: r.doctor_id,
        doctor_name: r.doctor_name,
        status: 'disponible',
        rango_horario: `${firstSlot} a ${lastSlot}`,
        total_slots_disponibles: totalAvailable,
        sugerencias: suggestions,
        // Full slot list available if AI needs to confirm a specific time
        todos_los_slots: r.available_slots.map(s => s.start),
      }
    })

    return JSON.stringify({
      date: dateStr,
      day_name: checkDate.toLocaleDateString('es-MX', { weekday: 'long' }),
      slot_duration: slotDuration,
      doctors: conciseResult,
      total_available_slots: totalSlots,
      instrucciones_para_ia: 'NO listes todos los horarios al paciente. Usa las sugerencias (2-3 horarios) o di que hay disponibilidad en cierto rango. Pregunta qué hora le queda mejor.',
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

    // Update patient name if provided and current name is generic
    if (args.patient_name && patientId !== 'unknown') {
      try {
        const currentPatient = await db.patient.findUnique({
          where: { id: patientId },
          select: { firstName: true, fullName: true },
        })

        if (currentPatient && (currentPatient.firstName === 'Paciente' || currentPatient.fullName.startsWith('Paciente '))) {
          const nameParts = args.patient_name.trim().split(/\s+/)
          const firstName = nameParts[0] || 'Paciente'
          const lastName = nameParts.slice(1).join(' ') || ''
          const fullName = args.patient_name.trim()

          await db.patient.update({
            where: { id: patientId },
            data: { firstName, lastName, fullName },
          })

          console.log(`[AI Orchestrator] Patient name updated: ${patientId} → ${fullName}`)
        }
      } catch (nameUpdateError) {
        console.warn('[AI Orchestrator] Could not update patient name:', nameUpdateError)
        // Non-critical — continue with appointment creation
      }
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

    const patientDisplayName = args.patient_name || 'Paciente'

    console.log(`[AI Orchestrator] Cita creada: ${appointment.id} | ${dateFormatted} | ${args.start_time}-${endTime} | Dr. ${doctor.name} | ${service.name} | Paciente: ${patientDisplayName}`)

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
      patient_name: patientDisplayName,
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

// ─── Clean AI response — strip leaked function calls ──────────────
function cleanAIResponse(text: string): string {
  // Strip patterns like <function=check_availability>{"date":"..."}</function>
  let cleaned = text.replace(/<function=[^>]*>[\s\S]*?<\/function>/gi, '')
  // Also strip unclosed <function=...> patterns with JSON following
  cleaned = cleaned.replace(/<function=[^>]*>\s*\{[^}]*\}/gi, '')
  // Strip any remaining <function=...> tags
  cleaned = cleaned.replace(/<function=[^>]*>/gi, '')
  // Strip ```json ... ``` blocks that might leak
  cleaned = cleaned.replace(/```json[\s\S]*?```/gi, '')
  // Strip ```...``` blocks (short form)
  cleaned = cleaned.replace(/```[\s\S]*?```/gi, '')
  // Clean up extra whitespace left behind
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim()
  return cleaned
}

// ─── Extract text-based function calls from LLM output ──────────
// Llama 3.3 sometimes generates <function=name>{"arg":"val"}</function> as text
// instead of using structured tool_calls. This function parses them.
function extractTextToolCalls(text: string): Array<{ name: string; arguments: string }> {
  const results: Array<{ name: string; arguments: string }> = []

  // Match patterns like: <function=check_availability>{"date":"2026-06-12"}</function>
  // Or: <function=check_availability>{"date":"2026-06-12"}
  const regex = /<function=(\w+)>([\s\S]*?)(?:<\/function>|$)/gi
  let match

  while ((match = regex.exec(text)) !== null) {
    const name = match[1]
    const argsText = match[2].trim()

    // Validate it's a known tool
    if (name === 'check_availability' || name === 'create_appointment') {
      try {
        // Try to parse the arguments as JSON
        const parsed = JSON.parse(argsText)
        results.push({ name, arguments: JSON.stringify(parsed) })
      } catch {
        // If JSON parse fails, try wrapping in an object
        console.warn(`[AI Orchestrator] Could not parse text tool call args: ${argsText.substring(0, 100)}`)
      }
    }
  }

  return results
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

    // 2. Route to agent + load patient info
    const agent = options?.targetAgent || routeToAgent(message)
    const patientInfo = await loadPatientInfo(patientId || '')
    const systemPrompt = buildSystemPrompt(agent, context, patientInfo)

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

    // 7. Handle tool calls if present (structured format from OpenAI-compatible APIs)
    const actions: Array<{ type: string; data: Record<string, unknown> }> = []
    let finalText = choice.message?.content || ''
    let hasStructuredToolCalls = false

    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      hasStructuredToolCalls = true
      console.log(`[AI Orchestrator] Structured tool calls: ${choice.message.tool_calls.map(tc => tc.function.name).join(', ')}`)

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

    // 8b. Handle text-based function calls (Llama sometimes generates these instead of structured tool_calls)
    if (!hasStructuredToolCalls && finalText.includes('<function=')) {
      const textToolCalls = extractTextToolCalls(finalText)
      if (textToolCalls.length > 0) {
        console.log(`[AI Orchestrator] Text-based tool calls detected: ${textToolCalls.map(tc => tc.name).join(', ')}`)

        // Add assistant message to conversation
        messages.push({
          role: 'assistant',
          content: finalText,
        })

        // Execute each text-based tool call
        for (const tc of textToolCalls) {
          const toolCall: ToolCall = {
            id: `txt_tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type: 'function',
            function: { name: tc.name, arguments: tc.arguments },
          }

          const toolResult = await executeToolCall(toolCall, context, patientId || 'unknown')
          console.log(`[AI Orchestrator] Text tool ${tc.name} result: ${toolResult.substring(0, 150)}`)

          messages.push({
            role: 'tool',
            content: toolResult,
            tool_call_id: toolCall.id,
          })

          try {
            const parsed = JSON.parse(toolResult)
            if (parsed.success) {
              actions.push({ type: tc.name, data: parsed })
            }
          } catch {}
        }

        // Generate a clean response based on tool results
        const cleanCompletion: ChatCompletionResponse = await zai.chat.completions.create({
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 800,
        })

        finalText = cleanCompletion.choices?.[0]?.message?.content || ''
      }
    }

    if (!finalText) {
      console.warn('[AI Orchestrator] LLM returned empty final response')
      return null
    }

    // 9. Clean up the response — strip any leaked function call text
    // Sometimes Llama 3.3 generates <function=...>{...}</function> as text instead of structured tool_calls
    finalText = cleanAIResponse(finalText)

    if (!finalText.trim()) {
      console.warn('[AI Orchestrator] Response was empty after cleaning')
      return null
    }

    // 10. Update conversation's current agent
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
