import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getMockAppointments } from '@/lib/mock-api'

// GET /api/appointments?clinicId=xxx&date=2026-06-02&doctorId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')
    const date = searchParams.get('date')
    const doctorId = searchParams.get('doctorId')
    const includeHistory = searchParams.get('includeHistory') === 'true'

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    // Fallback to mock data when DB is unavailable (demo mode)
    if (!db) {
      let appointments = getMockAppointments(clinicId)
      if (!includeHistory) {
        appointments = appointments.filter(a => !['cancelled', 'no_show'].includes(a.status))
      }
      if (doctorId) {
        appointments = appointments.filter(a => a.doctorId === doctorId)
      }
      if (date) {
        const dateStr = new Date(date).toISOString().slice(0, 10)
        appointments = appointments.filter(a => {
          const aptDate = new Date(a.date as string).toISOString().slice(0, 10)
          return aptDate === dateStr
        })
      }
      return NextResponse.json({ appointments })
    }

    const where: Record<string, unknown> = { clinicId }

    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      where.date = { gte: startDate, lte: endDate }
    }

    if (doctorId) {
      where.doctorId = doctorId
    }

    // By default, exclude cancelled/no-show unless history is requested
    if (!includeHistory) {
      where.status = { notIn: ['cancelled', 'no-show'] }
    }

    const appointments = await db.appointment.findMany({
      where,
      include: {
        patient: { select: { fullName: true, phone: true } },
        doctor: { select: { name: true, color: true } },
        service: { select: { name: true, duration: true, price: true } },
      },
      orderBy: { startTime: 'asc' },
    })

    return NextResponse.json({ appointments })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Appointments GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/appointments — Create appointment
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const { clinicId, patientId, doctorId, serviceId, date, startTime, endTime, notes, channel, replacesCancelledId } = body

    if (!clinicId || !patientId || !doctorId || !date || !startTime) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Check for time slot conflicts
    const existing = await db.appointment.findFirst({
      where: {
        clinicId,
        doctorId,
        date: new Date(date),
        startTime,
        status: { notIn: ['cancelled', 'no-show'] },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Este horario ya esta ocupado. Selecciona otro horario.' },
        { status: 409 }
      )
    }

    const appointment = await db.appointment.create({
      data: {
        clinicId,
        patientId,
        doctorId,
        serviceId: serviceId || null,
        date: new Date(date),
        startTime,
        endTime: endTime || startTime,
        status: 'scheduled',
        channel: channel || 'whatsapp',
        notes: notes
          ? replacesCancelledId
            ? `${notes} (Re-agendada tras cancelación)`
            : notes
          : replacesCancelledId
          ? 'Cita re-agendada tras cancelación anterior'
          : null,
      },
      include: {
        patient: { select: { fullName: true, phone: true } },
        doctor: { select: { name: true, color: true } },
        service: { select: { name: true, duration: true, price: true } },
      },
    })

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Appointments POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/appointments — Cancel or update appointment
export async function PATCH(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const { appointmentId, status, cancelReason, notes, preConsultCompleted, preConsultData } = body

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId es requerido' }, { status: 400 })
    }

    // If cancelling, record the reason for history
    if (status === 'cancelled') {
      const appointment = await db.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'cancelled',
          cancelReason: cancelReason || 'Cancelada sin razón especificada',
          notes: notes || undefined,
          ...(preConsultCompleted !== undefined && { preConsultCompleted }),
          ...(preConsultData !== undefined && { preConsultData }),
        },
        include: {
          patient: { select: { fullName: true, phone: true } },
          doctor: { select: { name: true, color: true } },
          service: { select: { name: true, duration: true, price: true } },
        },
      })

      return NextResponse.json({ appointment })
    }

    // General status update
    const appointment = await db.appointment.update({
      where: { id: appointmentId },
      data: {
        ...(status && { status }),
        ...(notes && { notes }),
        ...(preConsultCompleted !== undefined && { preConsultCompleted }),
        ...(preConsultData !== undefined && { preConsultData }),
      },
      include: {
        patient: { select: { fullName: true, phone: true } },
        doctor: { select: { name: true, color: true } },
        service: { select: { name: true, duration: true, price: true } },
      },
    })

    return NextResponse.json({ appointment })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Appointments PATCH error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
