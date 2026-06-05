import { NextRequest, NextResponse } from 'next/server'
import { createZAI } from '@/lib/zai'

const GROW_SYSTEM_PROMPT = `Eres el asistente de Sinap Grow para una clínica de salud en México.
Tu trabajo es ayudar con marketing y reactivación de pacientes.
Reglas:
- Se directo y profesional. Sin emojis.
- Puedes sugerir campañas de reactivación para pacientes inactivos.
- Puedes analizar segmentos y dar recomendaciones.
- Responde en español mexicano, cercano pero profesional.
- Siempre basa tus respuestas en los datos proporcionados.
- Si no tienes datos, sugiere conectar más canales o agregar pacientes.
- Puedes recomendar qué tipo de campaña lanzar según los segmentos.
- Si el usuario pregunta sobre algo fuera de marketing/pacientes, redirige amablemente.
- Cuando sugieras una campaña, incluye: tipo, segmento objetivo y mensaje sugerido.`

// Generate a helpful fallback response when AI is unavailable
function generateFallbackResponse(message: string, clinicData: Record<string, unknown>): string {
  const segments = clinicData.patientSegments as Record<string, number> | undefined
  const totalPatients = clinicData.totalPatients as number | undefined
  const inactive = segments?.inactive || 0

  const lowerMsg = message.toLowerCase()

  if (lowerMsg.includes('inactivo') || lowerMsg.includes('reactivar') || lowerMsg.includes('reactivación')) {
    if (inactive > 0) {
      return `Tienes ${inactive} pacientes inactivos. Te recomiendo lanzar una campaña de reactivación por WhatsApp dirigida a este segmento. Usa un mensaje personalizado ofreciendo un descuento o recordando su seguimiento pendiente.`
    }
    return `No tienes pacientes inactivos registrados aún. Cuando tengas pacientes que no hayan regresado en más de 30 días, aparecerán aquí y podrás lanzar campañas de reactivación.`
  }

  if (lowerMsg.includes('campaña') || lowerMsg.includes('marketing') || lowerMsg.includes('promoción')) {
    if (totalPatients && totalPatients > 0) {
      return `Para lanzar una campaña efectiva: 1) Elige el tipo (reactivación, retención, VIP, promoción o recordatorio), 2) Selecciona el segmento objetivo, 3) Usa las plantillas IA para el mensaje. Puedes crear una desde el botón "Nueva campaña".`
    }
    return `Para lanzar campañas primero necesitas tener pacientes registrados. Una vez que tengas pacientes, podrás segmentarlos y crear campañas personalizadas por WhatsApp o email.`
  }

  if (lowerMsg.includes('paciente') || lowerMsg.includes('segmento')) {
    if (totalPatients && totalPatients > 0) {
      return `Tienes ${totalPatients} pacientes en total. Revisa los segmentos en el panel superior para identificar oportunidades de reactivación o upgrade a VIP.`
    }
    return `Aún no tienes pacientes registrados. Conecta tus canales de WhatsApp o agrega pacientes manualmente para comenzar a ver datos y segmentos.`
  }

  if (totalPatients && totalPatients > 0) {
    return `Puedo ayudarte con estrategias de marketing para tu clínica. Tienes ${totalPatients} pacientes registrados. Pregúntame sobre campañas, reactivación de pacientes inactivos, o estrategias de retención.`
  }

  return `Bienvenido a Sinap Grow. Puedo ayudarte con estrategias de marketing para tu clínica. Para comenzar, necesitas registrar pacientes y conectar tus canales de comunicación. Una vez que tengas datos, podré darte recomendaciones personalizadas.`
}

export async function POST(req: NextRequest) {
  try {
    const { messages, clinicData } = await req.json()

    const lastUserMessage = messages?.filter((m: { role: string }) => m.role === 'user').pop()?.content || ''

    // Try AI first
    try {
      const systemMessage = {
        role: 'system' as const,
        content: `${GROW_SYSTEM_PROMPT}\n\nDatos actuales de la clínica:\n${JSON.stringify(clinicData || {}, null, 2)}`
      }

      const zai = await createZAI()
      const completion = await zai.chat.completions.create({
        messages: [systemMessage, ...messages],
        temperature: 0.7,
        max_tokens: 500,
      })

      const aiResponse = completion.choices[0]?.message?.content

      if (aiResponse) {
        return NextResponse.json({ message: aiResponse })
      }
    } catch (aiError) {
      console.error('AI chat AI error (falling back to template):', aiError instanceof Error ? aiError.message : aiError)
    }

    // Fallback: generate a helpful response without AI
    const fallbackMessage = generateFallbackResponse(lastUserMessage, clinicData || {})
    return NextResponse.json({ message: fallbackMessage })

  } catch (error) {
    console.error('AI chat error:', error)

    // Return 200 with a helpful message instead of 500
    // This prevents the frontend from showing the generic error
    return NextResponse.json({
      message: 'Estoy teniendo dificultades para procesar tu consulta en este momento. Mientras tanto, puedes crear campañas de reactivación desde el botón "Nueva campaña" o revisar tus segmentos de pacientes en el panel superior.'
    })
  }
}
