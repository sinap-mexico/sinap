import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 })
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')
    const segment = searchParams.get('segment')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { clinicId }
    if (segment) {
      where.segment = segment
    }

    const patients = await db.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ patients })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Patients GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 })
    const body = await req.json()
    const { clinicId, firstName, lastName, fullName, phone, email, source } = body

    if (!clinicId || !fullName) {
      return NextResponse.json({ error: 'clinicId and fullName are required' }, { status: 400 })
    }

    const patient = await db.patient.create({
      data: {
        clinicId,
        firstName: firstName || fullName.split(' ')[0],
        lastName: lastName || fullName.split(' ').slice(1).join(' '),
        fullName,
        phone: phone || null,
        email: email || null,
        source: source || 'walk_in',
        segment: 'new',
      },
    })

    return NextResponse.json({ patient }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Patients POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
