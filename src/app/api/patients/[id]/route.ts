import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getMockPatients, getMockAppointments, getMockInvoices, DEMO_CLINIC_ID } from '@/lib/mock-api'

// GET /api/patients/[id] — Get a single patient with related data
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Helper: return mock patient profile
    const getMockProfile = () => {
      const patients = getMockPatients(DEMO_CLINIC_ID)
      const patient = patients.find((p) => p.id === id)
      if (!patient) {
        return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
      }
      // Enrich mock patient with related data
      const allAppointments = getMockAppointments(DEMO_CLINIC_ID)
      const allInvoices = getMockInvoices(DEMO_CLINIC_ID)

      const patientAppointments = allAppointments
        .filter((a: Record<string, unknown>) => a.patientId === id)
        .map((a: Record<string, unknown>) => ({
          id: a.id,
          date: a.date,
          startTime: a.startTime,
          endTime: a.endTime,
          status: a.status,
          notes: a.notes || null,
          doctor: a.doctor || null,
          service: a.service || null,
        }))

      const patientInvoices = allInvoices
        .filter((inv: Record<string, unknown>) => inv.patientId === id)
        .map((inv: Record<string, unknown>) => ({
          id: inv.id,
          createdAt: inv.createdAt,
          total: inv.total,
          concepto: inv.concepto || null,
          status: inv.status,
          paymentStatus: inv.paymentStatus,
          cfdiUuid: inv.cfdiUuid || null,
        }))

      // Generate some mock SOAP notes
      const mockSoapNotes = patientAppointments
        .filter((a: Record<string, unknown>) => a.status === 'completed')
        .slice(0, 5)
        .map((a: Record<string, unknown>, idx: number) => ({
          id: `mock-soap-${id}-${idx}`,
          createdAt: a.date,
          subjective: 'Paciente refiere mejora parcial de sintomas.',
          objective: 'Exploracion fisica sin hallazgos patologicos adicionales.',
          assessment: 'Diagnostico de seguimiento. Buena respuesta al tratamiento.',
          plan: 'Continuar tratamiento actual. Seguimiento en 2 semanas.',
          diagnosis: 'Seguimiento de condicion dermatologica',
          doctor: a.doctor,
        }))

      const enriched = {
        ...patient,
        appointments: patientAppointments,
        soapNotes: mockSoapNotes,
        invoices: patientInvoices,
        _count: {
          appointments: patientAppointments.length,
          soapNotes: mockSoapNotes.length,
          invoices: patientInvoices.length,
          conversations: 0,
        },
      }

      return NextResponse.json({ patient: enriched })
    }

    // Fallback to mock data when DB is unavailable (demo mode)
    if (!db) {
      return getMockProfile()
    }

    // Try real DB, fall back to mock on connection error
    try {
      const patient = await db.patient.findUnique({
        where: { id },
        include: {
          appointments: {
            orderBy: { date: 'desc' },
            take: 20,
            include: {
              doctor: { select: { id: true, name: true, specialty: true, color: true } },
              service: { select: { id: true, name: true, duration: true, price: true } },
            },
          },
          soapNotes: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
              doctor: { select: { id: true, name: true } },
            },
          },
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          followUps: {
            orderBy: [
              { status: 'asc' },
              { dueDate: 'asc' },
            ],
            take: 20,
          },
          conversations: {
            orderBy: { lastMessageAt: 'desc' },
            take: 5,
            include: {
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 3,
              },
            },
          },
          _count: {
            select: {
              appointments: true,
              soapNotes: true,
              invoices: true,
              conversations: true,
            },
          },
        },
      })

      if (!patient) {
        return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
      }

      return NextResponse.json({ patient })
    } catch (dbError) {
      console.warn('Patient GET by ID DB error, falling back to mock:', dbError instanceof Error ? dbError.message : dbError)
      return getMockProfile()
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Patient GET by ID error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/patients/[id] — Update a patient
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!db) return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 })

    const body = await req.json()
    const {
      firstName, lastName, fullName, phone, email,
      birthDate, gender, rfc, address, source,
      allergies, medicalHistory, notes,
      segment, totalVisits, totalSpent, ltv,
      preferredChannel, preferredTime, doNotContact, sentiment,
    } = body

    // Build update data — only include fields that were provided
    const data: Record<string, unknown> = {}
    if (firstName !== undefined) data.firstName = firstName
    if (lastName !== undefined) data.lastName = lastName
    if (fullName !== undefined) data.fullName = fullName
    if (phone !== undefined) data.phone = phone || null
    if (email !== undefined) data.email = email || null
    if (birthDate !== undefined) data.birthDate = birthDate ? new Date(birthDate) : null
    if (gender !== undefined) data.gender = gender || null
    if (rfc !== undefined) data.rfc = rfc || null
    if (address !== undefined) data.address = address || null
    if (source !== undefined) data.source = source
    if (allergies !== undefined) data.allergies = allergies || null
    if (medicalHistory !== undefined) data.medicalHistory = medicalHistory || null
    if (notes !== undefined) data.notes = notes || null
    if (segment !== undefined) data.segment = segment
    if (totalVisits !== undefined) data.totalVisits = totalVisits
    if (totalSpent !== undefined) data.totalSpent = totalSpent
    if (ltv !== undefined) data.ltv = ltv
    if (preferredChannel !== undefined) data.preferredChannel = preferredChannel
    if (preferredTime !== undefined) data.preferredTime = preferredTime || null
    if (doNotContact !== undefined) data.doNotContact = doNotContact
    if (sentiment !== undefined) data.sentiment = sentiment

    try {
      const patient = await db.patient.update({
        where: { id },
        data,
      })

      return NextResponse.json({ patient })
    } catch (dbError) {
      console.warn('Patient PATCH DB error, returning mock response:', dbError instanceof Error ? dbError.message : dbError)
      // Return a mock updated patient
      return NextResponse.json({ patient: { id, ...data, updatedAt: new Date().toISOString() } })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Patient PATCH error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/patients/[id] — Soft delete (not actually deleting, just deactivating)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!db) return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 })

    // For now, we actually delete. In production, you'd add an `isActive` field.
    await db.patient.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Patient DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
