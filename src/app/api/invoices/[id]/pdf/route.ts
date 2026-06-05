import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { db } from '@/lib/db'
import { readFile } from 'fs/promises'
import path from 'path'

// SAT catalog labels
const FORMA_PAGO_LABELS: Record<string, string> = {
  '01': 'Efectivo',
  '03': 'Transferencia electrónica de fondos',
  '04': 'Tarjeta de crédito',
  '05': 'Monedero electrónico',
  '06': 'Dinero electrónico',
  '08': 'Vales de despensa',
  '28': 'Tarjeta de débito',
  '29': 'Tarjeta de servicios',
  '99': 'Por definir',
}

const METODO_PAGO_LABELS: Record<string, string> = {
  'PUE': 'Pago en una sola exhibición',
  'PPD': 'Pago en parcialidades o diferido',
}

const USO_CFDI_LABELS: Record<string, string> = {
  'G01': 'Adquisición de mercancías',
  'G02': 'Devolución, descuento o bonificación',
  'G03': 'Gastos en general',
  'D01': 'Honorarios médicos, dentales y gastos hospitalarios',
  'D02': 'Gastos médicos por incapacidad',
  'P01': 'Por definir',
}

const REGIMEN_FISCAL_LABELS: Record<string, string> = {
  '601': 'General de Ley Personas Morales',
  '603': 'Personas Morales con Fines no Lucrativos',
  '612': 'Actividad Empresarial y Profesional',
  '621': 'Incorporación Fiscal',
  '626': 'Régimen Simplificado de Confianza',
}

const TIPO_COMPROBANTE_LABELS: Record<string, string> = {
  'I': 'Ingreso',
  'E': 'Egreso',
  'T': 'Traslado',
  'N': 'Nómina',
  'P': 'Pago',
}

// Colors
const GREEN = rgb(0.114, 0.62, 0.459)   // #1D9E75
const DARK = rgb(0.173, 0.173, 0.165)    // #2C2C2A
const GRAY = rgb(0.533, 0.529, 0.502)    // #888780
const LIGHT_BG = rgb(0.945, 0.937, 0.91) // #F1EFE8
const WHITE = rgb(1, 1, 1)
const BORDER = rgb(0.882, 0.871, 0.839)  // #E1DFD6
const PURPLE = rgb(0.325, 0.29, 0.718)   // #534AB7

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

