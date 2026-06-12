// ─── Cron Job: Appointment Reminders (24h before) ──────────────
// Runs every hour via Vercel Cron Jobs.
// Finds appointments ~24 hours from now that haven't had a reminder sent,
// and sends a WhatsApp reminder message to the patient.
//
// Security: Requires CRON_SECRET authorization header (Vercel injects this).
// Feature flag: desk-reminders (must be "on" for the clinic)

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MetaClient, getClinicMetaConfig, getClinicMetaConnection } from '@/lib/meta-client'

const CRON_SECRET = process.env.CRON_SECRET

// ─── Default timezone for Mexican clinics ───────────────────────
// startTime in the DB is local time (e.g. "09:00" = 9 AM Mexico).
// Vercel servers run in UTC, so we must convert local → UTC.
const DEFAULT_TIMEZONE = 'America/Hermosillo' // UTC-7 (Sonora, no DST)

// ─── Convert local time + date to UTC ─────────────────────────
// startTime is stored as local time (e.g. "09:00" = 9 AM in the clinic's timezone).
// Vercel servers run in UTC, so we need to convert to UTC for accurate comparison.
// This function creates a Date in the specified timezone, then converts to UTC.
function localTimeToUTC(dateFromDB: Date, hours: number, minutes: number, timezone: string): Date {
  // Get the date components from the DB date (ignoring its time portion)
  const year = dateFromDB.getUTCFullYear()
  const month = dateFromDB.getUTCMonth()
  const day = dateFromDB.getUTCDate()

  // Create a formatted date string in the clinic's local timezone
  // to extract the correct calendar date (timezone-safe)
  const localDateStr = dateFromDB.toLocaleDateString('en-CA', { timeZone: timezone }) // "2026-06-13"
  const [localYear, localMonth, localDay] = localDateStr.split('-').map(Number)

  // Build an ISO string representing the local time, then parse it as if it were UTC
  // This effectively creates: "2026-06-13T09:00:00" in the clinic's timezone
  const localISO = `${localYear}-${String(localMonth).padStart(2, '0')}-${String(localDay).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`

  // Use Intl.DateTimeFormat to get the offset for the specific timezone at that moment
  // This handles DST correctly
  const tempDate = new Date(localISO + 'Z') // Treat as UTC initially
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })

  // Get the offset by comparing what the timezone thinks vs UTC
  const parts = formatter.formatToParts(tempDate)
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0'
  const tzHour = parseInt(getPart('hour'))
  const tzMinute = parseInt(getPart('minute'))

  // The offset is the difference between what UTC time produces in the target timezone
  // and the actual UTC time
  const utcHour = tempDate.getUTCHours()
  const utcMinute = tempDate.getUTCMinutes()
  const offsetMinutes = (utcHour * 60 + utcMinute) - (tzHour * 60 + tzMinute)

  // Adjust: subtract the offset to get the real UTC time
  // If timezone is UTC-7, offsetMinutes = -420, so we subtract (-420) = add 420 min = +7h
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

// ─── Build reminder message ────────────────────────────────────
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
    `Hola ${data.patientName}! Te recordamos que tienes cita manana:`,
    ``,
    `Fecha: ${data.dateFormatted}`,
    `Hora: ${data.startTime12h}`,
    `Doctor: ${data.doctorName}`,
    `Servicio: ${data.serviceName}`,
    ``,
  ]

  if (data.clinicPhone) {
    parts.push(`Si necesitas cancelar o reagendar, responde a este mensaje o llamanos al ${data.clinicPhone}.`)
  } else {
    parts.push(`Si necesitas cancelar o reagendar, simplemente responde a este mensaje.`)
  }

  parts.push(`Te esperamos! - ${data.personaName}`)

  return parts.join('\n')
}

// ─── Cache for clinic-level data (avoid repeated queries) ──────
interface ClinicCache {
  name: string
  personaName: string
  phone: string | null
  remindersEnabled: boolean
  hasWhatsApp: boolean
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

    // Calculate the reminder window:
    // - UPPER bound: appointments up to 30h from now (to catch edge cases / timezone shifts)
    // - LOWER bound: appointments at least 4h from now (don't remind if less than 4h away — too late)
    // This wide window ensures we catch appointments even if:
    //   - The cron was down for a few hours
    //   - Timezone offsets shift the exact boundary
    //   - Previous runs had bugs (like the old UTC bug)
    // reminder24hSent prevents duplicate sends, so a wider window is safe.
    const windowStart = new Date(now.getTime() + 4 * 60 * 60 * 1000)   // 4h from now
    const windowEnd = new Date(now.getTime() + 30 * 60 * 60 * 1000)    // 30h from now

    // For the date query: find appointments for today and tomorrow
    // We search both days because timezone offsets can shift the boundary.
    // E.g., an appointment at 9 AM Hermosillo (4 PM UTC) tomorrow
    // could fall into today's UTC date or tomorrow's, depending on the time.
    const todayDate = new Date(now)
    todayDate.setHours(0, 0, 0, 0)

