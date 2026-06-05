import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/inventory/[id] — Update inventory item
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { id } = await params
    const body = await req.json()

    const existing = await db.inventoryItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const item = await db.inventoryItem.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        category: body.category ?? existing.category,
        quantity: body.quantity !== undefined ? parseInt(String(body.quantity), 10) : existing.quantity,
        minQuantity: body.minQuantity !== undefined ? parseInt(String(body.minQuantity), 10) : existing.minQuantity,
        unit: body.unit ?? existing.unit,
        costPerUnit: body.costPerUnit !== undefined ? parseFloat(String(body.costPerUnit)) : existing.costPerUnit,
        supplier: body.supplier !== undefined ? body.supplier || null : existing.supplier,
        expiryDate: body.expiryDate !== undefined ? (body.expiryDate ? new Date(body.expiryDate) : null) : existing.expiryDate,
        location: body.location !== undefined ? body.location || null : existing.location,
        notes: body.notes !== undefined ? body.notes || null : existing.notes,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      },
    })

    // Emit low stock alert if quantity is now at or below minimum
    if (item.quantity <= item.minQuantity) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinicId: item.clinicId,
            eventType: 'inventario_stock_bajo',
            sourceAgent: 'hub',
            payload: JSON.stringify({
              itemId: item.id,
              name: item.name,
              quantity: item.quantity,
              minQuantity: item.minQuantity,
            }),
          }),
        })
      } catch {
        // Event emission is non-critical
      }
    }

    return NextResponse.json({ item })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Inventory PUT error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/inventory/[id] — Delete inventory item
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!db) return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })

    const { id } = await params

    const existing = await db.inventoryItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    await db.inventoryItem.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Inventory DELETE error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
