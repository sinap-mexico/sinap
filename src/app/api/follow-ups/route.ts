import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/follow-ups?clinicId=xxx&patientId=xxx&status=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')
    const patientId = searchParams.get('patientId')
    const status = searchParams.get('status')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    if (!db) {
      return NextResponse.json({ followUps: [] })
    }

    const where: Record<string, unknown> = { clinicId }
    if (patientId) {
      where.patientId = patientId
    }
    if (status) {
      where.status = status
    }

    const followUps = await db.followUp.findMany({
      where,
      include: {
        patient: { select: { fullName: true, phone: true } },
      },
      orderBy: [
        { status: 'asc' }, // pending first
        { dueDate: 'asc' },
      ],
    })

    return NextResponse.json({ followUps })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('FollowUps GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/follow-ups — Create follow-up
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const { clinicId, patientId, type, status, dueDate, notes, createdBy } = body

    if (!clinicId || !patientId || !type) {
      return NextResponse.json({ error: 'clinicId, patientId y type son requeridos' }, { status: 400 })
    }

    const followUp = await db.followUp.create({
      data: {
        clinicId,
        patientId,
        type,
        status: status || 'pending',
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        createdBy: createdBy || null,
      },
      include: {
        patient: { select: { fullName: true, phone: true } },
      },
    })

    return NextResponse.json({ followUp }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('FollowUps POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/follow-ups — Update follow-up (complete, cancel, snooze)
export async function PATCH(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const { followUpId, status, dueDate, notes } = body

    if (!followUpId) {
      return NextResponse.json({ error: 'followUpId es requerido' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) {
      updateData.status = status
      if (status === 'completed') {
        updateData.completedAt = new Date()
      }
    }
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null
      // If snoozing (setting a new due date), revert to pending
      if (dueDate && status === undefined) {
        const existing = await db.followUp.findUnique({ where: { id: followUpId } })
        if (existing?.status === 'snoozed' || existing?.status === 'pending') {
          updateData.status = 'snoozed'
        }
      }
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }

    const followUp = await db.followUp.update({
      where: { id: followUpId },
      data: updateData,
      include: {
        patient: { select: { fullName: true, phone: true } },
      },
    })

    return NextResponse.json({ followUp })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('FollowUps PATCH error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/follow-ups — Delete follow-up
export async function DELETE(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { searchParams } = new URL(req.url)
    const followUpId = searchParams.get('followUpId')

    if (!followUpId) {
      return NextResponse.json({ error: 'followUpId es requerido' }, { status: 400 })
    }

    const existing = await db.followUp.findUnique({ where: { id: followUpId } })
    if (!existing) {
      return NextResponse.json({ error: 'Seguimiento no encontrado' }, { status: 404 })
    }

    await db.followUp.delete({ where: { id: followUpId } })

    return NextResponse.json({ success: true, deleted: followUpId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('FollowUps DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
