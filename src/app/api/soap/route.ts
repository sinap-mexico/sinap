import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createZAI } from '@/lib/zai'

// Extend timeout for AI generation (can take 10-15s)
export const maxDuration = 60

/**
 * Generate a template-based SOAP note from pre-consulta responses
 * when the AI service is unavailable.
 */
function generateTemplateSOAP(
  responses: Array<{ question: string; answer: string }>,
  specialty: string,
  patientHistory?: string
) {
  const symptoms = responses
    .filter(r => r.question.toLowerCase().includes('motivo') || r.question.toLowerCase().includes('sintoma') || r.question.toLowerCase().includes('molestia'))
    .map(r => r.answer)
    .join('. ')

  const duration = responses
    .filter(r => r.question.toLowerCase().includes('cuando') || r.question.toLowerCase().includes('tiempo') || r.question.toLowerCase().includes('desde'))
    .map(r => r.answer)
    .join('. ')

  const intensity = responses
    .filter(r => r.question.toLowerCase().includes('intens') || r.question.toLowerCase().includes('escala'))
    .map(r => r.answer)
    .join('. ')

  const antecedents = responses
    .filter(r => r.question.toLowerCase().includes('antecedente') || r.question.toLowerCase().includes('enfermedad'))
    .map(r => r.answer)
    .join('. ')

  const medications = responses
    .filter(r => r.question.toLowerCase().includes('medicamento') || r.question.toLowerCase().includes('toma'))
    .map(r => r.answer)
    .join('. ')

  // Build all responses text
  const allResponses = responses.map(r => `${r.question} ${r.answer}`).join('. ')

  const subjective = [
    `Paciente refiere: ${symptoms || allResponses}.`,
    duration ? `Tiempo de evolución: ${duration}.` : '',
    intensity ? `Intensidad: ${intensity}/10.` : '',
    patientHistory ? `Antecedentes relevantes: ${patientHistory}.` : '',
  ].filter(Boolean).join(' ')

  const objective = 'Pendiente exploración física. Signos vitales por documentar.'

  const assessment = `SUGERIDO: Pendiente evaluación clínica para diagnóstico definitivo.${antecedents ? ` Considerar antecedentes de: ${antecedents}.` : ''}`

  const plan = [
    'SUGERIDO: Pendiente evaluación clínica para definir plan de acción.',
    medications ? `Nota: Paciente actualmente toma ${medications}.` : '',
    'Requiere valoración física completa.',
  ].filter(Boolean).join(' ')

  return { subjective, objective, assessment, plan }
}

export async function POST(req: NextRequest) {
  try {
    const {
      patientId, clinicId, doctorId, appointmentId,
      specialty, preConsultaResponses, patientHistory,
    } = await req.json()

    if (!patientId || !clinicId || !preConsultaResponses) {
      return NextResponse.json(
        { error: 'patientId, clinicId y preConsultaResponses son requeridos' },
        { status: 400 }
      )
    }

    const responses = Array.isArray(preConsultaResponses)
      ? preConsultaResponses.map((r: { question: string; answer: string }) => ({ question: r.question, answer: r.answer }))
      : []

    let result: { subjective: string; objective: string; assessment: string; plan: string }
    let aiGenerated = false

    try {
      // Try AI generation first
      const zai = await createZAI()
      const responsesText = responses.map(r => `P: ${r.question}\nR: ${r.answer}`).join('\n')
      const historyText = patientHistory ? `\n\nAntecedentes del paciente: ${patientHistory}` : ''

      const systemPrompt = `Eres un asistente clinico para un medico de ${specialty || 'salud general'} en Mexico.
Con base en las respuestas de pre-consulta del paciente, genera una nota SOAP preliminar.

S: Sintomas y motivo de consulta del paciente (basado en sus respuestas)
O: Hallazgos objetivos si los hay, o 'Pendiente exploracion fisica'
A: Diagnosticos diferenciales sugeridos (marcar como SUGERIDO, no definitivo)
P: Plan sugerido (marcar como SUGERIDO, requiere aprobacion del medico)

Se preciso y profesional. Sin emojis. Terminologia medica en espanol.
Responde SOLO con un objeto JSON con las claves: subjective, objective, assessment, plan. Sin texto adicional fuera del JSON.`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Genera una nota SOAP preliminar basada en estas respuestas de pre-consulta:\n\n${responsesText}${historyText}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 1000,
      })

      const responseText = completion.choices[0]?.message?.content || '{}'

      let soapData: Record<string, string> = {}
      try {
        const cleanResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        soapData = JSON.parse(cleanResponse)
      } catch {
        const sections = ['subjective', 'objective', 'assessment', 'plan']
        sections.forEach((section) => {
          const regex = new RegExp(`"${section}"\\s*:\\s*"([^"]*)"`, 'i')
          const match = responseText.match(regex)
          if (match) {
            soapData[section] = match[1]
          }
        })
      }

      result = {
        subjective: soapData.subjective || '',
        objective: soapData.objective || '',
        assessment: soapData.assessment || '',
        plan: soapData.plan || '',
      }

      // If AI returned empty content, fall back to template
      if (!result.subjective) {
        result = generateTemplateSOAP(responses, specialty || '', patientHistory)
      } else {
        aiGenerated = true
      }
    } catch (aiError) {
      // AI failed — fall back to template-based generation
      console.error('AI generation failed, using template:', aiError instanceof Error ? aiError.message : aiError)
      result = generateTemplateSOAP(responses, specialty || '', patientHistory)
    }

    // Save to DB
    let soapNoteId: string | null = null

    if (db && clinicId && patientId) {
      let resolvedDoctorId = doctorId
      if (!resolvedDoctorId) {
        const firstDoctor = await db.doctor.findFirst({
          where: { clinicId, isActive: true },
          select: { id: true },
        })
        resolvedDoctorId = firstDoctor?.id || ''
      }
      try {
        if (appointmentId) {
          const existing = await db.soapNote.findUnique({
            where: { appointmentId },
          })

          if (existing) {
            await db.soapNote.update({
              where: { id: existing.id },
              data: {
                subjective: result.subjective,
                objective: result.objective,
                assessment: result.assessment,
                plan: result.plan,
                aiGenerated,
                aiSuggested: true,
              },
            })
            soapNoteId = existing.id
          }
        }

        if (!soapNoteId) {
          const soapNote = await db.soapNote.create({
            data: {
              clinicId,
              patientId,
              doctorId: resolvedDoctorId,
              appointmentId: appointmentId || null,
              subjective: result.subjective,
              objective: result.objective,
              assessment: result.assessment,
              plan: result.plan,
              aiGenerated,
              aiSuggested: true,
              doctorApproved: false,
            },
          })
          soapNoteId = soapNote.id
        }
      } catch (dbError) {
        console.error('Failed to save SOAP note to DB:', dbError)
      }
    }

    return NextResponse.json({
      ...result,
      ...(soapNoteId ? { soapNoteId } : {}),
      ...(aiGenerated ? {} : { aiFallback: true }),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('SOAP error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
