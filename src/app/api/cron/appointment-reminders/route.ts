// ─── Cron Job: Appointment Reminders (24h before) ──────────────
// Runs every hour via Vercel Cron Jobs.
// Finds appointments ~24 hours from now that haven't had a reminder sent,
// and sends a WhatsApp reminder message to the patient.
//
// SEND STRATEGY:
//   1. If patient has messaged in the last 24h → send free-form text (within conversation window)
//   2. If no recent conversation → try WhatsApp template message (requires approved template)
//   3. If template not available → try free-form text as last resort (may fail if Meta requires template)
//
// Security: Requires CRON_SECRET authorization header (Vercel injects this).
// Feature flag: desk-reminders (must be "on" for the clinic)

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MetaClient, getClinicMetaConfig, getClinicMetaConnection } from '@/lib/meta-client'

const CRON_SECRET = process.env.CRON_SECRET

// ─── Default timezone for Mexican clinics ───────────────────────
const DEFAULT_TIMEZONE = 'America/Hermosillo' // UTC-7 (Sonora, no DST)

// ─── Template configuration ─────────────────────────────────────
const REMINDER_TEMPLATE_NAME = 'appointment_reminder'
const REMINDER_TEMPLATE_LANGUAGE = 'es_MX'

// ─── Convert local time + date to UTC ─────────────────────────
function localTimeToUTC(dateFromDB: Date, hours: number, minutes: number, timezone: string): Date {
  const localDateStr = dateFromDB.toLocaleDateString('en-CA', { timeZone: timezone })
  const [localYear, localMonth, localDay] = localDateStr.split('-').map(Number)

  const localISO = `${localYear}-${String(localMonth).padStart(2, '0')}-${String(localDay).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`

  const tempDate = new Date(localISO + 'Z')
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(tempDate)
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0'
  const tzHour = parseInt(getPart('hour'))
  const tzMinute = parseInt(getPart('minute'))

  const utcHour = tempDate.getUTCHours()
  const utcMinute = tempDate.getUTCMinutes()
  const offsetMinutes = (utcHour * 60 + utcMinute) - (tzHour * 60 + tzMinute)

  const realUTC = new Date(tempDate.getTime() - offsetMinutes * 60 * 1000)
  return realUTC
}

// ─── Normalize Mexican phone numbers for WhatsApp API ──────────
function normalizePhoneForWhatsApp(phone: string): string {
  if (/^521\d{10}$/.test(phone)) {
    return phone.replace(/^521/, '52')
  }
  return phone
}

// ─── Format date in Spanish (Mexico) ───────────────────────────
function formatDateSpanish(date: Date): string {
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Format time to 12h AM/PM in Spanish ───────────────────────
function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  if (h === 0) return `12:${m.toString().padStart(2, '0')} am`
  if (h === 12) return `12:${m.toString().padStart(2, '0')} pm`
  if (h > 12) return `${h - 12}:${m.toString().padStart(2, '0')} pm`
  return `${h}:${m.toString().padStart(2, '0')} am`
}

// ─── Build free-form reminder message ──────────────────────────
function buildReminderMessage(data: {
  patientName: string
  personaName: string
  dateFormatted: string
  startTime12h: string
  doctorName: string
  serviceName: string
  clinicPhone: string | null
}): string {
  const parts = [
    `Hola ${data.patientName}! Te recordamos que tienes cita mañana:`,
    ``,
    `Fecha: ${data.dateFormatted}`,
    `Hora: ${data.startTime12h}`,
    `Doctor: ${data.doctorName}`,
    `Servicio: ${data.serviceName}`,
    ``,
  ]

  if (data.clinicPhone) {
    parts.push(`Si necesitas cancelar o reagendar, responde a este mensaje o llámanos al ${data.clinicPhone}.`)
  } else {
    parts.push(`Si necesitas cancelar o reagendar, simplemente responde a este mensaje.`)
  }

  parts.push(`Te esperamos! - ${data.personaName}`)

  return parts.join('\n')
}

