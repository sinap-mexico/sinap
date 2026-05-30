import ZAI from 'z-ai-web-dev-sdk'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { message, clinicId, patientId, conversationHistory } = await req.json()

    const zai = await ZAI.create()

    const systemPrompt = `Eres el asistente de Sinap Desk para una clínica de salud en México. 
Tu trabajo es atender pacientes por WhatsApp/Instagram/Facebook Messenger.
Reglas:
- Sé directo y profesional. Sin emojis. Sin jerga innecesaria.
- Puedes agendar, confirmar, cancelar y reagendar citas.
- Puedes dar información de precios y servicios de la clínica.
- Si el paciente tiene una queja o emergencia, sugiere contactar directamente al doctor.
- Si no estás seguro de algo, ofrece conectar con el personal.
- Responde en español mexicano, cercano pero profesional.
- NUNCA diagnostiques ni recetes. Solo información y gestión de citas.`

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.map((m: { direction: string; text: string }) => ({
        role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      })),
      { role: 'user' as const, content: message },
    ]

    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 300,
    })

    return NextResponse.json({
      response: completion.choices[0]?.message?.content,
      agent: 'Sinap Desk',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Orchestrator error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
