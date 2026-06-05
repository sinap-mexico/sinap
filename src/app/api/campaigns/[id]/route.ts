import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/campaigns/[id] — Update campaign
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { id } = await params
    const body = await req.json()

    const existing = await db.campaign.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.type !== undefined) updateData.type = body.type
    if (body.campaignType !== undefined) updateData.campaignType = body.campaignType
    if (body.channel !== undefined) updateData.channel = body.channel
    if (body.status !== undefined) updateData.status = body.status
    if (body.segment !== undefined) updateData.segment = body.segment
    if (body.subject !== undefined) updateData.subject = body.subject
    if (body.content !== undefined) updateData.content = body.content
    if (body.scheduledAt !== undefined) updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
    if (body.sentAt !== undefined) updateData.sentAt = body.sentAt ? new Date(body.sentAt) : null
    if (body.recipientCount !== undefined) updateData.recipientCount = body.recipientCount
    if (body.sentCount !== undefined) updateData.sentCount = body.sentCount
    if (body.deliveredCount !== undefined) updateData.deliveredCount = body.deliveredCount
    if (body.openedCount !== undefined) updateData.openedCount = body.openedCount
    if (body.respondedCount !== undefined) updateData.respondedCount = body.respondedCount
    if (body.openRate !== undefined) updateData.openRate = body.openRate
    if (body.clickRate !== undefined) updateData.clickRate = body.clickRate
    if (body.responseRate !== undefined) updateData.responseRate = body.responseRate

    // If sending now, update status and set sentAt + simulate stats
    if (body.status === 'sending' || body.status === 'active') {
      if (!existing.sentAt) {
        updateData.sentAt = new Date()
      }
      // Simulate delivery stats when launching
      const rc = existing.recipientCount || 0
      if (rc > 0 && !existing.sentCount) {
        updateData.sentCount = rc
        updateData.deliveredCount = Math.round(rc * 0.92)
        updateData.openedCount = Math.round(rc * 0.48)
        updateData.respondedCount = Math.round(rc * 0.18)
        updateData.openRate = (updateData.openedCount as number) / rc
        updateData.responseRate = (updateData.respondedCount as number) / rc
      }
    }

    const campaign = await db.campaign.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ campaign })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Campaign PATCH error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/campaigns/[id] — Delete campaign
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { id } = await params

    const existing = await db.campaign.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    }

    await db.campaign.delete({ where: { id } })

    return NextResponse.json({ success: true, deleted: id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Campaign DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
