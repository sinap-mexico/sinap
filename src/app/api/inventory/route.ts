import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/inventory?clinicId=xxx&category=xxx&isActive=true&lowStock=true
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clinicId = searchParams.get('clinicId')
    const category = searchParams.get('category')
    const isActiveStr = searchParams.get('isActive')
    const lowStock = searchParams.get('lowStock') === 'true'

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId es requerido' }, { status: 400 })
    }

    if (!db) {
      return NextResponse.json({ items: [], total: 0, lowStockCount: 0, expiringCount: 0, totalValue: 0 })
    }

    const where: Record<string, unknown> = { clinicId }

    if (isActiveStr !== null) {
      where.isActive = isActiveStr === 'true'
    } else {
      where.isActive = true
    }

    if (category) {
      where.category = category
    }

    const items = await db.inventoryItem.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    // Compute summary metrics
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const lowStockItems = items.filter(item => item.quantity <= item.minQuantity)
    const expiringItems = items.filter(item =>
      item.expiryDate && new Date(item.expiryDate) <= thirtyDaysFromNow
    )
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0)

    // If lowStock filter is requested, only return low stock items
    const filteredItems = lowStock ? lowStockItems : items

    return NextResponse.json({
      items: filteredItems,
      total: items.length,
      lowStockCount: lowStockItems.length,
      expiringCount: expiringItems.length,
      totalValue,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Inventory GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/inventory — Create inventory item
export async function POST(req: NextRequest) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const body = await req.json()
    const {
      clinicId, name, category, quantity, minQuantity, unit,
      costPerUnit, supplier, expiryDate, location, notes,
    } = body

    if (!clinicId || !name) {
      return NextResponse.json(
        { error: 'clinicId y name son requeridos' },
        { status: 400 }
      )
    }

    const item = await db.inventoryItem.create({
      data: {
        clinicId,
        name,
        category: category || 'other',
        quantity: quantity ?? 0,
        minQuantity: minQuantity ?? 5,
        unit: unit || 'pieza',
        costPerUnit: costPerUnit ? parseFloat(String(costPerUnit)) : 0,
        supplier: supplier || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        location: location || null,
        notes: notes || null,
      },
    })

    // Emit event
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          eventType: 'inventario_agregado',
          sourceAgent: 'hub',
          payload: JSON.stringify({
            itemId: item.id,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
          }),
        }),
      })
    } catch {
      // Event emission is non-critical
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Inventory POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
