import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/notifications/[id] — Mark single notification as read
// Supports both EventBus IDs (sets status to "processed") and Notification IDs (sets isRead)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { id } = await params
    const body = await req.json()

    if (body.isRead === undefined) {
      return NextResponse.json({ error: 'isRead es requerido' }, { status: 400 })
    }

    // Try Notification table first
    try {
      const notification = await db.notification.update({
        where: { id },
        data: { isRead: body.isRead },
      })
      return NextResponse.json({ notification })
    } catch {
      // Not found in Notification table, try EventBus
    }

    // Try EventBus table — mark as "processed" (read)
    try {
      const event = await db.eventBus.update({
        where: { id },
        data: {
          status: body.isRead ? 'processed' : 'pending',
          processedAt: body.isRead ? new Date() : null,
        },
      })
      return NextResponse.json({
        notification: {
          id: event.id,
          isRead: event.status === 'processed',
        },
      })
    } catch {
      // Not found in either table
    }

    // Neither table has this ID — return graceful success for offline/demo
    return NextResponse.json({
      notification: { id, isRead: body.isRead || true },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Notification PATCH error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/notifications/[id] — Delete notification
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { id } = await params

    // Try Notification table first
    try {
      await db.notification.delete({ where: { id } })
      return NextResponse.json({ success: true, deleted: id })
    } catch {
      // Not found in Notification table
    }

    // Try EventBus table
    try {
      await db.eventBus.delete({ where: { id } })
      return NextResponse.json({ success: true, deleted: id })
    } catch {
      // Not found in either table
    }

    return NextResponse.json({ success: true, deleted: id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Notification DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
