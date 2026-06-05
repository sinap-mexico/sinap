import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─── EVENT BUS → NOTIFICATION MAPPING ────────────────────────
// Maps EventBus eventType to notification display format

interface EventNotifMapping {
  type: string        // notification category for icon/color
  title: string       // display title (ES)
  icon: string        // lucide-react icon name
  actionUrl: string   // deep link
}

const eventTypeMap: Record<string, EventNotifMapping> = {
  cita_agendada: {
    type: 'appointment',
    title: 'Cita agendada',
    icon: 'Calendar',
    actionUrl: '/?module=agenda',
  },
  cita_cancelada: {
    type: 'appointment',
    title: 'Cita cancelada',
    icon: 'Calendar',
    actionUrl: '/?module=agenda',
  },
  cita_completada: {
    type: 'appointment',
    title: 'Cita completada',
    icon: 'CheckCircle2',
    actionUrl: '/?module=agenda',
  },
  factura_generada: {
    type: 'invoice',
    title: 'Factura generada',
    icon: 'Receipt',
    actionUrl: '/?module=bill',
  },
  pago_recibido: {
    type: 'payment',
    title: 'Pago recibido',
    icon: 'CheckCircle2',
    actionUrl: '/?module=bill',
  },
  paciente_nuevo: {
    type: 'patient',
    title: 'Paciente nuevo',
    icon: 'UserPlus',
    actionUrl: '/?module=patients',
  },
  campana_lanzada: {
    type: 'campaign',
    title: 'Campaña lanzada',
    icon: 'Send',
    actionUrl: '/?module=grow',
  },
  mensaje_recibido: {
    type: 'message',
    title: 'Mensaje recibido',
    icon: 'MessageSquare',
    actionUrl: '/?module=desk',
  },
  soap_borrador_listo: {
    type: 'system',
    title: 'Nota SOAP lista',
    icon: 'Activity',
    actionUrl: '/?module=flow',
  },
  cita_reagendada: {
    type: 'appointment',
    title: 'Cita reagendada',
    icon: 'Calendar',
    actionUrl: '/?module=agenda',
  },
  pago_pendiente: {
    type: 'payment',
    title: 'Pago pendiente',
    icon: 'Receipt',
    actionUrl: '/?module=bill',
  },
  factura_error: {
    type: 'invoice',
    title: 'Error en factura',
    icon: 'Receipt',
    actionUrl: '/?module=bill',
  },
}

// Build a human-readable message from EventBus payload
function buildMessage(eventType: string, payloadStr: string): string {
  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(payloadStr)
  } catch {
    return ''
  }

  switch (eventType) {
    case 'cita_agendada':
    case 'cita_cancelada':
    case 'cita_completada':
    case 'cita_reagendada': {
      const patient = (payload.patientName as string) || (payload.name as string) || 'Paciente'
      const service = (payload.service as string) || ''
      return service ? `${patient} — ${service}` : patient
    }
    case 'factura_generada': {
      const total = payload.total as number | undefined
      const patient = (payload.patientName as string) || ''
      const amount = total ? `$${total.toLocaleString('es-MX')} MXN` : ''
      return [patient, amount].filter(Boolean).join(' — ') || 'Factura CFDI generada'
    }
    case 'pago_recibido': {
      const amount = payload.amount as number | undefined
      const patient = (payload.patientName as string) || ''
      const amt = amount ? `$${amount.toLocaleString('es-MX')} MXN` : ''
      return [patient, amt].filter(Boolean).join(' — ') || 'Pago registrado'
    }
    case 'paciente_nuevo': {
      const name = (payload.name as string) || (payload.patientName as string) || 'Nuevo paciente'
      const source = payload.source as string | undefined
      return source ? `${name} vía ${source}` : name
    }
    case 'campana_lanzada': {
      const name = (payload.campaignName as string) || (payload.name as string) || ''
      const segment = payload.segment as string | undefined
      return name + (segment ? ` para ${segment}` : '') || 'Campaña de marketing enviada'
    }
    case 'mensaje_recibido': {
      const patient = (payload.patientName as string) || (payload.senderName as string) || ''
      const channel = (payload.channel as string) || ''
      return patient + (channel ? ` por ${channel}` : '') || 'Nuevo mensaje entrante'
    }
    case 'soap_borrador_listo': {
      const patient = (payload.patientName as string) || ''
      return patient ? `Borrador para ${patient}` : 'Borrador de nota SOAP listo para revisar'
    }
    case 'pago_pendiente': {
      const patient = (payload.patientName as string) || ''
      const amount = payload.amount as number | undefined
      const amt = amount ? `$${amount.toLocaleString('es-MX')} MXN` : ''
      return [patient, amt].filter(Boolean).join(' — ') || 'Factura pendiente de pago'
    }
    case 'factura_error': {
      const error = (payload.error as string) || (payload.errorMessage as string) || ''
      return error || 'Error al timbrar factura'
    }
    default: {
      // Fallback: try to extract something useful from payload
      const patientName = (payload.patientName as string) || (payload.name as string) || ''
      return patientName || eventType.replace(/_/g, ' ')
    }
  }
}

