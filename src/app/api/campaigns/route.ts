import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/campaigns?clinicId=xxx&status=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')
    const status = searchParams.get('status')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    if (!db) {
      return NextResponse.json({ campaigns: [] })
    }

    const where: Record<string, unknown> = { clinicId }
    if (status) {
      where.status = status
    }

    const campaigns = await db.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ campaigns })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Campaigns GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/campaigns — Create campaign
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const {
      clinicId, name, type, campaignType, channel, segment, subject, content,
      scheduledAt, status,
    } = body

    if (!clinicId || !name || !content) {
      return NextResponse.json(
        { error: 'clinicId, name y content son requeridos' },
        { status: 400 }
      )
    }

    // Estimate recipient count based on segment
    const segmentFilter: Record<string, unknown> = { clinicId, isActive: true }
    if (segment && segment !== 'all') {
      segmentFilter.segment = segment
    }
    const recipientCount = await db.patient.count({ where: segmentFilter })

    // Simulate stats for active/sending campaigns
    const sentCount = status === 'sending' || status === 'active' ? recipientCount : 0
    const deliveredCount = status === 'sending' || status === 'active' ? Math.round(recipientCount * 0.92) : 0
    const openedCount = status === 'sending' || status === 'active' ? Math.round(recipientCount * 0.48) : 0
    const respondedCount = status === 'sending' || status === 'active' ? Math.round(recipientCount * 0.18) : 0
    const openRate = recipientCount > 0 ? openedCount / recipientCount : 0
    const responseRate = recipientCount > 0 ? respondedCount / recipientCount : 0

    const campaign = await db.campaign.create({
      data: {
        clinicId,
        name,
        type: type || channel || 'whatsapp',
        campaignType: campaignType || 'promocion',
        channel: channel || 'whatsapp',
        status: status || 'draft',
        segment: segment || 'all',
        subject: subject || null,
        content,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        recipientCount,
        sentCount,
        deliveredCount,
        openedCount,
        respondedCount,
        openRate,
        responseRate,
      },
    })

    // Emit event
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          eventType: 'campana_creada',
          sourceAgent: 'grow',
          payload: JSON.stringify({
            campaignId: campaign.id,
            name,
            campaignType: campaign.campaignType,
            channel: campaign.channel,
            segment: campaign.segment,
            recipientCount,
          }),
        }),
      })
    } catch {
      // Event emission is non-critical
    }

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Campaigns POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
