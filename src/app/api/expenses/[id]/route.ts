import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/expenses/[id] — Update expense
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { id } = await params
    const body = await req.json()

    const existing = await db.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
    }

    const expense = await db.expense.update({
      where: { id },
      data: {
        category: body.category ?? existing.category,
        description: body.description ?? existing.description,
        amount: body.amount !== undefined ? parseFloat(String(body.amount)) : existing.amount,
        date: body.date ? new Date(body.date) : existing.date,
        isRecurring: body.isRecurring ?? existing.isRecurring,
        recurrence: body.recurrence !== undefined ? body.recurrence || null : existing.recurrence,
        vendor: body.vendor !== undefined ? body.vendor || null : existing.vendor,
        notes: body.notes !== undefined ? body.notes || null : existing.notes,
        receiptUrl: body.receiptUrl !== undefined ? body.receiptUrl || null : existing.receiptUrl,
      },
    })

    return NextResponse.json({ expense })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Expenses PUT error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/expenses/[id] — Delete expense
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { id } = await params

    const existing = await db.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
    }

    await db.expense.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Expenses DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
