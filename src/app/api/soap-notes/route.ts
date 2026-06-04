import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST — Create or update SOAP note
export async function POST(req: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
    }

    const body = await req.json()
    const {
      clinicId, patientId, doctorId, appointmentId,
      subjective, objective, assessment, plan,
      aiGenerated, aiSuggested,
      vitals, diagnosis, prescriptions,
    } = body

    if (!clinicId || !patientId) {
      return NextResponse.json(
        { error: 'clinicId y patientId son requeridos' },
        { status: 400 }
      )
    }

    // Resolve doctorId if missing: look up the first active doctor for this clinic
    let resolvedDoctorId = doctorId
    if (!resolvedDoctorId) {
      const firstDoctor = await db.doctor.findFirst({
        where: { clinicId, isActive: true },
        select: { id: true },
      })
      if (firstDoctor) {
        resolvedDoctorId = firstDoctor.id
      } else {
        return NextResponse.json(
          { error: 'No se encontró un doctor activo para esta clínica. Agrega un doctor en Configuración.' },
          { status: 400 }
        )
      }
    }

    // If appointmentId provided and a SoapNote already exists, UPDATE it
    if (appointmentId) {
      const existing = await db.soapNote.findUnique({
        where: { appointmentId },
      })

      if (existing) {
        const updated = await db.soapNote.update({
          where: { id: existing.id },
          data: {
            subjective: subjective ?? existing.subjective,
            objective: objective ?? existing.objective,
            assessment: assessment ?? existing.assessment,
            plan: plan ?? existing.plan,
            aiGenerated: aiGenerated ?? existing.aiGenerated,
            aiSuggested: aiSuggested ?? existing.aiSuggested,
            vitals: vitals ?? existing.vitals,
            diagnosis: diagnosis ?? existing.diagnosis,
            prescriptions: prescriptions ?? existing.prescriptions,
          },
        })
        return NextResponse.json({ soapNote: updated })
      }
    }

    // Otherwise CREATE a new SoapNote
    const soapNote = await db.soapNote.create({
      data: {
        clinicId,
        patientId,
        doctorId: resolvedDoctorId,
        appointmentId: appointmentId || null,
        subjective: subjective || null,
        objective: objective || null,
        assessment: assessment || null,
        plan: plan || null,
        aiGenerated: aiGenerated ?? true,
        aiSuggested: aiSuggested ?? false,
        doctorApproved: false,
        vitals: vitals || null,
        diagnosis: diagnosis || null,
        prescriptions: prescriptions || null,
      },
    })

    return NextResponse.json({ soapNote }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('SOAP notes POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET — List SOAP notes
export async function GET(req: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
    }

    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')
    const patientId = searchParams.get('patientId')

    if (!clinicId) {
      return NextResponse.json(
        { error: 'clinicId es requerido' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { clinicId }
    if (patientId) {
      where.patientId = patientId
    }

    const soapNotes = await db.soapNote.findMany({
      where,
      include: {
        patient: { select: { fullName: true } },
        doctor: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const mapped = soapNotes.map((note) => ({
      id: note.id,
      clinicId: note.clinicId,
      patientId: note.patientId,
      doctorId: note.doctorId,
      appointmentId: note.appointmentId,
      subjective: note.subjective,
      objective: note.objective,
      assessment: note.assessment,
      plan: note.plan,
      aiGenerated: note.aiGenerated,
      aiSuggested: note.aiSuggested,
      doctorApproved: note.doctorApproved,
      doctorSignedAt: note.doctorSignedAt,
      vitals: note.vitals,
      diagnosis: note.diagnosis,
      prescriptions: note.prescriptions,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      patientName: note.patient.fullName,
      doctorName: note.doctor.name,
    }))

    return NextResponse.json({ soapNotes: mapped })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('SOAP notes GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
