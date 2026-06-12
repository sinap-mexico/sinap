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

    // Calculate the 24h window: appointments whose start time is between
    // 23h and 25h from now. This gives us a 2-hour window so that if the
    // cron runs late or skips an hour, we still catch the appointments.
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000)
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    // For the date query: we need to find appointments where
    // date + startTime falls within the 24h window
    // Since startTime is a string, we query by date range and filter in JS
    const tomorrowDate = new Date(now)
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    tomorrowDate.setHours(0, 0, 0, 0)

    const dayAfter = new Date(tomorrowDate)
    dayAfter.setDate(dayAfter.getDate() + 1)

    // Find appointments that:
    // - Are scheduled or confirmed
    // - Haven't had a 24h reminder sent yet
    // - Are for tomorrow (date range)
    const appointments = await db.appointment.findMany({
      where: {
        status: { in: ['scheduled', 'confirmed'] },
        reminder24hSent: false,
        date: {
          gte: tomorrowDate,
          lt: dayAfter,
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
        // Check if appointment time falls within the 24h window
        const [hours, minutes] = appointment.startTime.split(':').map(Number)
        const appointmentDateTime = new Date(appointment.date)
        appointmentDateTime.setHours(hours, minutes, 0, 0)

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