// ─── Build template components for WhatsApp template ────────────
// Template body: "Hola {{1}}, te recordamos que tienes cita programada para mañana.\n\nFecha: {{2}}\nHora: {{3}}\nDoctor: {{4}}\nServicio: {{5}}\n\nPara cancelar o reagendar, responde a este mensaje o llama al {{6}}.\n\nSaludos del equipo de {{7}}."
function buildTemplateComponents(data: {
  patientName: string
  dateFormatted: string
  startTime12h: string
  doctorName: string
  serviceName: string
  clinicPhone: string
  personaName: string
}): Array<{ type: string; sub_type?: string; parameters: Array<{ type: string; text: string }> }> {
  return [
    {
      type: 'body',
      sub_type: 'cursor',
      parameters: [
        { type: 'text', text: data.patientName },          // {{1}}
        { type: 'text', text: data.dateFormatted },        // {{2}}
        { type: 'text', text: data.startTime12h },         // {{3}}
        { type: 'text', text: data.doctorName },           // {{4}}
        { type: 'text', text: data.serviceName },          // {{5}}
        { type: 'text', text: data.clinicPhone },          // {{6}}
        { type: 'text', text: data.personaName },          // {{7}}
      ],
    },
  ]
}

// ─── Cache for clinic-level data (avoid repeated queries) ──────
interface ClinicCache {
  name: string
  personaName: string
  phone: string | null
  remindersEnabled: boolean
  hasWhatsApp: boolean
  metaClient: MetaClient
  templateAvailable: boolean
}

// ─── Check if patient has a recent WhatsApp message (within 24h) ──
async function hasRecentPatientMessage(clinicId: string, patientId: string): Promise<boolean> {
  if (!db) return false

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const recentMessage = await db.message.findFirst({
    where: {
      clinicId,
      patientId,
      channel: 'whatsapp',
      direction: 'inbound',
      createdAt: { gte: twentyFourHoursAgo },
    },
    select: { id: true },
  })

  return !!recentMessage
}

// ─── Fetch approved templates from Meta API ─────────────────────
async function fetchApprovedTemplates(metaClient: MetaClient): Promise<string[]> {
  try {
    // We can't use the MetaClient directly for this, but we can use the config
    const wabaId = metaClient['config']?.wabaId
    const accessToken = metaClient['config']?.accessToken
    if (!wabaId || !accessToken) return []

    const url = `https://graph.facebook.com/v21.0/${wabaId}/message_templates?status=APPROVED&access_token=${encodeURIComponent(accessToken)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })

    if (!res.ok) return []

    const data = await res.json()
    const templateNames: string[] = (data.data || [])
      .filter((t: Record<string, unknown>) => (t.status as string) === 'APPROVED')
      .map((t: Record<string, unknown>) => t.name as string)

    return templateNames
  } catch {
    return []
  }
}

// ─── Send reminder via best available method ───────────────────
type SendResult = {
  success: boolean
  method: 'free_text' | 'template' | 'failed'
  messageId?: string
  whatsappId?: string
  error?: string
  metaApiResponse?: string
}

async function sendReminder(
  metaClient: MetaClient,
  phone: string,
  templateAvailable: boolean,
  hasRecentConversation: boolean,
  messageData: {
    patientName: string
    personaName: string
    dateFormatted: string
    startTime12h: string
    doctorName: string
    serviceName: string
    clinicPhone: string | null
  }
): Promise<SendResult> {
  const normalizedPhone = normalizePhoneForWhatsApp(phone)
  const freeText = buildReminderMessage(messageData)

  // STRATEGY 1: If patient has recent conversation (within 24h), send free-form text
  // This always works — no template needed within the 24h conversation window
  if (hasRecentConversation) {
    try {
      const result = await metaClient.sendTextMessage(normalizedPhone, freeText)
      console.log(`[Cron/Reminders] Sent via free-text (24h window open) to ${normalizedPhone}`)
      return {
        success: true,
        method: 'free_text',
        messageId: result.messageId,
        whatsappId: result.whatsappId,
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error(`[Cron/Reminders] Free-text failed even with 24h window: ${errorMsg}`)
      return { success: false, method: 'failed', error: errorMsg }
    }
  }

  // STRATEGY 2: No recent conversation — try template message first
  if (templateAvailable) {
    try {
      const templateComponents = buildTemplateComponents({
        patientName: messageData.patientName,
        dateFormatted: messageData.dateFormatted,
        startTime12h: messageData.startTime12h,
        doctorName: messageData.doctorName,
        serviceName: messageData.serviceName,
        clinicPhone: messageData.clinicPhone || 'N/A',
        personaName: messageData.personaName,
      })

      const result = await metaClient.sendTemplateMessage(
        normalizedPhone,
        REMINDER_TEMPLATE_NAME,
        REMINDER_TEMPLATE_LANGUAGE,
        templateComponents
      )
      console.log(`[Cron/Reminders] Sent via template to ${normalizedPhone}`)
      return {
        success: true,
        method: 'template',
        messageId: result.messageId,
        whatsappId: result.whatsappId,
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.warn(`[Cron/Reminders] Template send failed, falling back to free-text: ${errorMsg}`)
      // Fall through to Strategy 3
    }
  }

  // STRATEGY 3: Last resort — try free-form text even without 24h window
  // This MAY work for test accounts or if Meta's restrictions are relaxed
  try {
    const result = await metaClient.sendTextMessage(normalizedPhone, freeText)
    console.log(`[Cron/Reminders] Sent via free-text (no 24h window, last resort) to ${normalizedPhone}`)
    return {
      success: true,
      method: 'free_text',
      messageId: result.messageId,
      whatsappId: result.whatsappId,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[Cron/Reminders] All send methods failed for ${normalizedPhone}: ${errorMsg}`)
    return {
      success: false,
      method: 'failed',
      error: errorMsg,
    }
  }
}

