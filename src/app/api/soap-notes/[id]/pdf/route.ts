import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import path from 'path'
import fs from 'fs'
import { db } from '@/lib/db'

// Color helpers — hex to pdf-lib rgb (0-1 range)
function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  return rgb(
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  )
}

const COLORS = {
  primary: hexToRgb('#534AB7'),
  green: hexToRgb('#1D9E75'),
  darkText: hexToRgb('#2C2C2A'),
  mutedText: hexToRgb('#888780'),
  border: hexToRgb('#E1F5EE'),
  white: rgb(1, 1, 1),
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
    }

    const { id } = await params

    // Get timezone from query param (client sends their local timezone)
    const url = new URL(req.url)
    const timezone = url.searchParams.get('tz') || 'America/Hermosillo'

    const soapNote = await db.soapNote.findUnique({
      where: { id },
      include: { clinic: true, patient: true, doctor: true, appointment: true },
    })

    if (!soapNote) {
      return NextResponse.json({ error: 'Nota SOAP no encontrada' }, { status: 404 })
    }

    // ── Create PDF ─────────────────────────────────────────
    const pdfDoc = await PDFDocument.create()
    pdfDoc.setTitle(`Nota SOAP - ${soapNote.patient.fullName}`)
    pdfDoc.setAuthor(soapNote.doctor.name)
    pdfDoc.setSubject('Nota SOAP')
    pdfDoc.setCreator('Sinap')

    // Register fontkit for custom font embedding
    pdfDoc.registerFontkit(fontkit as unknown as Parameters<typeof pdfDoc.registerFontkit>[0])

    // Load fonts — try custom Liberation Sans, fall back to standard Helvetica
    let fontRegular: Awaited<ReturnType<typeof pdfDoc.embedFont>>
    let fontBold: Awaited<ReturnType<typeof pdfDoc.embedFont>>
    let fontItalic: Awaited<ReturnType<typeof pdfDoc.embedFont>>

    try {
      const fontsDir = path.join(process.cwd(), 'src/lib/fonts')
      const regularBytes = fs.readFileSync(path.join(fontsDir, 'LiberationSans-Regular.ttf'))
      const boldBytes = fs.readFileSync(path.join(fontsDir, 'LiberationSans-Bold.ttf'))
      const italicBytes = fs.readFileSync(path.join(fontsDir, 'LiberationSans-Italic.ttf'))

      fontRegular = await pdfDoc.embedFont(regularBytes)
      fontBold = await pdfDoc.embedFont(boldBytes)
      fontItalic = await pdfDoc.embedFont(italicBytes)
    } catch {
      // Fallback to standard fonts if TTF files unavailable
      fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
      fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
    }

    // ── Page setup ─────────────────────────────────────────
    const pageWidth = 612 // Letter
    const pageHeight = 792
    const marginLeft = 55
    const marginRight = 55
    const marginTop = 50
    const marginBottom = 50
    const contentWidth = pageWidth - marginLeft - marginRight

    let page = pdfDoc.addPage([pageWidth, pageHeight])
    let y = pageHeight - marginTop

    // Helper: draw text, return new Y position
    function drawText(
      text: string,
      x: number,
      currentY: number,
      font: typeof fontRegular,
      size: number,
      color: ReturnType<typeof rgb>,
      options?: { maxWidth?: number; align?: 'left' | 'center' | 'right' }
    ): number {
      const maxWidth = options?.maxWidth || contentWidth - (x - marginLeft)
      const textWidth = font.widthOfTextAtSize(text, size)
      const lineHeight = size * 1.35

      // Word wrap if needed
      if (textWidth <= maxWidth) {
        let drawX = x
        if (options?.align === 'center') {
          drawX = x + (maxWidth - textWidth) / 2
        } else if (options?.align === 'right') {
          drawX = x + maxWidth - textWidth
        }
        page.drawText(text, { x: drawX, y: currentY, size, font, color })
        return currentY - lineHeight
      }

      // Wrap text manually
      const words = text.split(' ')
      const lines: string[] = []
      let currentLine = ''

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const testWidth = font.widthOfTextAtSize(testLine, size)
        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) lines.push(currentLine)

      for (const line of lines) {
        let drawX = x
        if (options?.align === 'center') {
          const lw = font.widthOfTextAtSize(line, size)
          drawX = x + (maxWidth - lw) / 2
        }
        page.drawText(line, { x: drawX, y: currentY, size, font, color })
        currentY -= lineHeight
      }
      return currentY
    }

    // Helper: draw a line
    function drawLine(x1: number, y1: number, x2: number, y2: number, color: ReturnType<typeof rgb>, thickness = 1) {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color })
    }

    // Helper: draw a rectangle
    function drawRect(x: number, ry: number, width: number, height: number, color: ReturnType<typeof rgb>) {
      page.drawRectangle({ x, y: ry, width, height, color })
    }

    // Helper: check page overflow, add new page if needed
    function ensureSpace(needed: number): void {
      if (y - needed < marginBottom) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - marginTop
      }
    }

    // ── HEADER ──────────────────────────────────────────────
    y = drawText(soapNote.clinic.name, marginLeft, y, fontBold, 16, COLORS.primary)

    // Clinic details
    const clinicDetails: string[] = []
    if (soapNote.clinic.phone) clinicDetails.push(`Tel: ${soapNote.clinic.phone}`)
    if (soapNote.clinic.email) clinicDetails.push(soapNote.clinic.email)
    if (soapNote.clinic.address) clinicDetails.push(soapNote.clinic.address)
    if (soapNote.clinic.city || soapNote.clinic.state) {
      clinicDetails.push([soapNote.clinic.city, soapNote.clinic.state].filter(Boolean).join(', '))
    }
    if (clinicDetails.length > 0) {
      y = drawText(clinicDetails.join('  |  '), marginLeft, y, fontRegular, 8, COLORS.mutedText)
    }

    // Separator
    y -= 8
    drawLine(marginLeft, y, pageWidth - marginRight, y, COLORS.border, 1.5)
    y -= 12

    // ── TITLE ───────────────────────────────────────────────
    y = drawText('Nota SOAP', marginLeft, y, fontBold, 14, COLORS.darkText, { maxWidth: contentWidth, align: 'center' })
    y -= 8

    // ── PATIENT & DOCTOR INFO ───────────────────────────────
    const colWidth = contentWidth / 2
    const leftX = marginLeft
    const rightX = marginLeft + colWidth + 10
    const infoStartY = y

    // Patient column
    drawText('PACIENTE', leftX, y, fontBold, 8, COLORS.primary)
    y = drawText(soapNote.patient.fullName, leftX, y - 12, fontRegular, 9, COLORS.darkText)
    if (soapNote.patient.phone) {
      y = drawText(`Tel: ${soapNote.patient.phone}`, leftX, y, fontRegular, 8, COLORS.darkText)
    }
    if (soapNote.patient.email) {
      y = drawText(soapNote.patient.email, leftX, y, fontRegular, 8, COLORS.darkText)
    }
    if (soapNote.patient.birthDate) {
      const age = Math.floor(
        (Date.now() - new Date(soapNote.patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      )
      y = drawText(`Edad: ${age} anos`, leftX, y, fontRegular, 8, COLORS.darkText)
    }

    // Doctor column
    let doctorY = infoStartY
    drawText('MEDICO', rightX, doctorY, fontBold, 8, COLORS.primary, { maxWidth: colWidth - 10 })
    doctorY = drawText(soapNote.doctor.name, rightX, doctorY - 12, fontRegular, 9, COLORS.darkText, { maxWidth: colWidth - 10 })
    if (soapNote.doctor.specialty) {
      doctorY = drawText(`Especialidad: ${soapNote.doctor.specialty}`, rightX, doctorY, fontRegular, 8, COLORS.darkText, { maxWidth: colWidth - 10 })
    }
    if (soapNote.doctor.license) {
      doctorY = drawText(`Cedula: ${soapNote.doctor.license}`, rightX, doctorY, fontRegular, 8, COLORS.darkText, { maxWidth: colWidth - 10 })
    }

    // Use the lower Y from both columns
    y = Math.min(y, doctorY)
    y -= 5

    // Date line
    const dateStr = `Fecha: ${new Date(soapNote.createdAt).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric', timeZone: timezone,
    })}    Hora: ${new Date(soapNote.createdAt).toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit', timeZone: timezone,
    })}`
    y = drawText(dateStr, marginLeft, y, fontRegular, 8, COLORS.mutedText)

    // Separator
    y -= 8
    drawLine(marginLeft, y, pageWidth - marginRight, y, COLORS.border, 1)
    y -= 12

    // ── SOAP SECTIONS ───────────────────────────────────────
    const sections = [
      { label: 'S - Subjetivo', color: COLORS.green, content: soapNote.subjective },
      { label: 'O - Objetivo', color: COLORS.green, content: soapNote.objective },
      { label: 'A - Assessment', color: COLORS.primary, content: soapNote.assessment },
      { label: 'P - Plan', color: COLORS.primary, content: soapNote.plan },
    ]

    for (const section of sections) {
      ensureSpace(80)

      // Colored left border bar
      drawRect(marginLeft, y - 4, 4, 18, section.color)

      // Section title
      drawText(section.label, marginLeft + 12, y, fontBold, 10, section.color)
      y -= 20

      // Section content
      const contentText = section.content || '(Sin informacion)'
      const contentLines = wrapText(contentText, fontRegular, 9.5, contentWidth - 12)

      for (const line of contentLines) {
        ensureSpace(15)
        y = drawText(line, marginLeft + 12, y, fontRegular, 9.5, COLORS.darkText, { maxWidth: contentWidth - 12 })
      }

      y -= 12
    }

    // ── SIGNATURE AREA ──────────────────────────────────────
    ensureSpace(100)
    y -= 15

    drawLine(marginLeft, y, pageWidth - marginRight, y, COLORS.border, 1)
    y -= 15

    if (soapNote.doctorApproved && soapNote.doctorSignedAt) {
      y = drawText('Nota aprobada y firmada', marginLeft, y, fontBold, 9, COLORS.primary)
      const signDate = `Dr. ${soapNote.doctor.name} - ${new Date(soapNote.doctorSignedAt).toLocaleString('es-MX', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: timezone,
      })}`
      y = drawText(signDate, marginLeft, y, fontRegular, 8, COLORS.darkText)
      if (soapNote.doctor.license) {
        y = drawText(`Cedula profesional: ${soapNote.doctor.license}`, marginLeft, y, fontRegular, 8, COLORS.darkText)
      }
    } else {
      y = drawText('Borrador - Sin firma', marginLeft, y, fontItalic, 8, COLORS.mutedText)
      y -= 30

      // Signature line
      drawLine(marginLeft + 100, y, marginLeft + 300, y, COLORS.darkText, 0.5)
      y -= 12
      drawText('Firma del Medico', marginLeft + 140, y, fontRegular, 8, COLORS.darkText)
    }

    // ── FOOTER ──────────────────────────────────────────────
    y -= 30
    drawText(
      `Generado por Sinap | ${new Date().toLocaleDateString('es-MX', { timeZone: timezone })} | Documento confidencial`,
      marginLeft, y, fontRegular, 7, COLORS.mutedText,
      { maxWidth: contentWidth, align: 'center' }
    )

    // ── Return PDF ──────────────────────────────────────────
    const pdfBytes = await pdfDoc.save()

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="SOAP_${soapNote.patient.fullName.replace(/\s+/g, '_')}_${new Date(soapNote.createdAt).toISOString().slice(0, 10)}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('SOAP PDF generation error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Word-wrap helper for long text
function wrapText(text: string, font: { widthOfTextAtSize: (text: string, size: number) => number }, size: number, maxWidth: number): string[] {
  const paragraphs = text.split('\n')
  const result: string[] = []

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      result.push('')
      continue
    }

    const words = paragraph.split(/\s+/)
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = font.widthOfTextAtSize(testLine, size)

      if (testWidth > maxWidth && currentLine) {
        result.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) result.push(currentLine)
  }

  return result
}
