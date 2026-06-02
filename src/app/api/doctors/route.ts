import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getMockDoctors } from '@/lib/mock-api'

// GET /api/doctors?clinicId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    // Fallback to mock data when DB is unavailable (demo mode)
    if (!db) {
      const doctors = getMockDoctors(clinicId)
      return NextResponse.json({ doctors })
    }

    const doctors = await db.doctor.findMany({
      where: { clinicId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ doctors })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Doctors GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/doctors — Create doctor
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const { clinicId, name, email, phone, specialty, license, color, workDays, workStart, workEnd, slotMinutes } = body

    if (!clinicId || !name) {
      return NextResponse.json({ error: 'clinicId y nombre son requeridos' }, { status: 400 })
    }

    // Check plan limit
    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: { maxDoctors: true },
    })

    if (clinic) {
      const currentCount = await db.doctor.count({ where: { clinicId, isActive: true } })
      if (currentCount >= clinic.maxDoctors) {
        return NextResponse.json(
          { error: `Limite alcanzado: tu plan permite ${clinic.maxDoctors} doctor(es). Actualiza tu plan para agregar mas.` },
          { status: 403 }
        )
      }
    }

    const doctor = await db.doctor.create({
      data: {
        clinicId,
        name,
        email: email || null,
        phone: phone || null,
        specialty: specialty || null,
        license: license || null,
        color: color || '#1D9E75',
        workDays: workDays || '1,2,3,4,5',
        workStart: workStart || '09:00',
        workEnd: workEnd || '18:00',
        slotMinutes: slotMinutes || 30,
      },
    })

    return NextResponse.json({ doctor }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Doctors POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