async function getFontBytes(fontName: string): Promise<Uint8Array> {
  const fontsDir = path.join(process.cwd(), 'src', 'lib', 'fonts')
  const fontPath = path.join(fontsDir, fontName)
  const buffer = await readFile(fontPath)
  return new Uint8Array(buffer)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
    }

    // Fetch invoice with relations
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        clinic: {
          select: {
            name: true,
            rfc: true,
            regimenFiscal: true,
            address: true,
            city: true,
            state: true,
            phone: true,
            email: true,
          },
        },
        patient: {
          select: {
            fullName: true,
            rfc: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        appointment: {
          select: {
            date: true,
            startTime: true,
            doctor: { select: { name: true } },
            service: { select: { name: true } },
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    // Load fonts
    const regularFontBytes = await getFontBytes('LiberationSans-Regular.ttf')
    const boldFontBytes = await getFontBytes('LiberationSans-Bold.ttf')

    // Create PDF
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)

    const regularFont = await pdfDoc.embedFont(regularFontBytes)
    const boldFont = await pdfDoc.embedFont(boldFontBytes)

    const page = pdfDoc.addPage([612, 792]) // Letter size
    const { width, height } = page.getSize()

    const margin = 40
    const contentWidth = width - (margin * 2)
    let y = height - margin

    // ─── HEADER BAR ────────────────────────────────────────
    page.drawRectangle({
      x: margin,
      y: y - 60,
      width: contentWidth,
      height: 60,
      color: GREEN,
    })

    // Clinic name
    page.drawText(invoice.clinic.name || 'Clínica', {
      x: margin + 15,
      y: y - 25,
      size: 18,
      font: boldFont,
      color: WHITE,
    })

    // RFC
    page.drawText(`RFC: ${invoice.clinic.rfc || 'N/A'}`, {
      x: margin + 15,
      y: y - 45,
      size: 10,
      font: regularFont,
      color: WHITE,
    })

    // CFDI title on right side
    const tipoLabel = TIPO_COMPROBANTE_LABELS[invoice.tipoComprobante] || 'Ingreso'
    page.drawText('CFDI 4.0', {
      x: width - margin - 120,
      y: y - 25,
      size: 16,
      font: boldFont,
      color: WHITE,
    })
    page.drawText(`Comprobante de ${tipoLabel}`, {
      x: width - margin - 170,
      y: y - 45,
      size: 9,
      font: regularFont,
      color: WHITE,
    })

    y -= 60

    // ─── INVOICE INFO SECTION ──────────────────────────────
    y -= 15
    page.drawRectangle({
      x: margin,
      y: y - 68,
      width: contentWidth,
      height: 68,
      color: LIGHT_BG,
    })

    const infoCol1X = margin + 12
    const infoCol2X = margin + 200
    const infoCol3X = margin + 380

    // Row 1
    page.drawText('Serie y Folio:', { x: infoCol1X, y: y - 15, size: 7.5, font: regularFont, color: GRAY })
    page.drawText(`${invoice.serie || 'A'}-${invoice.folio || invoice.id.slice(-6).toUpperCase()}`, { x: infoCol1X, y: y - 27, size: 10, font: boldFont, color: DARK })

    page.drawText('UUID:', { x: infoCol2X, y: y - 15, size: 7.5, font: regularFont, color: GRAY })
    const uuidText = invoice.cfdiUuid || 'Pendiente'
    const uuidSize = uuidText.length > 30 ? 7.5 : 9
    page.drawText(uuidText, { x: infoCol2X, y: y - 27, size: uuidSize, font: boldFont, color: PURPLE })

    page.drawText('Fecha de Timbrado:', { x: infoCol3X, y: y - 15, size: 7.5, font: regularFont, color: GRAY })
    page.drawText(formatDateTime(invoice.fechaTimbrado || invoice.createdAt), { x: infoCol3X, y: y - 27, size: 9, font: boldFont, color: DARK })

    // Row 2
    page.drawText('Forma de Pago:', { x: infoCol1X, y: y - 43, size: 7.5, font: regularFont, color: GRAY })
    page.drawText(`${invoice.formaPago} - ${FORMA_PAGO_LABELS[invoice.formaPago] || 'No especificada'}`, { x: infoCol1X, y: y - 55, size: 9, font: boldFont, color: DARK })

    page.drawText('Método de Pago:', { x: infoCol2X, y: y - 43, size: 7.5, font: regularFont, color: GRAY })
    page.drawText(`${invoice.metodoPago} - ${METODO_PAGO_LABELS[invoice.metodoPago] || 'No especificado'}`, { x: infoCol2X, y: y - 55, size: 9, font: boldFont, color: DARK })

    page.drawText('Uso CFDI:', { x: infoCol3X, y: y - 43, size: 7.5, font: regularFont, color: GRAY })
    page.drawText(`${invoice.usoCFDI} - ${USO_CFDI_LABELS[invoice.usoCFDI] || 'No especificado'}`, { x: infoCol3X, y: y - 55, size: 9, font: boldFont, color: DARK })

    y -= 68

    // ─── EMISOR / RECEPTOR SECTION ─────────────────────────
    y -= 15

    // Emisor box
    const boxHeight = 72
    const halfWidth = (contentWidth - 10) / 2

    // Emisor
    page.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: halfWidth,
      height: boxHeight,
      borderColor: BORDER,
      borderWidth: 0.5,
      color: WHITE,
    })
    page.drawRectangle({
      x: margin,
      y: y - 14,
      width: halfWidth,
      height: 14,
      color: GREEN,
    })
    page.drawText('EMISOR', { x: margin + 8, y: y - 11, size: 8, font: boldFont, color: WHITE })

    page.drawText(invoice.clinic.name || 'N/A', { x: margin + 8, y: y - 28, size: 9, font: boldFont, color: DARK })
    page.drawText(`RFC: ${invoice.clinic.rfc || 'N/A'}`, { x: margin + 8, y: y - 40, size: 8, font: regularFont, color: GRAY })
    const regimenLabel = REGIMEN_FISCAL_LABELS[invoice.clinic.regimenFiscal || ''] || invoice.clinic.regimenFiscal || 'N/A'
    page.drawText(`Régimen Fiscal: ${invoice.clinic.regimenFiscal || 'N/A'} - ${regimenLabel}`, { x: margin + 8, y: y - 52, size: 7.5, font: regularFont, color: GRAY })
    if (invoice.clinic.address) {
      page.drawText(invoice.clinic.address, { x: margin + 8, y: y - 64, size: 7.5, font: regularFont, color: GRAY })
    }

    // Receptor
    const receptorX = margin + halfWidth + 10
    page.drawRectangle({
      x: receptorX,
      y: y - boxHeight,
      width: halfWidth,
      height: boxHeight,
      borderColor: BORDER,
      borderWidth: 0.5,
      color: WHITE,
    })
    page.drawRectangle({
      x: receptorX,
      y: y - 14,
      width: halfWidth,
      height: 14,
      color: PURPLE,
    })
    page.drawText('RECEPTOR', { x: receptorX + 8, y: y - 11, size: 8, font: boldFont, color: WHITE })

    page.drawText(invoice.patient.fullName || 'N/A', { x: receptorX + 8, y: y - 28, size: 9, font: boldFont, color: DARK })
    page.drawText(`RFC: ${invoice.patient.rfc || 'XAXX010101000'}`, { x: receptorX + 8, y: y - 40, size: 8, font: regularFont, color: GRAY })
    page.drawText(`Uso CFDI: ${invoice.usoCFDI}`, { x: receptorX + 8, y: y - 52, size: 7.5, font: regularFont, color: GRAY })
    if (invoice.patient.email) {
      page.drawText(invoice.patient.email, { x: receptorX + 8, y: y - 64, size: 7.5, font: regularFont, color: GRAY })
    }

    y -= boxHeight

    // ─── CONCEPTOS TABLE ───────────────────────────────────
    y -= 20

    // Table header
    const tableCols = {
      qty: { x: margin, width: 40 },
      unit: { x: margin + 40, width: 50 },
      description: { x: margin + 90, width: 220 },
      unitPrice: { x: margin + 310, width: 90 },
      discount: { x: margin + 400, width: 70 },
      amount: { x: margin + 470, width: 102 },
    }
    const rowHeight = 22
    const headerHeight = 20

    // Header row
    page.drawRectangle({
      x: margin,
      y: y - headerHeight,
      width: contentWidth,
      height: headerHeight,
      color: DARK,
    })
    page.drawText('Cant.', { x: tableCols.qty.x + 4, y: y - 14, size: 7.5, font: boldFont, color: WHITE })
    page.drawText('Unidad', { x: tableCols.unit.x + 4, y: y - 14, size: 7.5, font: boldFont, color: WHITE })
    page.drawText('Descripción', { x: tableCols.description.x + 4, y: y - 14, size: 7.5, font: boldFont, color: WHITE })
    page.drawText('P. Unitario', { x: tableCols.unitPrice.x + 4, y: y - 14, size: 7.5, font: boldFont, color: WHITE })
    page.drawText('Descuento', { x: tableCols.discount.x + 4, y: y - 14, size: 7.5, font: boldFont, color: WHITE })
    page.drawText('Importe', { x: tableCols.amount.x + 4, y: y - 14, size: 7.5, font: boldFont, color: WHITE })

    y -= headerHeight

    // Data row
    page.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: contentWidth,
      height: rowHeight,
      borderColor: BORDER,
      borderWidth: 0.5,
      color: WHITE,
    })

    const conceptText = invoice.concepto || 'Servicio médico'
    // Truncate description if too long
    const maxDescWidth = tableCols.description.width - 10
    let descToDraw = conceptText
    if (regularFont.widthOfTextAtSize(descToDraw, 8.5) > maxDescWidth) {
      while (regularFont.widthOfTextAtSize(descToDraw + '...', 8.5) > maxDescWidth && descToDraw.length > 0) {
        descToDraw = descToDraw.slice(0, -1)
      }
      descToDraw += '...'
    }

    page.drawText('1', { x: tableCols.qty.x + 4, y: y - 15, size: 8.5, font: regularFont, color: DARK })
    page.drawText('Servicio', { x: tableCols.unit.x + 4, y: y - 15, size: 8.5, font: regularFont, color: DARK })
    page.drawText(descToDraw, { x: tableCols.description.x + 4, y: y - 15, size: 8.5, font: regularFont, color: DARK })
    page.drawText(formatCurrency(invoice.subtotal), { x: tableCols.unitPrice.x + 4, y: y - 15, size: 8.5, font: regularFont, color: DARK })
    page.drawText('$0.00', { x: tableCols.discount.x + 4, y: y - 15, size: 8.5, font: regularFont, color: DARK })
    page.drawText(formatCurrency(invoice.subtotal), { x: tableCols.amount.x + 4, y: y - 15, size: 8.5, font: regularFont, color: DARK })

    y -= rowHeight

    // If description was truncated, add second line
    if (conceptText.length > descToDraw.length - 3) {
      const remaining = conceptText.slice(descToDraw.length - 3)
      if (remaining.length > 0) {
        let remainingDraw = remaining
        if (regularFont.widthOfTextAtSize(remainingDraw, 7.5) > maxDescWidth) {
          while (regularFont.widthOfTextAtSize(remainingDraw + '...', 7.5) > maxDescWidth && remainingDraw.length > 0) {
            remainingDraw = remainingDraw.slice(0, -1)
          }
          remainingDraw += '...'
        }
        page.drawRectangle({
          x: margin,
          y: y - 16,
          width: contentWidth,
          height: 16,
          borderColor: BORDER,
          borderWidth: 0.5,
          color: WHITE,
        })
        page.drawText(remainingDraw, { x: tableCols.description.x + 4, y: y - 11, size: 7.5, font: regularFont, color: GRAY })
        y -= 16
      }
    }

    // ─── TOTALS SECTION ────────────────────────────────────
    y -= 15

    const totalsWidth = 220
    const totalsX = width - margin - totalsWidth

    // Subtotal
    page.drawText('Subtotal:', { x: totalsX, y: y - 12, size: 9, font: regularFont, color: GRAY })
    page.drawText(formatCurrency(invoice.subtotal), { x: totalsX + 130, y: y - 12, size: 9, font: boldFont, color: DARK })
    y -= 18

    // IVA
    const ivaLabel = invoice.ivaRate > 0 ? `IVA (${(invoice.ivaRate * 100).toFixed(0)}%):` : 'IVA (Exento):'
    page.drawText(ivaLabel, { x: totalsX, y: y - 12, size: 9, font: regularFont, color: GRAY })
    page.drawText(formatCurrency(invoice.iva), { x: totalsX + 130, y: y - 12, size: 9, font: boldFont, color: DARK })
    y -= 18

    // Total
    page.drawRectangle({
      x: totalsX - 10,
      y: y - 22,
      width: totalsWidth + 10,
      height: 22,
      color: GREEN,
    })
    page.drawText('TOTAL:', { x: totalsX, y: y - 15, size: 11, font: boldFont, color: WHITE })
    page.drawText(formatCurrency(invoice.total), { x: totalsX + 130, y: y - 15, size: 11, font: boldFont, color: WHITE })
    y -= 22

    // Currency
    y -= 8
    page.drawText(`Moneda: ${invoice.currency || 'MXN'}`, { x: totalsX, y: y - 10, size: 7.5, font: regularFont, color: GRAY })
    y -= 15

    // ─── CANCELLED WATERMARK ───────────────────────────────
    if (invoice.status === 'cancelled') {
      y -= 10
      page.drawRectangle({
        x: margin,
        y: y - 22,
        width: contentWidth,
        height: 22,
        color: rgb(0.898, 0.259, 0.259), // Red
      })
      page.drawText('CANCELADO — Este CFDI ha sido cancelado ante el SAT', {
        x: margin + 15,
        y: y - 15,
        size: 9,
        font: boldFont,
        color: WHITE,
      })
      y -= 22
    }

    // ─── TIMBRE FISCAL DIGITAL ─────────────────────────────
    y -= 15
    page.drawRectangle({
      x: margin,
      y: y - 14,
      width: contentWidth,
      height: 14,
      color: LIGHT_BG,
    })
    page.drawText('TIMBRE FISCAL DIGITAL — SAT', { x: margin + 8, y: y - 11, size: 8, font: boldFont, color: DARK })
    y -= 14

    page.drawRectangle({
      x: margin,
      y: y - 68,
      width: contentWidth,
      height: 68,
      borderColor: BORDER,
      borderWidth: 0.5,
      color: WHITE,
    })

    page.drawText('UUID:', { x: margin + 8, y: y - 14, size: 7.5, font: boldFont, color: GRAY })
    page.drawText(invoice.cfdiUuid || 'N/A', { x: margin + 35, y: y - 14, size: 7.5, font: regularFont, color: DARK })

    page.drawText('Fecha Timbrado:', { x: margin + 8, y: y - 27, size: 7.5, font: boldFont, color: GRAY })
    page.drawText(formatDateTime(invoice.fechaTimbrado || invoice.createdAt), { x: margin + 88, y: y - 27, size: 7.5, font: regularFont, color: DARK })

    page.drawText('No. Certificado SAT:', { x: margin + 8, y: y - 40, size: 7.5, font: boldFont, color: GRAY })
    page.drawText('00001000000000000000', { x: margin + 105, y: y - 40, size: 7.5, font: regularFont, color: DARK })

    page.drawText('Sello CFDI:', { x: margin + 8, y: y - 53, size: 7.5, font: boldFont, color: GRAY })
    page.drawText('(Sello digital del CFDI)', { x: margin + 55, y: y - 53, size: 7.5, font: regularFont, color: GRAY })

    page.drawText('Sello SAT:', { x: margin + 8, y: y - 63, size: 7.5, font: boldFont, color: GRAY })
    page.drawText('(Sello digital del SAT)', { x: margin + 50, y: y - 63, size: 7.5, font: regularFont, color: GRAY })

    y -= 68

    // ─── FOOTER ────────────────────────────────────────────
    y -= 20
    page.drawText('Este documento es una representación impresa de un CFDI', {
      x: margin,
      y: y - 10,
      size: 7,
      font: regularFont,
      color: GRAY,
    })

    const serieFolio = `${invoice.serie || 'A'}-${invoice.folio || invoice.id.slice(-6).toUpperCase()}`
    page.drawText(`Generado por Sinap — ${serieFolio} — ${formatDate(new Date())}`, {
      x: margin,
      y: y - 22,
      size: 7,
      font: regularFont,
      color: GRAY,
    })

    // ─── SERIALIZE AND RETURN ──────────────────────────────
    const pdfBytes = await pdfDoc.save()

    const filename = `CFDI_${serieFolio}_${(invoice.cfdiUuid || 'pending').slice(0, 8)}.pdf`

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
