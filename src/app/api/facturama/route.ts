import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Facturama API integration for CFDI 4.0
// Sandbox: https://apisandbox.facturama.mx
// Production: https://api.facturama.mx

const ENV_FACTURAMA_USER = process.env.FACTURAMA_USER || 'sinap_sandbox'
const ENV_FACTURAMA_PASSWORD = process.env.FACTURAMA_PASSWORD || 'sandbox_pass'
const ENV_FACTURAMA_SANDBOX = process.env.FACTURAMA_SANDBOX === 'true'

interface CFDIConcept {
  ClaveProdServ: string
  Cantidad: number
  ClaveUnidad: string
  Descripcion: string
  ValorUnitario: number
  Impuestos?: {
    Traslados: Array<{
      Base: number
      Impuesto: string
      TipoFactor: string
      TasaOCuota: number
      Importe: number
    }>
  }
  Importe: number
}

interface CFDIPayload {
  Serie?: string
  Folio?: string
  Fecha?: string
  FormaPago: string
  CondicionesDePago?: string
  Moneda: string
  TipoCambio?: string
  MetodoPago: string
  TipoComprobante: string
  LugarExpedicion: string
  Emisor: {
    Rfc: string
    Nombre: string
    RegimenFiscal: string
  }
  Receptor: {
    Rfc: string
    Nombre: string
    UsoCFDI: string
    RegimenFiscalReceptor?: string
    DomicilioFiscalReceptor?: string
  }
  Conceptos: CFDIConcept[]
  Impuestos?: {
    TotalImpuestosTrasladados?: number
    Traslados?: Array<{
      Base: number
      Impuesto: string
      TipoFactor: string
      TasaOCuota: number
      Importe: number
    }>
  }
  SubTotal: number
  Total: number
}

function generateCFDIPayload(params: {
  rfcEmisor: string
  nombreEmisor: string
  regimenFiscal: string
  rfcReceptor: string
  nombreReceptor: string
  usoCFDI: string
  concepto: string
  subtotal: number
  ivaRate: number
  formaPago: string
  metodoPago: string
  lugarExpedicion: string
}): CFDIPayload {
  const ivaAmount = params.ivaRate > 0 ? Math.round(params.subtotal * params.ivaRate * 100) / 100 : 0
  const total = Math.round((params.subtotal + ivaAmount) * 100) / 100

  // Build concept — only include Impuestos if IVA applies
  const concepto: Record<string, unknown> = {
    ClaveProdServ: '84111500',
    Cantidad: 1,
    ClaveUnidad: 'E48',
    Descripcion: params.concepto,
    ValorUnitario: params.subtotal,
    Importe: params.subtotal,
  }

  if (ivaAmount > 0) {
    concepto.Impuestos = {
      Traslados: [{
        Base: params.subtotal,
        Impuesto: '002',
        TipoFactor: 'Tasa',
        TasaOCuota: params.ivaRate,
        Importe: ivaAmount,
      }],
    }
  } else {
    // Exento de IVA — servicio de salud
    concepto.Impuestos = {
      Traslados: [{
        Base: params.subtotal,
        Impuesto: '002',
        TipoFactor: 'Exento',
        TasaOCuota: 0,
        Importe: 0,
      }],
    }
  }

  // Build global Impuestos section
  const impuestos: Record<string, unknown> = {}
  if (ivaAmount > 0) {
    impuestos.TotalImpuestosTrasladados = ivaAmount
    impuestos.Traslados = [{
      Base: params.subtotal,
      Impuesto: '002',
      TipoFactor: 'Tasa',
      TasaOCuota: params.ivaRate,
      Importe: ivaAmount,
    }]
  } else {
    impuestos.Traslados = [{
      Base: params.subtotal,
      Impuesto: '002',
      TipoFactor: 'Exento',
      TasaOCuota: 0,
      Importe: 0,
    }]
  }

  return {
    Serie: 'A',
    FormaPago: params.formaPago,
    Moneda: 'MXN',
    MetodoPago: params.metodoPago,
    TipoComprobante: 'I',
    LugarExpedicion: params.lugarExpedicion || '01000',
    Emisor: {
      Rfc: params.rfcEmisor,
      Nombre: params.nombreEmisor,
      RegimenFiscal: params.regimenFiscal || '612',
    },
    Receptor: {
      Rfc: params.rfcReceptor,
      Nombre: params.nombreReceptor,
      UsoCFDI: params.usoCFDI,
      RegimenFiscalReceptor: '616',
      DomicilioFiscalReceptor: '01000',
    },
    Conceptos: [concepto],
    Impuestos: impuestos,
    SubTotal: params.subtotal,
    Total: total,
  }
}