// Transform an EventBus row into a NotificationItem
function eventToNotification(event: {
  id: string
  eventType: string
  payload: string
  status: string
  createdAt: Date
}): {
  id: string
  type: string
  title: string
  message: string
  icon: string | null
  actionUrl: string | null
  isRead: boolean
  createdAt: string
  _source: 'eventbus'
} {
  const mapping = eventTypeMap[eventType] || {
    type: 'system',
    title: eventType.replace(/_/g, ' '),
    icon: 'Bell',
    actionUrl: null,
  }

  return {
    id: event.id,
    type: mapping.type,
    title: mapping.title,
    message: buildMessage(eventType, event.payload),
    icon: mapping.icon,
    actionUrl: mapping.actionUrl,
    isRead: event.status === 'processed', // pending = unread, processed = read
    createdAt: event.createdAt.toISOString(),
    _source: 'eventbus' as const,
  }
}

// GET /api/notifications?clinicId=xxx&limit=20
// Fetches from EventBus (transformed) + Notification table, merged and sorted
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    // When no DB, return mock notifications from EventBus events
    if (!db) {
      return NextResponse.json({ notifications: [], unreadCount: 0 })
    }

    const effectiveLimit = Math.min(limit, 50)

    // Fetch EventBus events for this clinic
    let eventNotifications: ReturnType<typeof eventToNotification>[] = []
    try {
      const events = await db.eventBus.findMany({
        where: { clinicId },
        orderBy: { createdAt: 'desc' },
        take: effectiveLimit,
      })
      eventNotifications = events.map(eventToNotification)
    } catch {
      // DB read failed for events, continue with Notification table
    }

    // Fetch Notification records for this clinic
    let dbNotifications: Array<{
      id: string
      type: string
      title: string
      message: string
      icon: string | null
      actionUrl: string | null
      isRead: boolean
      createdAt: string
      _source: 'notification'
    }> = []
    try {
      const notifs = await db.notification.findMany({
        where: { clinicId },
        orderBy: { createdAt: 'desc' },
        take: effectiveLimit,
      })
      dbNotifications = notifs.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        icon: n.icon,
        actionUrl: n.actionUrl,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        _source: 'notification' as const,
      }))
    } catch {
      // DB read failed for notifications, continue with events only
    }

    // Merge both sources, deduplicate by ID (Notification records take priority)
    const seenIds = new Set<string>()
    const merged: Array<{
      id: string
      type: string
      title: string
      message: string
      icon: string | null
      actionUrl: string | null
      isRead: boolean
      createdAt: string
      _source: string
    }> = []

    // Add Notification records first (higher priority)
    for (const n of dbNotifications) {
      if (!seenIds.has(n.id)) {
        seenIds.add(n.id)
        merged.push(n)
      }
    }

    // Add EventBus events
    for (const n of eventNotifications) {
      if (!seenIds.has(n.id)) {
        seenIds.add(n.id)
        merged.push(n)
      }
    }

    // Sort by createdAt desc and limit
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const notifications = merged.slice(0, effectiveLimit)

    // Count unread
    const unreadCount = notifications.filter(n => !n.isRead).length

    return NextResponse.json({ notifications, unreadCount })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/notifications — Create notification
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const {
      clinicId, userId, type, title, message, icon, actionUrl,
    } = body

    if (!clinicId || !title || !message) {
      return NextResponse.json(
        { error: 'clinicId, title y message son requeridos' },
        { status: 400 }
      )
    }

    const notification = await db.notification.create({
      data: {
        clinicId,
        userId: userId || null,
        type: type || 'system',
        title,
        message,
        icon: icon || null,
        actionUrl: actionUrl || null,
      },
    })

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Notifications POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/notifications — Mark all as read
// Supports both EventBus-based and Notification-table-based notifications
export async function PATCH(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const { clinicId, markAllRead } = body

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    if (markAllRead) {
      let updatedEvents = 0
      let updatedNotifications = 0

      // Mark EventBus events as processed (read)
      try {
        const eventResult = await db.eventBus.updateMany({
          where: {
            clinicId,
            status: 'pending',
          },
          data: {
            status: 'processed',
            processedAt: new Date(),
          },
        })
        updatedEvents = eventResult.count
      } catch {
        // DB update failed for events
      }

      // Mark Notification records as read
      try {
        const notifResult = await db.notification.updateMany({
          where: {
            clinicId,
            isRead: false,
          },
          data: { isRead: true },
        })
        updatedNotifications = notifResult.count
      } catch {
        // DB update failed for notifications
      }

      return NextResponse.json({
        updated: updatedEvents + updatedNotifications,
        updatedEvents,
        updatedNotifications,
      })
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Notifications PATCH error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
