import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/analytics?clinicId=xxx
// Returns patient segments, funnel data, and campaigns
export async function GET(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    // Patient segments — count patients by segment
    const segmentCounts = await db.patient.groupBy({
      by: ['segment'],
      where: { clinicId },
      _count: { segment: true },
    })

    const patientSegments: Record<string, number> = {
      new: 0,
      active: 0,
      inactive: 0,
      churned: 0,
      vip: 0,
    }

    for (const seg of segmentCounts) {
      if (seg.segment in patientSegments) {
        patientSegments[seg.segment] = seg._count.segment
      }
    }

    // Funnel data — derive from patient segments
    // Lead = total patients who had first contact
    // Primera cita = new + active + inactive + vip (they all had at least one appointment)
    // Recurrente = active + vip
    // VIP = vip
    const totalPatients = Object.values(patientSegments).reduce((a, b) => a + b, 0)
    const hadFirstAppointment = patientSegments.new + patientSegments.active + patientSegments.inactive + patientSegments.vip
    const recurrent = patientSegments.active + patientSegments.vip

    const funnelData = [
      { stage: 'Lead', count: totalPatients > 0 ? totalPatients : 1, color: '#888780' },
      { stage: 'Primera cita', count: hadFirstAppointment, color: '#5DCAA5' },
      { stage: 'Recurrente', count: recurrent, color: '#1D9E75' },
      { stage: 'VIP', count: patientSegments.vip, color: '#534AB7' },
    ]

    // Campaigns — for now return empty since there's no Campaign model
    // In the future, this could query a Campaign table
    const campaigns: Array<{
      id: string
      name: string
      segment: string
      patients: number
      sent: number
      responses: number
      status: string
    }> = []

    return NextResponse.json({
      patientSegments,
      funnelData,
      campaigns,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Analytics GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
