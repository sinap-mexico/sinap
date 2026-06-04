import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT — Update SOAP note fields
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
    }

    const { id } = await params
    const body = await req.json()
    const {
      subjective, objective, assessment, plan,
      vitals, diagnosis, prescriptions, doctorApproved,
    } = body

    const existing = await db.soapNote.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Nota SOAP no encontrada' }, { status: 404 })
    }

    // Don't allow editing approved/signed notes
    if (existing.doctorApproved) {
      return NextResponse.json(
        { error: 'La nota ya fue aprobada y firmada, no se puede editar' },
        { status: 403 }
      )
    }

    const data: Record<string, unknown> = {}
    if (subjective !== undefined) data.subjective = subjective
    if (objective !== undefined) data.objective = objective
    if (assessment !== undefined) data.assessment = assessment
    if (plan !== undefined) data.plan = plan
    if (vitals !== undefined) data.vitals = vitals
    if (diagnosis !== undefined) data.diagnosis = diagnosis
    if (prescriptions !== undefined) data.prescriptions = prescriptions
    if (doctorApproved !== undefined) {
      data.doctorApproved = doctorApproved
      if (doctorApproved === true) {
        data.doctorSignedAt = new Date()
      }
    }

    const updated = await db.soapNote.update({
      where: { id },
      data,
    })

    return NextResponse.json({ soapNote: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('SOAP notes PUT error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE — Delete a SOAP note (draft or signed)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
    }

    const { id } = await params

    const existing = await db.soapNote.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Nota SOAP no encontrada' }, { status: 404 })
    }

    // If the note is linked to an appointment, clear the appointment's soapNote relation
    // by setting appointmentId to null on the soapNote before deleting is not needed
    // because onDelete: SetNull on the appointment relation handles it.

    await db.soapNote.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('SOAP notes DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH — Approve/sign SOAP note
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
    }

    const { id } = await params

    const existing = await db.soapNote.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Nota SOAP no encontrada' }, { status: 404 })
    }

    if (existing.doctorApproved) {
      return NextResponse.json(
        { error: 'La nota ya fue aprobada y firmada' },
        { status: 400 }
      )
    }

    const updated = await db.soapNote.update({
      where: { id },
      data: {
        doctorApproved: true,
        doctorSignedAt: new Date(),
        // Mark as no longer "suggested" since doctor has reviewed
        aiSuggested: false,
      },
    })

    return NextResponse.json({ soapNote: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('SOAP notes PATCH error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
