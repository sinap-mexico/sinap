import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/expenses?clinicId=xxx&category=xxx&from=xxx&to=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')
    const category = searchParams.get('category')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    if (!db) {
      return NextResponse.json({ expenses: [], total: 0, byCategory: {}, prevTotal: 0, changePercent: 0 })
    }

    const where: Record<string, unknown> = { clinicId }
    if (category) {
      where.category = category
    }
    if (from || to) {
      const dateFilter: Record<string, Date> = {}
      if (from) dateFilter.gte = new Date(from)
      if (to) dateFilter.lte = new Date(to)
      where.date = dateFilter
    }

    // Also get previous period for comparison
    let prevFrom: Date | undefined
    let prevTo: Date | undefined
    if (from && to) {
      const fromD = new Date(from)
      const toD = new Date(to)
      const diffMs = toD.getTime() - fromD.getTime()
      prevTo = new Date(fromD.getTime() - 1)
      prevFrom = new Date(prevTo.getTime() - diffMs)
    }

    const [expenses, totalResult, categoryResult, prevTotalResult] = await Promise.all([
      db.expense.findMany({
        where,
        orderBy: { date: 'desc' },
      }),
      db.expense.aggregate({
        where,
        _sum: { amount: true },
      }),
      db.expense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
      }),
      prevFrom && prevTo
        ? db.expense.aggregate({
            where: { clinicId, date: { gte: prevFrom, lte: prevTo } },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: 0 } }),
    ])

    const total = totalResult._sum.amount || 0
    const prevTotal = (prevTotalResult._sum.amount as number) || 0
    const changePercent = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0

    const byCategory: Record<string, number> = {}
    for (const item of categoryResult) {
      byCategory[item.category] = item._sum.amount || 0
    }

    return NextResponse.json({ expenses, total, byCategory, prevTotal, changePercent })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Expenses GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/expenses — Create expense
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const {
      clinicId, category, description, amount, date,
      isRecurring, recurrence, vendor, notes,
      receiptUrl, createdBy,
    } = body

    if (!clinicId || !description || !amount || !date) {
      return NextResponse.json(
        { error: 'clinicId, description, amount y date son requeridos' },
        { status: 400 }
      )
    }

    const expense = await db.expense.create({
      data: {
        clinicId,
        category: category || 'other',
        description,
        amount: parseFloat(String(amount)),
        date: new Date(date),
        isRecurring: isRecurring ?? false,
        recurrence: recurrence || null,
        vendor: vendor || null,
        notes: notes || null,
        receiptUrl: receiptUrl || null,
        createdBy: createdBy || null,
      },
    })

    // Emit event
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          eventType: 'gasto_registrado',
          sourceAgent: 'hub',
          payload: JSON.stringify({
            expenseId: expense.id,
            category: expense.category,
            amount: expense.amount,
          }),
        }),
      })
    } catch {
      // Event emission is non-critical
    }

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Expenses POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
