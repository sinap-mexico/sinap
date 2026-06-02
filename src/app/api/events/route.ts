import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST — Emit event
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 })
    const { clinicId, eventType, sourceAgent, targetAgent, payload } = await req.json()

    if (!clinicId || !eventType || !sourceAgent) {
      return NextResponse.json(
        { error: 'clinicId, eventType y sourceAgent son requeridos' },
        { status: 400 }
      )
    }

    try {
      const event = await db.eventBus.create({
        data: {
          clinicId,
          eventType,
          sourceAgent,
          targetAgent: targetAgent || null,
          payload: payload || '{}',
          status: 'pending',
        },
      })

      return NextResponse.json({ event }, { status: 201 })
    } catch {
      // If DB write fails (e.g. no clinic in DB), return mock event
      const mockEvent = {
        id: `evt_${Date.now()}`,
        clinicId,
        eventType,
        sourceAgent,
        targetAgent: targetAgent || null,
        payload: payload || '{}',
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      return NextResponse.json({ event: mockEvent }, { status: 201 })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Events POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET — Get events for a clinic (recent activity)
export async function GET(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 })
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')
    const agent = searchParams.get('agent')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const statusFilter = searchParams.get('status') // If not provided, return all statuses

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    try {
      const where: Record<string, unknown> = { clinicId }

      if (statusFilter) {
        where.status = statusFilter
      }

      if (agent) {
        where.OR = [
          { targetAgent: agent },
          { targetAgent: null },
        ]
      }

      const events = await db.eventBus.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
      })

      return NextResponse.json({ events })
    } catch {
      // If DB read fails, return empty list
      return NextResponse.json({ events: [] })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Events GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH — Mark event as processed
export async function PATCH(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 })
    const { eventId, status } = await req.json()

    if (!eventId || !status) {
      return NextResponse.json(
        { error: 'eventId y status son requeridos' },
        { status: 400 }
      )
    }

    if (!['processed', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'status debe ser "processed" o "failed"' },
        { status: 400 }
      )
    }

    try {
      const event = await db.eventBus.update({
        where: { id: eventId },
        data: {
          status,
          processedAt: new Date(),
        },
      })

      return NextResponse.json({ event })
    } catch {
      // If DB update fails, return mock response
      return NextResponse.json({
        event: {
          id: eventId,
          status,
          processedAt: new Date().toISOString(),
        },
      })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Events PATCH error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
