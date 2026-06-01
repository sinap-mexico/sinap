import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/doctors/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { id } = await params
    const doctor = await db.doctor.findUnique({
      where: { id },
    })

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ doctor })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Doctor GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/doctors/[id] — Update doctor
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { id } = await params
    const body = await req.json()
    const { name, email, phone, specialty, license, color, isActive, workDays, workStart, workEnd, slotMinutes } = body

    const doctor = await db.doctor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(specialty !== undefined && { specialty }),
        ...(license !== undefined && { license }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive }),
        ...(workDays !== undefined && { workDays }),
        ...(workStart !== undefined && { workStart }),
        ...(workEnd !== undefined && { workEnd }),
        ...(slotMinutes !== undefined && { slotMinutes }),
      },
    })

    return NextResponse.json({ doctor })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Doctor PUT error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/doctors/[id] — Soft delete (set isActive = false)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { id } = await params

    // Soft delete: mark as inactive instead of removing
    const doctor = await db.doctor.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ doctor })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Doctor DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
