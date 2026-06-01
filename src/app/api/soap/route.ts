import ZAI from 'z-ai-web-dev-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

    const zai = await ZAI.create()

    const responsesText = Array.isArray(preConsultaResponses)
      ? preConsultaResponses.map((r: { question: string; answer: string }) => `P: ${r.question}\nR: ${r.answer}`).join('\n')
      : String(preConsultaResponses)

    const historyText = patientHistory
      ? `\n\nAntecedentes del paciente: ${patientHistory}`
      : ''

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
      // Fallback: try to extract sections manually
      const sections = ['subjective', 'objective', 'assessment', 'plan']
      sections.forEach((section) => {
        const regex = new RegExp(`"${section}"\\s*:\\s*"([^"]*)"`, 'i')
        const match = responseText.match(regex)
        if (match) {
          soapData[section] = match[1]
        }
      })

      // If still no data, use response as subjective
      if (Object.keys(soapData).length === 0) {
        soapData = {
          subjective: responseText,
          objective: 'Pendiente exploracion fisica.',
          assessment: 'SUGERIDO: Pendiente evaluacion clinica.',
          plan: 'SUGERIDO: Pendiente evaluacion clinica para definir plan de accion.',
        }
      }
    }

    // Ensure all SOAP sections exist
    const result = {
      subjective: soapData.subjective || 'No se proporcionaron datos subjetivos.',
      objective: soapData.objective || 'Pendiente exploracion fisica.',
      assessment: soapData.assessment || 'SUGERIDO: Pendiente evaluacion clinica.',
      plan: soapData.plan || 'SUGERIDO: Pendiente evaluacion clinica para definir plan de accion.',
    }

    // Save to DB if clinicId, patientId, and doctorId are provided
    let soapNoteId: string | null = null

    if (db && clinicId && patientId && doctorId) {
      try {
        // If appointmentId provided and a SoapNote already exists, UPDATE it
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
                aiGenerated: true,
                aiSuggested: true,
              },
            })
            soapNoteId = existing.id
          }
        }

        // If no existing note found, CREATE a new one
        if (!soapNoteId) {
          const soapNote = await db.soapNote.create({
            data: {
              clinicId,
              patientId,
              doctorId,
              appointmentId: appointmentId || null,
              subjective: result.subjective,
              objective: result.objective,
              assessment: result.assessment,
              plan: result.plan,
              aiGenerated: true,
              aiSuggested: true,
              doctorApproved: false,
            },
          })
          soapNoteId = soapNote.id
        }
      } catch (dbError) {
        console.error('Failed to save SOAP note to DB:', dbError)
        // Don't fail the whole request if DB save fails
      }
    }

    return NextResponse.json({
      ...result,
      ...(soapNoteId ? { soapNoteId } : {}),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('SOAP error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
