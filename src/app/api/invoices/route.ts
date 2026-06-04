import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getMockInvoices } from '@/lib/mock-api'

// GET /api/invoices?clinicId=xxx&status=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')
    const status = searchParams.get('status')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    // Fallback to mock data when DB is unavailable (demo mode)
    if (!db) {
      let invoices = getMockInvoices(clinicId)
      if (status) invoices = invoices.filter(i => i.status === status)
      return NextResponse.json({ invoices })
    }

    const where: Record<string, unknown> = { clinicId }
    if (status) {
      where.status = status
    }

    const invoices = await db.invoice.findMany({
      where,
      include: {
        patient: { select: { fullName: true, rfc: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invoices })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Invoices GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/invoices — Create invoice
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const {
      clinicId, patientId, appointmentId,
      concepto, subtotal, iva, ivaRate, total,
      formaPago, metodoPago, usoCFDI, tipoComprobante,
      cfdiUuid, facturamaId, pdfUrl, xmlUrl,
      serie, folio,
      status, paymentStatus, errorMessage,
    } = body

    if (!clinicId || !patientId) {
      return NextResponse.json({ error: 'clinicId y patientId son requeridos' }, { status: 400 })
    }

    const invoice = await db.invoice.create({
      data: {
        clinicId,
        patientId,
        appointmentId: appointmentId || null,
        concepto: concepto || null,
        subtotal: subtotal || 0,
        iva: iva || 0,
        ivaRate: ivaRate ?? 0,
        total: total || 0,
        formaPago: formaPago || '01',
        metodoPago: metodoPago || 'PUE',
        tipoComprobante: tipoComprobante || 'I',
        usoCFDI: usoCFDI || 'G01',
        cfdiUuid: cfdiUuid || null,
        facturamaId: facturamaId || null,
        pdfUrl: pdfUrl || null,
        xmlUrl: xmlUrl || null,
        serie: serie || null,
        folio: folio || null,
        status: status || 'pending',
        paymentStatus: paymentStatus || 'unpaid',
        errorMessage: errorMessage || null,
      },
      include: {
        patient: { select: { fullName: true, rfc: true } },
      },
    })

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Invoices POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/invoices — Update invoice (mark as paid, update status, etc.)
export async function PATCH(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const { invoiceId, paymentStatus, status, formaPago } = body

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId es requerido' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (paymentStatus !== undefined) {
      updateData.paymentStatus = paymentStatus
      // If marking as paid, record the timestamp
      if (paymentStatus === 'paid') {
        updateData.paidAt = new Date()
      }
      // If reverting to unpaid, clear the paidAt timestamp
      if (paymentStatus === 'unpaid') {
        updateData.paidAt = null
      }
    }
    if (status !== undefined) updateData.status = status
    if (formaPago !== undefined) updateData.formaPago = formaPago

    const invoice = await db.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        patient: { select: { fullName: true, rfc: true } },
      },
    })

    return NextResponse.json({ invoice })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Invoices PATCH error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/invoices — Delete invoice
export async function DELETE(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { searchParams } = new URL(req.url)
    const invoiceId = searchParams.get('invoiceId')

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId es requerido' }, { status: 400 })
    }

    const existing = await db.invoice.findUnique({ where: { id: invoiceId } })
    if (!existing) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    await db.invoice.delete({ where: { id: invoiceId } })

    return NextResponse.json({ success: true, deleted: invoiceId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Invoices DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
