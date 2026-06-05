import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper: recalculate invoice payment status from Payment records
async function recalcInvoicePaymentStatus(invoiceId: string) {
  if (!db) return null

  const payments = await db.payment.findMany({
    where: { invoiceId },
    orderBy: { createdAt: 'desc' },
  })

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } })
  if (!invoice) return null

  let paymentStatus: string
  let paidAt: Date | null = null
  let formaPago: string | null = null

  if (totalPaid >= invoice.total && invoice.total > 0) {
    paymentStatus = 'paid'
    paidAt = payments[0]?.createdAt || new Date()
    formaPago = payments[0]?.formaPago || invoice.formaPago
  } else if (totalPaid > 0) {
    paymentStatus = 'partial'
    // Keep the last payment's formaPago for reference
    formaPago = payments[0]?.formaPago || invoice.formaPago
  } else {
    paymentStatus = 'unpaid'
    formaPago = null
  }

  const updated = await db.invoice.update({
    where: { id: invoiceId },
    data: { paymentStatus, paidAt, formaPago },
    include: {
      patient: { select: { fullName: true, rfc: true } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  })

  // Update patient metrics if fully paid
  if (paymentStatus === 'paid' && invoice.patientId) {
    try {
      const { updatePatientMetrics } = await import('@/app/api/patients/route')
      await updatePatientMetrics(invoice.patientId)
    } catch (err) {
      console.error('Failed to update patient metrics after payment:', err)
    }
  }

  return updated
}

// GET /api/payments?invoiceId=xxx — List payments for an invoice
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const invoiceId = searchParams.get('invoiceId')

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId es requerido' }, { status: 400 })
    }

    if (!db) {
      return NextResponse.json({ payments: [] })
    }

    const payments = await db.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ payments })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Payments GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/payments — Create a new payment for an invoice
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const { invoiceId, amount, formaPago, reference, notes, createdBy } = body

    if (!invoiceId || !amount || !formaPago) {
      return NextResponse.json(
        { error: 'invoiceId, amount y formaPago son requeridos' },
        { status: 400 }
      )
    }

    // Validate invoice exists
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    // Calculate total paid so far
    const existingPayments = await db.payment.findMany({ where: { invoiceId } })
    const totalPaidSoFar = existingPayments.reduce((sum, p) => sum + p.amount, 0)

    // Validate payment amount doesn't exceed remaining balance
    const remaining = invoice.total - totalPaidSoFar
    if (amount > remaining + 0.01) { // small tolerance for floating point
      return NextResponse.json(
        { error: `El monto excede el saldo pendiente. Saldo restante: $${remaining.toLocaleString('es-MX')}` },
        { status: 400 }
      )
    }

    // Create the payment
    const payment = await db.payment.create({
      data: {
        invoiceId,
        amount: parseFloat(String(amount)),
        formaPago,
        reference: reference || null,
        notes: notes || null,
        createdBy: createdBy || null,
      },
    })

    // Recalculate invoice payment status
    const updatedInvoice = await recalcInvoicePaymentStatus(invoiceId)

    return NextResponse.json({
      payment,
      invoice: updatedInvoice,
    }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Payments POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/payments?paymentId=xxx — Delete a payment
export async function DELETE(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId es requerido' }, { status: 400 })
    }

    const payment = await db.payment.findUnique({ where: { id: paymentId } })
    if (!payment) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    const invoiceId = payment.invoiceId

    await db.payment.delete({ where: { id: paymentId } })

    // Recalculate invoice payment status
    const updatedInvoice = await recalcInvoicePaymentStatus(invoiceId)

    return NextResponse.json({
      success: true,
      deleted: paymentId,
      invoice: updatedInvoice,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Payments DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
