import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getMockPatients, DEMO_CLINIC_ID } from '@/lib/mock-api'

// ─── AUTO-SEGMENTATION HELPER ──────────────────────────────

function computeSegment(
  totalVisits: number,
  totalSpent: number,
  lastVisitDate: Date | null
): string {
  if (totalVisits === 0) return 'new'
  if (totalSpent > 50000 || totalVisits > 10) return 'vip'
  if (!lastVisitDate) return 'new'

  const now = new Date()
  const diffMs = now.getTime() - lastVisitDate.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffDays <= 90) return 'active'
  if (diffDays <= 180) return 'inactive'
  return 'churned'
}

// ─── UPDATE PATIENT METRICS HELPER ─────────────────────────

export async function updatePatientMetrics(patientId: string) {
  if (!db) return

  try {
    // Count completed appointments
    const completedAppointments = await db.appointment.count({
      where: { patientId, status: 'completed' },
    })

    // Sum paid invoices
    const paidInvoices = await db.invoice.aggregate({
      where: { patientId, paymentStatus: 'paid' },
      _sum: { total: true },
    })

    // Last visit date = most recent completed appointment
    const lastAppointment = await db.appointment.findFirst({
      where: { patientId, status: 'completed' },
      orderBy: { date: 'desc' },
      select: { date: true },
    })

    const totalVisits = completedAppointments
    const totalSpent = paidInvoices._sum.total || 0
    const lastVisitDate = lastAppointment?.date || null

    const segment = computeSegment(totalVisits, totalSpent, lastVisitDate)

    await db.patient.update({
      where: { id: patientId },
      data: {
        totalVisits,
        totalSpent,
        lastVisitDate,
        segment,
        ltv: totalSpent,
      },
    })
  } catch (err) {
    console.error('Failed to update patient metrics:', err)
  }
}

// GET /api/patients?clinicId=...&search=...&segment=...&page=1&limit=20
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')
    const search = searchParams.get('search')
    const segment = searchParams.get('segment')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId is required' }, { status: 400 })
    }

    // Helper: return mock data filtered by search/segment
    const getFilteredMock = () => {
      let patients = getMockPatients(clinicId)
      if (segment) patients = patients.filter(p => p.segment === segment)
      if (search) {
        const q = search.toLowerCase()
        patients = patients.filter(p =>
          p.fullName.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.phone?.includes(q)
        )
      }
      return NextResponse.json({ patients, total: patients.length, page, limit })
    }

    // Fallback to mock data when DB is unavailable (demo mode)
    if (!db) {
      return getFilteredMock()
    }

    // Try real DB, fall back to mock on connection error
    try {
      // Build where clause
      const where: Record<string, unknown> = { clinicId }
      if (segment) {
        where.segment = segment
      }
      if (search) {
        where.OR = [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { rfc: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [patients, total] = await Promise.all([
        db.patient.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            _count: {
              select: {
                appointments: true,
                soapNotes: true,
                invoices: true,
                conversations: true,
              },
            },
          },
        }),
        db.patient.count({ where }),
      ])

      return NextResponse.json({ patients, total, page, limit })
    } catch (dbError) {
      console.warn('Patients GET DB error, falling back to mock:', dbError instanceof Error ? dbError.message : dbError)
      return getFilteredMock()
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Patients GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/patients — Create a new patient
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 })
    const body = await req.json()
    const {
      clinicId, firstName, lastName, fullName, phone, email,
      birthDate, gender, rfc, address, source, allergies,
      medicalHistory, notes
    } = body

    if (!clinicId || !fullName) {
      return NextResponse.json({ error: 'clinicId y nombre completo son requeridos' }, { status: 400 })
    }

    try {
      // Check for duplicate phone within the same clinic
      if (phone) {
        const existing = await db.patient.findFirst({
          where: { clinicId, phone },
        })
        if (existing) {
          return NextResponse.json({
            error: 'Ya existe un paciente con ese teléfono',
            existingPatient: existing,
          }, { status: 409 })
        }
      }

      const patient = await db.patient.create({
        data: {
          clinicId,
          firstName: firstName || fullName.split(' ')[0],
          lastName: lastName || fullName.split(' ').slice(1).join(' '),
          fullName,
          phone: phone || null,
          email: email || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          gender: gender || null,
          rfc: rfc || null,
          address: address || null,
          source: source || 'walk_in',
          segment: 'new',
          allergies: allergies || null,
          medicalHistory: medicalHistory || null,
          notes: notes || null,
        },
      })

      return NextResponse.json({ patient }, { status: 201 })
    } catch (dbError) {
      console.warn('Patients POST DB error, returning mock response:', dbError instanceof Error ? dbError.message : dbError)
      // Return a mock patient when DB is unavailable
      const mockPatient = {
        id: `mock-patient-${Date.now()}`,
        clinicId,
        firstName: firstName || fullName.split(' ')[0],
        lastName: lastName || fullName.split(' ').slice(1).join(' '),
        fullName,
        phone: phone || null,
        email: email || null,
        birthDate: birthDate || null,
        gender: gender || null,
        rfc: rfc || null,
        address: address || null,
        source: source || 'walk_in',
        segment: 'new',
        allergies: allergies || null,
        medicalHistory: medicalHistory || null,
        notes: notes || null,
        totalVisits: 0,
        totalSpent: 0,
        ltv: 0,
        sentiment: 'neutral',
        preferredChannel: 'whatsapp',
        doNotContact: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return NextResponse.json({ patient: mockPatient }, { status: 201 })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Patients POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
