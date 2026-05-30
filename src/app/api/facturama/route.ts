import { NextRequest, NextResponse } from 'next/server'

// Facturama API integration for CFDI 4.0
// Sandbox: https://apisandbox.facturama.mx
// Production: https://api.facturama.mx

const FACTURAMA_BASE = process.env.FACTURAMA_SANDBOX === 'true'
  ? 'https://apisandbox.facturama.mx'
  : 'https://api.facturama.mx'

const FACTURAMA_USER = process.env.FACTURAMA_USER || 'sinap_sandbox'
const FACTURAMA_PASSWORD = process.env.FACTURAMA_PASSWORD || 'sandbox_pass'

const isSandbox = process.env.FACTURAMA_SANDBOX === 'true'

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
  const ivaAmount = Math.round(params.subtotal * params.ivaRate * 100) / 100
  const total = Math.round((params.subtotal + ivaAmount) * 100) / 100

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
    Conceptos: [
      {
        ClaveProdServ: '84111500',
        Cantidad: 1,
        ClaveUnidad: 'E48',
        Descripcion: params.concepto,
        ValorUnitario: params.subtotal,
        Importe: params.subtotal,
        Impuestos: {
          Traslados: [
            {
              Base: params.subtotal,
              Impuesto: '002',
              TipoFactor: 'Tasa',
              TasaOCuota: params.ivaRate,
              Importe: ivaAmount,
            },
          ],
        },
      },
    ],
    Impuestos: {
      TotalImpuestosTrasladados: ivaAmount,
      Traslados: [
        {
          Base: params.subtotal,
          Impuesto: '002',
          TipoFactor: 'Tasa',
          TasaOCuota: params.ivaRate,
          Importe: ivaAmount,
        },
      ],
    },
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
  const ivaAmount = Math.round(params.subtotal * params.ivaRate * 100) / 100
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

async function facturamaRequest(endpoint: string, method: string, body?: unknown) {
  const auth = Buffer.from(`${FACTURAMA_USER}:${FACTURAMA_PASSWORD}`).toString('base64')

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

  const response = await fetch(`${FACTURAMA_BASE}${endpoint}`, options)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error desconocido de Facturama' }))
    throw new Error(errorData.Message || errorData.message || `Facturama error: ${response.status}`)
  }

  return response.json()
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
      ivaRate = 0.16,
      formaPago = '01',
      metodoPago = 'PUE',
      usoCFDI = 'G01',
      rfcReceptor = 'XAXX010101000',
      nombreReceptor = 'Publico en general',
      rfcEmisor = 'CSA230515ABC',
      nombreEmisor = 'Clinica San Angel',
      regimenFiscal = '612',
      lugarExpedicion = '01000',
    } = await req.json()

    if (!clinicId || !concept || !subtotal) {
      return NextResponse.json(
        { error: 'clinicId, concept y subtotal son requeridos' },
        { status: 400 }
      )
    }

    // If no real Facturama credentials, return mock CFDI
    if (isSandbox && FACTURAMA_USER === 'sinap_sandbox') {
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

      return NextResponse.json(mockResult)
    }

    // Real Facturama integration
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

    const result = await facturamaRequest('/api-lite/cfdis', 'POST', cfdiPayload)

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

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    // If sandbox with default creds, return mock list
    if (isSandbox && FACTURAMA_USER === 'sinap_sandbox') {
      return NextResponse.json({
        cfdiList: [],
        isSimulated: true,
        message: 'Listado simulado. Conecte Facturama para ver CFDIs reales.',
      })
    }

    // Real Facturama list
    const result = await facturamaRequest('/api-lite/cfdis', 'GET')
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

    // If sandbox with default creds, return mock cancellation
    if (isSandbox && FACTURAMA_USER === 'sinap_sandbox') {
      return NextResponse.json({
        status: 'cancelled',
        cfdiUuid,
        isSimulated: true,
        message: 'CFDI cancelado (simulado).',
      })
    }

    // Real Facturama cancellation
    const result = await facturamaRequest(
      `/api-lite/cfdis/${cfdiUuid}?motive=${motive}`,
      'DELETE'
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
