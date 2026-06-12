// ─── Diagnostic Endpoint: Check Reminder System Readiness ───
// Call this to verify that all prerequisites for 24h appointment reminders are met.
// Usage: GET /api/cron/appointment-reminders/diagnose?clinicId=xxx

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getClinicMetaConfig, getClinicMetaConnection } from '@/lib/meta-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const clinicId = searchParams.get('clinicId')

  if (!clinicId) {
    return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
  }

  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
  }

  const checks: Record<string, { status: 'ok' | 'warning' | 'error'; message: string; detail?: unknown }> = {}

  try {
    // 1. Check clinic exists
    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, name: true, personaName: true, phone: true },
    })
    if (!clinic) {
      checks.clinic = { status: 'error', message: 'Clinica no encontrada' }
      return NextResponse.json({ ready: false, checks })
    }
    checks.clinic = {
      status: 'ok',
      message: `Clinica: ${clinic.name}`,
      detail: { personaName: clinic.personaName, phone: clinic.phone },
    }

    // 2. Check desk:reminders feature flag
    const remindersFlag = await db.featureFlag.findFirst({
      where: { clinicId, module: 'desk', feature: 'reminders' },
    })
    if (!remindersFlag) {
      checks.featureFlag = {
        status: 'error',
        message: 'Feature flag desk:reminders NO existe. Debes crearlo.',
        detail: {
          fix: `curl -X PUT ${new URL('/api/feature-flags', req.url).origin}/api/feature-flags -H "Content-Type: application/json" -d '{"clinicId":"${clinicId}","module":"desk","feature":"reminders","state":"on"}'`,
        },
      }
    } else if (remindersFlag.state !== 'on') {
      checks.featureFlag = {
        status: 'warning',
        message: `Feature flag desk:reminders existe pero esta en estado "${remindersFlag.state}". Cambialo a "on".`,
        detail: {
          currentState: remindersFlag.state,
          fix: `curl -X PUT ${new URL('/api/feature-flags', req.url).origin}/api/feature-flags -H "Content-Type: application/json" -d '{"clinicId":"${clinicId}","module":"desk","feature":"reminders","state":"on"}'`,
        },
      }
    } else {
      checks.featureFlag = { status: 'ok', message: 'Feature flag desk:reminders activado (on)' }
    }

    // 3. Check WhatsApp connection
    const metaConnection = await getClinicMetaConnection(clinicId, 'whatsapp')
    const metaConfig = await getClinicMetaConfig(clinicId)
    const hasWhatsApp = !!(metaConnection || metaConfig)

    if (!hasWhatsApp) {
      checks.whatsapp = { status: 'error', message: 'No hay conexion de WhatsApp configurada para esta clinica' }
    } else {
      checks.whatsapp = {
        status: 'ok',
        message: metaConnection
          ? 'WhatsApp conectado via MetaConnection'
          : 'WhatsApp conectado via configuracion legacy',
        detail: {
          source: metaConnection ? 'MetaConnection' : 'Legacy',
          phoneNumberId: metaConnection?.phoneNumberId || metaConfig?.phoneNumberId || 'N/A',
        },
      }
    }

    // 4. Check CRON_SECRET env var
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      checks.cronSecret = {
        status: 'warning',
        message: 'CRON_SECRET no esta configurado. Vercel lo inyecta automaticamente para cron jobs, pero se recomienda configurarlo manualmente para seguridad.',
      }
    } else {
      checks.cronSecret = { status: 'ok', message: 'CRON_SECRET configurado' }
    }

    // 5. Check Vercel Cron configuration
    checks.vercelCron = {
      status: 'ok',
      message: 'Cron job configurado en vercel.json: cada hora (0 * * * *)',
      detail: { path: '/api/cron/appointment-reminders', schedule: '0 * * * *' },
    }

    // 6. Check patients with phone numbers
    const patientsWithPhone = await db.patient.count({
      where: { clinicId, phone: { not: null }, doNotContact: false, isActive: true },
    })
    const patientsWithoutPhone = await db.patient.count({
      where: { clinicId, OR: [{ phone: null }, { phone: '' }], isActive: true },
    })
    checks.patients = {
      status: patientsWithPhone > 0 ? 'ok' : 'warning',
      message: `${patientsWithPhone} pacientes con telefono, ${patientsWithoutPhone} sin telefono`,
      detail: { withPhone: patientsWithPhone, withoutPhone: patientsWithoutPhone },
    }

    // 7. Check upcoming appointments
    const now = new Date()
    const tomorrowDate = new Date(now)
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    tomorrowDate.setHours(0, 0, 0, 0)
    const dayAfter = new Date(tomorrowDate)
    dayAfter.setDate(dayAfter.getDate() + 1)

    const upcomingAppointments = await db.appointment.findMany({
      where: {
        clinicId,
        status: { in: ['scheduled', 'confirmed'] },
        reminder24hSent: false,
        date: { gte: tomorrowDate, lt: dayAfter },
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        patient: { select: { fullName: true, phone: true } },
        doctor: { select: { name: true } },
      },
    })

    checks.upcomingAppointments = {
      status: 'ok',
      message: `${upcomingAppointments.length} citas para manana sin recordatorio enviado`,
      detail: upcomingAppointments.map((a) => ({
        id: a.id,
        date: a.date,
        time: a.startTime,
        patient: a.patient.fullName,
        patientPhone: a.patient.phone || 'SIN TELEFONO',
        doctor: a.doctor?.name,
      })),
    }

    // 8. Check Appointment model has reminder24hSent field
    try {
      // Quick test query to see if the column exists
      await db.appointment.findFirst({
        where: { clinicId, reminder24hSent: false },
        select: { id: true },
      })
      checks.dbSchema = { status: 'ok', message: 'Columna reminder24hSent existe en la tabla Appointment' }
    } catch {
      checks.dbSchema = {
        status: 'error',
        message: 'Columna reminder24hSent NO existe. Necesitas correr: npx prisma migrate deploy',
      }
    }

    // Determine overall readiness
    const hasErrors = Object.values(checks).some((c) => c.status === 'error')
    const hasWarnings = Object.values(checks).some((c) => c.status === 'warning')

    const ready = !hasErrors

    return NextResponse.json({
      ready,
      status: ready ? (hasWarnings ? 'ready_with_warnings' : 'ready') : 'not_ready',
      clinicId,
      clinicName: clinic.name,
      checks,
      nextStep: ready
        ? 'Todo listo! Los recordatorios se enviaran automaticamente cada hora para las citas de manana.'
        : 'Revisa los checks con status "error" arriba y sigue las instrucciones para corregirlos.',
    })
  } catch (error) {
    console.error('[Diagnose/Reminders] Error:', error)
    return NextResponse.json(
      { error: 'Error interno', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
