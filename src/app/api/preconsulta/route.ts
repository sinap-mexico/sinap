import ZAI from 'z-ai-web-dev-sdk'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { patientId, clinicId, specialty, appointmentType } = await req.json()

    if (!patientId || !clinicId) {
      return NextResponse.json(
        { error: 'patientId y clinicId son requeridos' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    const systemPrompt = `Eres un asistente de pre-consulta medica para una clinica de ${specialty || 'salud general'} en Mexico.
Genera 5 preguntas especificas que el paciente debe responder antes de su cita.
Las preguntas deben ser relevantes para el tipo de cita (${appointmentType || 'consulta general'}).
Se directo y profesional. Sin emojis. En espanol mexicano.
Preguntas sobre: sintomas, duracion, intensidad, antecedentes, medicamentos actuales.
Responde SOLO con un arreglo JSON de strings, cada uno una pregunta. Sin texto adicional.
Ejemplo de formato: ["Pregunta 1", "Pregunta 2", "Pregunta 3", "Pregunta 4", "Pregunta 5"]`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Genera 5 preguntas de pre-consulta para un paciente de ${specialty || 'salud general'} con tipo de cita: ${appointmentType || 'consulta general'}.` },
      ],
      temperature: 0.6,
      max_tokens: 500,
    })

    const responseText = completion.choices[0]?.message?.content || '[]'

    // Try to parse the JSON array from the response
    let questions: string[] = []
    try {
      // Handle potential markdown code blocks
      const cleanResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      questions = JSON.parse(cleanResponse)
    } catch {
      // If parsing fails, split by newlines as fallback
      questions = responseText.split('\n').filter((q: string) => q.trim().length > 0).map((q: string) => q.replace(/^\d+[\.\)]\s*/, '').trim())
    }

    // Ensure we have exactly 5 questions
    if (questions.length < 5) {
      const defaults = [
        'Cual es el motivo principal de su consulta?',
        'Desde cuando presenta estos sintomas?',
        'En una escala del 1 al 10, que tan intenso es su molestia?',
        'Tiene antecedentes de enfermedades relevantes?',
        'Que medicamentos toma actualmente?',
      ]
      while (questions.length < 5) {
        questions.push(defaults[questions.length])
      }
    }

    return NextResponse.json({ questions: questions.slice(0, 5) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Preconsulta error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
