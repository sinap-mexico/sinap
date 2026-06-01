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
      ivaRate = 0.16,
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

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    // Resolve credentials to determine mode
    const config = await resolveFacturamaConfig(clinicId)

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
