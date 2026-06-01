import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Simple keyword matching to infer agent routing
function inferAgentFromContent(content: string): string | null {
  const lower = content.toLowerCase()

  const receptionKeywords = ['cita', 'agendar', 'horario', 'confirmar', 'cancelar', 'reagendar', 'precio', 'costo', 'servicio', 'disponib', 'consultorio', 'hora', 'turno']
  const billingKeywords = ['factura', 'pago', 'cobro', 'cfdi', 'timbre', 'xml', 'pdf', 'facturar', 'recibo', 'comprobante', 'metodo de pago', 'forma de pago', 'iva']
  const clinicalKeywords = ['sintoma', 'dolor', 'molesta', 'pre-consulta', 'preconsulta', 'soap', 'nota clinica', 'consulta medica', 'diagnostico', 'tratamiento', 'receta', 'exploracion']
  const marketingKeywords = ['campana', 'marketing', 'reactivar', 'inactivo', 'redes sociales', 'promocion', 'descuento', 'paciente nuevo']

  if (receptionKeywords.some(kw => lower.includes(kw))) return 'reception'
  if (billingKeywords.some(kw => lower.includes(kw))) return 'billing'
  if (clinicalKeywords.some(kw => lower.includes(kw))) return 'clinical'
  if (marketingKeywords.some(kw => lower.includes(kw))) return 'marketing'

  return null
}

// POST /api/messages — Create a message and update conversation
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const {
      conversationId,
      clinicId,
      direction,
      content,
      senderType,
      senderId,
      agentName,
      aiGenerated,
      channel,
      messageType,
    } = body

    if (!conversationId || !clinicId || !direction || !content) {
      return NextResponse.json(
        { error: 'conversationId, clinicId, direction, and content are required' },
        { status: 400 }
      )
    }

    if (!['inbound', 'outbound'].includes(direction)) {
      return NextResponse.json({ error: 'direction must be "inbound" or "outbound"' }, { status: 400 })
    }

    // Look up conversation to get default channel
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { channel: true, currentAgent: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Create the message record
    const message = await db.message.create({
      data: {
        clinicId,
        conversationId,
        direction,
        channel: channel || conversation.channel,
        senderType: senderType || 'patient',
        senderId: senderId || null,
        content,
        messageType: messageType || 'text',
        agentName: agentName || null,
        aiGenerated: aiGenerated || false,
        isMock: true, // All messages from the demo UI are mock
      },
    })

    // Update conversation's lastMessageAt
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    // If inbound and conversation has no currentAgent, infer from content
    if (direction === 'inbound' && !conversation.currentAgent) {
      const inferredAgent = inferAgentFromContent(content)
      if (inferredAgent) {
        await db.conversation.update({
          where: { id: conversationId },
          data: { currentAgent: inferredAgent },
        })
      }
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Messages POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/messages?conversationId=xxx — List messages for a conversation
export async function GET(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId es requerido' }, { status: 400 })
    }

    const messages = await db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ messages })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Messages GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