function generateMockCFDI(params: {
  concepto: string
  subtotal: number
  ivaRate: number
  formaPago: string
  metodoPago: string
}) {
  const ivaAmount = params.ivaRate > 0 ? Math.round(params.subtotal * params.ivaRate * 100) / 100 : 0
  const total = Math.round((params.subtotal + ivaAmount) * 100) / 100
  const uuid = `${crypto.randomUUID().slice(0, 8).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`

  return {
    cfdiUuid: uuid,
    pdfUrl: null,
    xmlUrl: null,
    status: 'timbrada',
    total,
    subtotal: params.subtotal,
    iva: ivaAmount,
    formaPago: params.formaPago,
    metodoPago: params.metodoPago,
    concepto: params.concepto,
    isSimulated: true,
    message: 'CFDI simulado. Conecte Facturama para generar CFDIs fiscales.',
  }
}

async function facturamaRequest(endpoint: string, method: string, auth: string, baseUrl: string, body?: unknown) {
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${baseUrl}${endpoint}`, options)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error desconocido de Facturama' }))
    throw new Error(errorData.Message || errorData.message || `Facturama error: ${response.status}`)
  }

  return response.json()
}

/** Resolve Facturama credentials: DB clinic → env vars → mock/sandbox */
async function resolveFacturamaConfig(clinicId: string): Promise<{
  userId: string
  token: string
  isSandbox: boolean
  isMock: boolean
  rfc: string | null
  name: string | null
  regimenFiscal: string | null
} | null> {
  // 1. Try DB lookup
  if (db) {
    try {
      const clinic = await db.clinic.findUnique({
        where: { id: clinicId },
        select: {
          facturamaUserId: true,
          facturamaToken: true,
          facturamaSandbox: true,
          rfc: true,
          name: true,
          regimenFiscal: true,
        },
      })

      if (clinic) {
        // If clinic has real credentials, use them
        if (clinic.facturamaUserId && clinic.facturamaToken) {
          return {
            userId: clinic.facturamaUserId,
            token: clinic.facturamaToken,
            isSandbox: clinic.facturamaSandbox,
            isMock: false,
            rfc: clinic.rfc,
            name: clinic.name,
            regimenFiscal: clinic.regimenFiscal,
          }
        }

        // If clinic is in sandbox mode (no real creds), use sandbox
        if (clinic.facturamaSandbox) {
          return {
            userId: ENV_FACTURAMA_USER,
            token: ENV_FACTURAMA_PASSWORD,
            isSandbox: true,
            isMock: true,
            rfc: clinic.rfc,
            name: clinic.name,
            regimenFiscal: clinic.regimenFiscal,
          }
        }
      }
    } catch (err) {
      console.error('Failed to look up clinic facturama config:', err)
    }
  }

  // 2. Fall back to environment variables
  if (ENV_FACTURAMA_USER !== 'sinap_sandbox' || ENV_FACTURAMA_PASSWORD !== 'sandbox_pass') {
    return {
      userId: ENV_FACTURAMA_USER,
      token: ENV_FACTURAMA_PASSWORD,
      isSandbox: ENV_FACTURAMA_SANDBOX,
      isMock: ENV_FACTURAMA_SANDBOX,
      rfc: null,
      name: null,
      regimenFiscal: null,
    }
  }

  // 3. No credentials available — mock/sandbox mode
  return {
    userId: ENV_FACTURAMA_USER,
    token: ENV_FACTURAMA_PASSWORD,
    isSandbox: true,
    isMock: true,
    rfc: null,
    name: null,
    regimenFiscal: null,
  }
}

// POST — Generate CFDI 4.0
export async function POST(req: NextRequest) {
  try {
    const {
      clinicId,
      patientId,
      appointmentId,
      concept,
      subtotal,
      ivaRate = 0,
      formaPago = '01',
      metodoPago = 'PUE',
      usoCFDI = 'G01',
      rfcReceptor: bodyRfcReceptor,
      nombreReceptor: bodyNombreReceptor,
      rfcEmisor: bodyRfcEmisor,
      nombreEmisor: bodyNombreEmisor,
      regimenFiscal: bodyRegimenFiscal,
      lugarExpedicion = '01000',
    } = await req.json()

    if (!clinicId || !concept || !subtotal) {
      return NextResponse.json(
        { error: 'clinicId, concept y subtotal son requeridos' },
        { status: 400 }
      )
    }

    // Resolve Facturama credentials from DB → env → mock
    const config = await resolveFacturamaConfig(clinicId)

    if (!config) {
      return NextResponse.json(
        { error: 'No se pudo resolver la configuración de Facturama' },
        { status: 500 }
      )
    }

    // Look up patient from DB if patientId provided
    let dbPatientRfc: string | null = null
    let dbPatientName: string | null = null
    if (db && patientId) {
      try {
        const patient = await db.patient.findUnique({
          where: { id: patientId },
          select: { rfc: true, fullName: true },
        })
        if (patient) {
          dbPatientRfc = patient.rfc
          dbPatientName = patient.fullName
        }
      } catch (err) {
        console.error('Failed to look up patient:', err)
      }
    }

    // Resolve emisor: DB clinic → request body → defaults
    const rfcEmisor = config.rfc || bodyRfcEmisor || 'CSA230515ABC'
    const nombreEmisor = config.name || bodyNombreEmisor || 'Clinica San Angel'
    const regimenFiscal = config.regimenFiscal || bodyRegimenFiscal || '612'

    // Resolve receptor: DB patient → request body → generic
    const rfcReceptor = dbPatientRfc || bodyRfcReceptor || 'XAXX010101000'
    const nombreReceptor = dbPatientName || bodyNombreReceptor || 'Publico en general'

    // If mock/sandbox mode (no real credentials), return simulated CFDI
    if (config.isMock) {
      const mockResult = generateMockCFDI({
        concepto: concept,
        subtotal,
        ivaRate,
        formaPago,
        metodoPago,
      })

      // Emit event via the events API
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinicId,
            eventType: 'factura_generada',
            sourceAgent: 'bill',
            targetAgent: 'desk',
            payload: JSON.stringify({
              cfdiUuid: mockResult.cfdiUuid,
              total: mockResult.total,
              patientId,
              appointmentId,
              concept,
            }),
          }),
        })
      } catch {
        // Event emission is non-critical
      }

      return NextResponse.json({
        ...mockResult,
        facturamaId: `sim-${Date.now()}`,
        tipoComprobante: 'I',
        usoCFDI,
        serie: 'A',
      })
    }

    // Real Facturama integration
    const baseUrl = config.isSandbox
      ? 'https://apisandbox.facturama.mx'
      : 'https://api.facturama.mx'
    const auth = Buffer.from(`${config.userId}:${config.token}`).toString('base64')

    const cfdiPayload = generateCFDIPayload({
      rfcEmisor,
      nombreEmisor,
      regimenFiscal,
      rfcReceptor,
      nombreReceptor,
      usoCFDI,
      concepto: concept,
      subtotal,
      ivaRate,
      formaPago,
      metodoPago,
      lugarExpedicion,
    })

    const result = await facturamaRequest('/api-lite/cfdis', 'POST', auth, baseUrl, cfdiPayload)

    // Emit event
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          eventType: 'factura_generada',
          sourceAgent: 'bill',
          targetAgent: 'desk',
          payload: JSON.stringify({
            cfdiUuid: result.Id || result.uuid,
            total: cfdiPayload.Total,
            patientId,
            appointmentId,
            concept,
          }),
        }),
      })
    } catch {
      // Event emission is non-critical
    }

    return NextResponse.json({
      cfdiUuid: result.Id || result.uuid,
      pdfUrl: result.UrlPdf || null,
      xmlUrl: result.UrlXml || null,
      status: 'timbrada',
      total: cfdiPayload.Total,
      isSimulated: false,
      facturamaId: result.Id || result.uuid,
      tipoComprobante: 'I',
      usoCFDI,
      serie: 'A',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Facturama POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET — List CFDIs
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')
    const facturamaId = searchParams.get('facturamaId')
    const format = searchParams.get('format') // 'pdf' or 'xml'

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    // Resolve credentials to determine mode
    const config = await resolveFacturamaConfig(clinicId)

    // ─── Download CFDI PDF/XML ───────────────────────────
    if (facturamaId && format) {
      if (!config || config.isMock) {
        // Generate a simple placeholder for mock mode
        if (format === 'xml') {
          const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Fecha="${new Date().toISOString()}" Total="0" Moneda="MXN">
  <cfdi:Emisor Rfc="XAXX010101000" Nombre="Sinap Demo" RegimenFiscal="612"/>
  <cfdi:Receptor Rfc="XAXX010101000" Nombre="Público en General" UsoCFDI="G01"/>
</cfdi:Comprobante>`
          return new NextResponse(mockXml, {
            headers: {
              'Content-Type': 'application/xml',
              'Content-Disposition': `attachment; filename="CFDI_demo.xml"`,
            },
          })
        }
        // For PDF in mock mode, return a simple HTML as PDF placeholder
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CFDI Demo</title><style>body{font-family:sans-serif;padding:40px;color:#2C2C2A}h1{color:#534AB7}table{width:100%;border-collapse:collapse;margin:20px 0}td,th{padding:8px 12px;border:1px solid #E8E6DF;text-align:left}th{background:#F1EFE8}</style></head><body><h1>CFI Demo - Sinap</h1><p>Esta es una representación simulada del CFDI.</p><p>Conecta Facturama para generar CFDIs reales ante el SAT.</p><table><tr><th>UUID</th><td>Demo-${facturamaId}</td></tr><tr><th>Fecha</th><td>${new Date().toLocaleString('es-MX')}</td></tr><tr><th>Emisor</th><td>Sinap Demo</td></tr><tr><th>Total</th><td>$0.00 MXN</td></tr></table></body></html>`
        return new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html',
          },
        })
      }

      // Real Facturama download
      const baseUrl = config.isSandbox
        ? 'https://apisandbox.facturama.mx'
        : 'https://api.facturama.mx'
      const auth = Buffer.from(`${config.userId}:${config.token}`).toString('base64')

      if (format === 'pdf') {
        const pdfResult = await facturamaRequest(
          `/api-lite/cfdis/${facturamaId}/pdf`,
          'GET',
          auth,
          baseUrl
        )
        // Facturama returns base64-encoded PDF
        if (pdfResult?.Content) {
          const buffer = Buffer.from(pdfResult.Content, 'base64')
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="CFDI_${facturamaId}.pdf"`,
            },
          })
        }
        return NextResponse.json({ error: 'No se pudo obtener el PDF de Facturama' }, { status: 500 })
      }

      if (format === 'xml') {
        const xmlResult = await facturamaRequest(
          `/api-lite/cfdis/${facturamaId}/xml`,
          'GET',
          auth,
          baseUrl
        )
        if (xmlResult?.Content) {
          const xmlContent = Buffer.from(xmlResult.Content, 'base64').toString('utf-8')
          return new NextResponse(xmlContent, {
            headers: {
              'Content-Type': 'application/xml',
              'Content-Disposition': `attachment; filename="CFDI_${facturamaId}.xml"`,
            },
          })
        }
        return NextResponse.json({ error: 'No se pudo obtener el XML de Facturama' }, { status: 500 })
      }
    }

    // ─── List CFDIs ─────────────────────────────────────
    if (!config || config.isMock) {
      return NextResponse.json({
        cfdiList: [],
        isSimulated: true,
        message: 'Listado simulado. Conecte Facturama para ver CFDIs reales.',
      })
    }

    // Real Facturama list
    const baseUrl = config.isSandbox
      ? 'https://apisandbox.facturama.mx'
      : 'https://api.facturama.mx'
    const auth = Buffer.from(`${config.userId}:${config.token}`).toString('base64')

    const result = await facturamaRequest('/api-lite/cfdis', 'GET', auth, baseUrl)
    return NextResponse.json({ cfdiList: result, isSimulated: false })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Facturama GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE — Cancel CFDI
export async function DELETE(req: NextRequest) {
  try {
    const { clinicId, cfdiUuid, motive = '02' } = await req.json()

    if (!clinicId || !cfdiUuid) {
      return NextResponse.json(
        { error: 'clinicId y cfdiUuid son requeridos' },
        { status: 400 }
      )
    }

    // Resolve credentials to determine mode
    const config = await resolveFacturamaConfig(clinicId)

    if (!config || config.isMock) {
      return NextResponse.json({
        status: 'cancelled',
        cfdiUuid,
        isSimulated: true,
        message: 'CFDI cancelado (simulado).',
      })
    }

    // Real Facturama cancellation
    const baseUrl = config.isSandbox
      ? 'https://apisandbox.facturama.mx'
      : 'https://api.facturama.mx'
    const auth = Buffer.from(`${config.userId}:${config.token}`).toString('base64')

    const result = await facturamaRequest(
      `/api-lite/cfdis/${cfdiUuid}?motive=${motive}`,
      'DELETE',
      auth,
      baseUrl
    )

    return NextResponse.json({
      status: 'cancelled',
      cfdiUuid,
      result,
      isSimulated: false,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Facturama DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
