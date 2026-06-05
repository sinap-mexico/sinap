import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatISODate(date: Date | string | null): string {
  if (!date) return new Date().toISOString().replace('Z', '')
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().replace('Z', '')
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
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    if (!invoice.cfdiUuid) {
      return NextResponse.json({ error: 'Esta factura no tiene CFDI UUID. No se puede generar el XML.' }, { status: 400 })
    }

    // Build CFDI 4.0 XML
    const fechaComprobante = formatISODate(invoice.createdAt)
    const fechaTimbrado = formatISODate(invoice.fechaTimbrado || invoice.createdAt)

    const ivaFactor = invoice.ivaRate > 0 ? 'Tasa' : 'Exento'
    const ivaTasaOCuota = invoice.ivaRate > 0 ? invoice.ivaRate.toFixed(6) : '0.000000'
    const totalImpuestosTrasladados = invoice.iva > 0
      ? `TotalImpuestosTrasladados="${invoice.iva.toFixed(2)}"`
      : ''

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd" Version="4.0" Serie="${escapeXml(invoice.serie || 'A')}" Folio="${escapeXml(invoice.folio || invoice.id.slice(-6).toUpperCase())}" Fecha="${fechaComprobante}" FormaPago="${escapeXml(invoice.formaPago)}" CondicionesDePago="Pago inmediato" Moneda="${escapeXml(invoice.currency || 'MXN')}" MetodoPago="${escapeXml(invoice.metodoPago)}" TipoComprobante="${escapeXml(invoice.tipoComprobante)}" LugarExpedicion="01000" SubTotal="${invoice.subtotal.toFixed(2)}" Total="${invoice.total.toFixed(2)}">
  <cfdi:Emisor Rfc="${escapeXml(invoice.clinic.rfc || 'XAXX010101000')}" Nombre="${escapeXml(invoice.clinic.name || 'Sinap Demo')}" RegimenFiscal="${escapeXml(invoice.clinic.regimenFiscal || '612')}"/>
  <cfdi:Receptor Rfc="${escapeXml(invoice.patient.rfc || 'XAXX010101000')}" Nombre="${escapeXml(invoice.patient.fullName || 'Público en general')}" DomicilioFiscalReceptor="01000" RegimenFiscalReceptor="616" UsoCFDI="${escapeXml(invoice.usoCFDI)}"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111500" Cantidad="1" ClaveUnidad="E48" Unidad="Servicio" Descripcion="${escapeXml(invoice.concepto || 'Servicio médico')}" ValorUnitario="${invoice.subtotal.toFixed(2)}" Importe="${invoice.subtotal.toFixed(2)}" Descuento="0.00">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${invoice.subtotal.toFixed(2)}" Impuesto="002" TipoFactor="${ivaFactor}" TasaOCuota="${ivaTasaOCuota}" Importe="${invoice.iva.toFixed(2)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
  <cfdi:Impuestos ${totalImpuestosTrasladados}>
    <cfdi:Traslados>
      <cfdi:Traslado Base="${invoice.subtotal.toFixed(2)}" Impuesto="002" TipoFactor="${ivaFactor}" TasaOCuota="${ivaTasaOCuota}" Importe="${invoice.iva.toFixed(2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital Version="1.1" UUID="${escapeXml(invoice.cfdiUuid)}" FechaTimbrado="${fechaTimbrado}" RfcProvCertif="SAT970701NN3" SelloCFD="(Sello digital del CFDI)" NoCertificadoSAT="00001000000000000000" SelloSAT="(Sello digital del SAT)"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`

    const filename = `CFDI_${invoice.serie || 'A'}-${invoice.folio || invoice.id.slice(-6).toUpperCase()}_${invoice.cfdiUuid.slice(0, 8)}.xml`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('XML generation error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
