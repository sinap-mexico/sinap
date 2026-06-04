import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/staff?clinicId=xxx
// Returns all staff members (non-doctor staff: receptionists, assistants, admins)
export async function GET(req: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ staff: [] })
    }

    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    const staff = await db.staff.findMany({
      where: { clinicId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ staff })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Staff GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
