import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/services/[id] — Update service
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { id } = await params
    const body = await req.json()
    const { name, description, duration, price, category, isActive } = body

    const service = await db.service.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(duration !== undefined && { duration }),
        ...(price !== undefined && { price }),
        ...(category !== undefined && { category }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ service })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Service PUT error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/services/[id] — Soft delete (set isActive = false)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { id } = await params

    const service = await db.service.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ service })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Service DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