// ─── GET handler (Vercel Cron calls GET) ───────────────────────
export async function GET(req: NextRequest) {
  // Security: Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('[Cron/Reminders] Unauthorized — invalid or missing CRON_SECRET')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[Cron/Reminders] Starting appointment reminder job...')

  if (!db) {
    console.error('[Cron/Reminders] Database not available')
    return NextResponse.json({ error: 'DB unavailable' }, { status: 500 })
  }

  try {
    const now = new Date()
    const url = new URL(req.url)
    const testMode = url.searchParams.get('test') === 'true'
    const forceMode = url.searchParams.get('force') === 'true'
    const targetClinicId = url.searchParams.get('clinicId')

    // Calculate the reminder window:
    // In test/force mode: use a VERY wide window (past 48h to future 72h) to catch any appointment
    // In normal mode: 4h to 30h from now
    const windowStart = (testMode || forceMode)
      ? new Date(now.getTime() - 48 * 60 * 60 * 1000)  // 48h ago
      : new Date(now.getTime() + 4 * 60 * 60 * 1000)   // 4h from now
    const windowEnd = (testMode || forceMode)
      ? new Date(now.getTime() + 72 * 60 * 60 * 1000)  // 72h from now
      : new Date(now.getTime() + 30 * 60 * 60 * 1000)  // 30h from now

    // For the date query: find appointments for today through 3 days out
    const todayDate = new Date(now)
    todayDate.setHours(0, 0, 0, 0)

    const dayAfterTomorrow = new Date(todayDate)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 3)

    // Build where clause
    const whereClause: Record<string, unknown> = {
      status: { in: ['scheduled', 'confirmed'] },
      date: {
        gte: todayDate,
        lt: dayAfterTomorrow,
      },
    }

    // In force mode, don't filter by reminder24hSent (allow re-sending)
    if (!forceMode) {
      whereClause.reminder24hSent = false
    }

    // Filter by clinicId if specified
    if (targetClinicId) {
      whereClause.clinicId = targetClinicId
    }

    // Find appointments that match criteria
    const appointments = await db.appointment.findMany({
      where: whereClause,
      select: {
        id: true,
        clinicId: true,
        patientId: true,
        doctorId: true,
        serviceId: true,
        date: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    })

    console.log(`[Cron/Reminders] Found ${appointments.length} candidate appointments for reminders`)

    // Cache clinic-level data to avoid repeated queries
    const clinicCache = new Map<string, ClinicCache>()

    let remindersSent = 0
    let remindersSkipped = 0
    let errors = 0
    const details: Array<{
      appointmentId: string
      patientName?: string
      status: 'sent' | 'skipped' | 'error'
      method?: string
      reason?: string
      error?: string
    }> = []

    for (const appointment of appointments) {
      try {
        // Convert appointment local time → UTC for comparison
        const [hours, minutes] = appointment.startTime.split(':').map(Number)
        const appointmentDateTime = localTimeToUTC(appointment.date, hours, minutes, DEFAULT_TIMEZONE)

        console.log(`[Cron/Reminders] Appt ${appointment.id}: local=${hours}:${minutes} → UTC=${appointmentDateTime.toISOString()}, window=${windowStart.toISOString()}-${windowEnd.toISOString()}`)

        // Check if appointment is within the reminder window (skip in test/force mode)
        if (!testMode && !forceMode && (appointmentDateTime < windowStart || appointmentDateTime > windowEnd)) {
          console.log(`[Cron/Reminders] Appt ${appointment.id} outside window, skipping`)
          continue
        }

        // Get or populate clinic cache
        let clinicData = clinicCache.get(appointment.clinicId)
        if (!clinicData) {
          const clinic = await db.clinic.findUnique({
            where: { id: appointment.clinicId },
            select: { id: true, name: true, personaName: true, phone: true },
          })

          const remindersFlag = await db.featureFlag.findFirst({
            where: { clinicId: appointment.clinicId, module: 'desk', feature: 'reminders' },
            select: { state: true },
          })

          const channelConfig = await getClinicMetaConnection(appointment.clinicId, 'whatsapp')
          const metaConfig = await getClinicMetaConfig(appointment.clinicId)

          const hasWhatsApp = !!(channelConfig || metaConfig)
          let metaClient: MetaClient

          if (channelConfig) {
            metaClient = MetaClient.createForChannel('whatsapp', channelConfig)
          } else if (metaConfig) {
            metaClient = new MetaClient(metaConfig)
          } else {
            metaClient = null as unknown as MetaClient
          }

          // Check if template is available (only check once per clinic)
          let templateAvailable = false
          if (hasWhatsApp) {
            const approvedTemplates = await fetchApprovedTemplates(metaClient)
            templateAvailable = approvedTemplates.includes(REMINDER_TEMPLATE_NAME)
            console.log(`[Cron/Reminders] Clinic ${appointment.clinicId}: ${approvedTemplates.length} approved templates, reminder template available: ${templateAvailable}`)
            if (!templateAvailable && approvedTemplates.length > 0) {
              console.log(`[Cron/Reminders] Available templates: ${approvedTemplates.join(', ')}`)
            }
          }

          clinicData = {
            name: clinic?.name || 'Clínica',
            personaName: clinic?.personaName || clinic?.name || 'Sinap',
            phone: clinic?.phone || null,
            remindersEnabled: remindersFlag?.state === 'on',
            hasWhatsApp,
            metaClient,
            templateAvailable,
          }
          clinicCache.set(appointment.clinicId, clinicData)
        }

        // Skip if reminders not enabled for this clinic
        if (!clinicData.remindersEnabled) {
          remindersSkipped++
          details.push({ appointmentId: appointment.id, status: 'skipped', reason: 'reminders disabled' })
          continue
        }

        // Skip if no WhatsApp connection
        if (!clinicData.hasWhatsApp) {
          remindersSkipped++
          details.push({ appointmentId: appointment.id, status: 'skipped', reason: 'no WhatsApp connection' })
          continue
        }

        // Fetch patient data
        const patient = await db.patient.findUnique({
          where: { id: appointment.patientId },
          select: { id: true, fullName: true, firstName: true, phone: true, doNotContact: true },
        })

        if (!patient) {
          console.log(`[Cron/Reminders] Skipping — patient not found: ${appointment.patientId}`)
          remindersSkipped++
          details.push({ appointmentId: appointment.id, status: 'skipped', reason: 'patient not found' })
          continue
        }

        // Skip if patient has doNotContact flag
        if (patient.doNotContact) {
          console.log(`[Cron/Reminders] Skipping — patient ${patient.fullName} has doNotContact=true`)
          remindersSkipped++
          details.push({ appointmentId: appointment.id, patientName: patient.fullName, status: 'skipped', reason: 'doNotContact' })
          continue
        }

        // Skip if patient has no phone number
        if (!patient.phone) {
          console.log(`[Cron/Reminders] Skipping — patient ${patient.fullName} has no phone number`)
          remindersSkipped++
          details.push({ appointmentId: appointment.id, patientName: patient.fullName, status: 'skipped', reason: 'no phone' })
          continue
        }

        // Fetch doctor and service data in parallel
        const [doctor, service] = await Promise.all([
          db.doctor.findUnique({
            where: { id: appointment.doctorId },
            select: { id: true, name: true },
          }),
          appointment.serviceId
            ? db.service.findUnique({
                where: { id: appointment.serviceId },
                select: { id: true, name: true },
              })
            : Promise.resolve(null),
        ])

        // Check if patient has a recent WhatsApp conversation (within 24h)
        const hasRecentConversation = await hasRecentPatientMessage(appointment.clinicId, patient.id)
        console.log(`[Cron/Reminders] Patient ${patient.fullName}: recent conversation = ${hasRecentConversation}, template available = ${clinicData.templateAvailable}`)

        // Build message data
        const patientDisplayName = patient.firstName !== 'Paciente'
          ? patient.firstName
          : patient.fullName

        const messageData = {
          patientName: patientDisplayName,
          personaName: clinicData.personaName,
          dateFormatted: formatDateSpanish(appointment.date),
          startTime12h: formatTime12h(appointment.startTime),
          doctorName: doctor?.name || 'Doctor',
          serviceName: service?.name || 'Consulta',
          clinicPhone: clinicData.phone,
        }

        // Send the reminder using the best available method
        const sendResult = await sendReminder(
          clinicData.metaClient,
          patient.phone,
          clinicData.templateAvailable,
          hasRecentConversation,
          messageData
        )

        if (!sendResult.success) {
          errors++
          details.push({
            appointmentId: appointment.id,
            patientName: patient.fullName,
            status: 'error',
            method: sendResult.method,
            error: sendResult.error,
          })
          console.error(`[Cron/Reminders] Failed to send to ${patient.fullName}: ${sendResult.error}`)
          continue
        }

        // Mark reminder as sent
        await db.appointment.update({
          where: { id: appointment.id },
          data: {
            reminder24hSent: true,
            reminder24hSentAt: new Date(),
          },
        })

        // Persist the reminder message in the conversation
        let conversation = await db.conversation.findFirst({
          where: {
            clinicId: appointment.clinicId,
            patientId: patient.id,
            channel: 'whatsapp',
            status: 'active',
          },
        })

        if (!conversation) {
          conversation = await db.conversation.create({
            data: {
              clinicId: appointment.clinicId,
              patientId: patient.id,
              channel: 'whatsapp',
              status: 'active',
              currentAgent: 'reception',
            },
          })
        }

        const reminderContent = buildReminderMessage(messageData)
        await db.message.create({
          data: {
            clinicId: appointment.clinicId,
            conversationId: conversation.id,
            direction: 'outbound',
            channel: 'whatsapp',
            senderType: 'system',
            content: sendResult.method === 'template'
              ? `[Template: ${REMINDER_TEMPLATE_NAME}] ${reminderContent}`
              : reminderContent,
            messageType: 'text',
            agentName: 'Sinap Reminders',
            aiGenerated: false,
            wamid: sendResult.messageId,
          },
        })

        // Update conversation's lastMessageAt
        await db.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: new Date() },
        })

        // Emit an EventBus event for tracking
        await db.eventBus.create({
          data: {
            clinicId: appointment.clinicId,
            eventType: 'recordatorio_24h_enviado',
            sourceAgent: 'desk',
            targetAgent: null,
            payload: JSON.stringify({
              appointmentId: appointment.id,
              patientId: patient.id,
              patientName: patient.fullName,
              doctorName: doctor?.name,
              date: appointment.date.toISOString(),
              startTime: appointment.startTime,
              sendMethod: sendResult.method,
            }),
            status: 'pending',
          },
        })

        remindersSent++
        details.push({
          appointmentId: appointment.id,
          patientName: patient.fullName,
          status: 'sent',
          method: sendResult.method,
        })
        console.log(`[Cron/Reminders] Reminder sent to ${patient.fullName} via ${sendResult.method}`)

      } catch (appointmentError) {
        errors++
        const errMsg = appointmentError instanceof Error ? appointmentError.message : String(appointmentError)
        console.error(`[Cron/Reminders] Error processing appointment ${appointment.id}:`, errMsg)
        details.push({ appointmentId: appointment.id, status: 'error', error: errMsg })
      }
    }

    const summary = {
      success: true,
      timestamp: now.toISOString(),
      timezone: DEFAULT_TIMEZONE,
      mode: testMode ? 'test' : forceMode ? 'force' : 'cron',
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      candidates: appointments.length,
      sent: remindersSent,
      skipped: remindersSkipped,
      errors,
      details,
    }

    console.log('[Cron/Reminders] Job complete:', { sent: remindersSent, skipped: remindersSkipped, errors })
    return NextResponse.json(summary)

  } catch (error) {
    console.error('[Cron/Reminders] Fatal error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

// ─── POST handler (for manual triggers / testing) ──────────────
export async function POST(req: NextRequest) {
  return GET(req)
}
