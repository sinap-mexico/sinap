import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')
    const date = searchParams.get('date')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { clinicId }
    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      where.date = { gte: startDate, lte: endDate }
    }

    const appointments = await db.appointment.findMany({
      where,
      include: {
        patient: { select: { fullName: true } },
        doctor: { select: { name: true } },
        service: { select: { name: true } },
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clinicId, patientId, doctorId, serviceId, date, startTime, endTime, notes, channel } = body

    if (!clinicId || !patientId || !doctorId || !date || !startTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
        notes: notes || null,
      },
      include: {
        patient: { select: { fullName: true } },
        doctor: { select: { name: true } },
        service: { select: { name: true } },
      },
    })

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Appointments POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