    const dayAfterTomorrow = new Date(todayDate)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 3)

    // Find appointments that:
    // - Are scheduled or confirmed
    // - Haven't had a 24h reminder sent yet
    // - Are for today, tomorrow, or the day after (wide range, filtered in JS)
    const appointments = await db.appointment.findMany({
      where: {
        status: { in: ['scheduled', 'confirmed'] },
        reminder24hSent: false,
        date: {
          gte: todayDate,
          lt: dayAfterTomorrow,
        },
      },
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

    for (const appointment of appointments) {
      try {
        // Convert appointment local time → UTC for comparison
        // startTime is local time (e.g. "09:00" = 9 AM Mexico)
        // We must convert to UTC because Vercel runs in UTC.
        const [hours, minutes] = appointment.startTime.split(':').map(Number)
        const appointmentDateTime = localTimeToUTC(appointment.date, hours, minutes, DEFAULT_TIMEZONE)

        console.log(`[Cron/Reminders] Appointment ${appointment.id}: local=${hours}:${minutes} ${DEFAULT_TIMEZONE} → UTC=${appointmentDateTime.toISOString()}, window=${windowStart.toISOString()}-${windowEnd.toISOString()}`)

        if (appointmentDateTime < windowStart || appointmentDateTime > windowEnd) {
          continue
        }

        // Get or populate clinic cache
        let clinicData = clinicCache.get(appointment.clinicId)
        if (!clinicData) {
          const [clinic, remindersFlag, metaConnection, metaConfig] = await Promise.all([
            db.clinic.findUnique({
              where: { id: appointment.clinicId },
              select: { id: true, name: true, personaName: true, phone: true },
            }),
            db.featureFlag.findFirst({
              where: { clinicId: appointment.clinicId, module: 'desk', feature: 'reminders' },
              select: { state: true },
            }),
            getClinicMetaConnection(appointment.clinicId, 'whatsapp'),
            getClinicMetaConfig(appointment.clinicId),
          ])

          const hasWhatsApp = !!(metaConnection || metaConfig)
          clinicData = {
            name: clinic?.name || 'Clínica',
            personaName: clinic?.personaName || clinic?.name || 'Sinap',
            phone: clinic?.phone || null,
            remindersEnabled: remindersFlag?.state === 'on',
            hasWhatsApp,
          }
          clinicCache.set(appointment.clinicId, clinicData)
        }

        // Skip if reminders not enabled for this clinic
        if (!clinicData.remindersEnabled) {
          remindersSkipped++
          continue
        }

        // Skip if no WhatsApp connection
        if (!clinicData.hasWhatsApp) {
          remindersSkipped++
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
          continue
        }

        // Skip if patient has doNotContact flag
        if (patient.doNotContact) {
          console.log(`[Cron/Reminders] Skipping — patient ${patient.fullName} has doNotContact=true`)
          remindersSkipped++
          continue
        }

        // Skip if patient has no phone number
        if (!patient.phone) {
          console.log(`[Cron/Reminders] Skipping — patient ${patient.fullName} has no phone number`)
          remindersSkipped++
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

        // Create Meta client
        const channelConfig = await getClinicMetaConnection(appointment.clinicId, 'whatsapp')
        let metaClient: MetaClient

        if (channelConfig) {
          metaClient = MetaClient.createForChannel('whatsapp', channelConfig)
        } else {
          const metaConfig = await getClinicMetaConfig(appointment.clinicId)
          if (!metaConfig) {
            remindersSkipped++
            continue
          }
          metaClient = new MetaClient(metaConfig)
        }

        // Build the reminder message
        const patientDisplayName = patient.firstName !== 'Paciente'
          ? patient.firstName
          : patient.fullName

        const reminderMessage = buildReminderMessage({
          patientName: patientDisplayName,
          personaName: clinicData.personaName,
          dateFormatted: formatDateSpanish(appointment.date),
          startTime12h: formatTime12h(appointment.startTime),
          doctorName: doctor?.name || 'Doctor',
          serviceName: service?.name || 'Consulta',
          clinicPhone: clinicData.phone,
        })

        // Normalize phone and send the message
        const normalizedPhone = normalizePhoneForWhatsApp(patient.phone)
        const sendResult = await metaClient.sendTextMessage(normalizedPhone, reminderMessage)

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

        await db.message.create({
          data: {
            clinicId: appointment.clinicId,
            conversationId: conversation.id,
            direction: 'outbound',
            channel: 'whatsapp',
            senderType: 'system',
            content: reminderMessage,
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
            }),
            status: 'pending',
          },
        })

        remindersSent++
        console.log(`[Cron/Reminders] Reminder sent to ${patient.fullName} (${normalizedPhone}) for appointment ${appointment.id}`)

      } catch (appointmentError) {
        errors++
        console.error(`[Cron/Reminders] Error processing appointment ${appointment.id}:`, appointmentError)
      }
    }

    const summary = {
      success: true,
      timestamp: now.toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      candidates: appointments.length,
      sent: remindersSent,
      skipped: remindersSkipped,
      errors,
    }

    console.log('[Cron/Reminders] Job complete:', summary)
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
