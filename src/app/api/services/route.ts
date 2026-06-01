import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/services?clinicId=xxx
export async function GET(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    const includeInactive = searchParams.get('includeInactive') === 'true'

    const services = await db.service.findMany({
      where: {
        clinicId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ services })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Services GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/services — Create service
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const { clinicId, name, duration, price, category, description } = body

    if (!clinicId || !name) {
      return NextResponse.json({ error: 'clinicId y nombre son requeridos' }, { status: 400 })
    }

    const service = await db.service.create({
      data: {
        clinicId,
        name,
        duration: duration || 30,
        price: price || 0,
        category: category || null,
        description: description || null,
      },
    })

    return NextResponse.json({ service }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Services POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
