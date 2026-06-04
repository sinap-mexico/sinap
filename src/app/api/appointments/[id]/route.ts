import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/appointments/[id] — Cancel or hard-delete appointment
// ?hard=true → permanently delete from DB
// Default → soft delete (set status to 'cancelled')
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const hardDelete = searchParams.get('hard') === 'true'

    const existing = await db.appointment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    if (hardDelete) {
      // Hard delete: permanently remove from database
      // This cascades and will also delete related invoice/soapNote via SetNull
      await db.appointment.delete({ where: { id } })
      return NextResponse.json({ success: true, deleted: id, hardDelete: true })
    }

    // Soft delete: mark as cancelled
    const updated = await db.appointment.update({
      where: { id },
      data: { status: 'cancelled' },
    })

    return NextResponse.json({ success: true, appointment: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Appointment DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/appointments/[id] — Update appointment
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
    }

    const { id } = await params
    const body = await req.json()

    const existing = await db.appointment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.status !== undefined) data.status = body.status
    if (body.startTime !== undefined) data.startTime = new Date(body.startTime)
    if (body.endTime !== undefined) data.endTime = new Date(body.endTime)
    if (body.notes !== undefined) data.notes = body.notes
    if (body.doctorId !== undefined) data.doctorId = body.doctorId
    if (body.serviceId !== undefined) data.serviceId = body.serviceId

    const updated = await db.appointment.update({
      where: { id },
      data,
    })

    return NextResponse.json({ appointment: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Appointment PATCH error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
