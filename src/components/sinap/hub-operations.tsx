'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { staffMembers, inventoryAlerts, kpiData } from '@/lib/mock-data'
import {
  Building2,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
} from 'lucide-react'

export function HubOperations() {
  const income = 67000
  const expenses = 28500
  const netCash = income - expenses

  const urgencyColors: Record<string, { bg: string; text: string }> = {
    high: { bg: '#FEE2E2', text: '#E53E3E' },
    medium: { bg: '#FEF3C7', text: '#D97706' },
    low: { bg: '#E1F5EE', text: '#1D9E75' },
  }

  return (
    <div className="space-y-6">
      {/* Cash flow summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-[#E1F5EE] bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                  Ingresos del mes
                </p>
                <p className="text-3xl font-medium text-[#2C2C2A] mt-1 tracking-[-0.03em]">
                  ${income.toLocaleString('es-MX')}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-[#1D9E75]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E1F5EE] bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                  Egresos del mes
                </p>
                <p className="text-3xl font-medium text-[#2C2C2A] mt-1 tracking-[-0.03em]">
                  ${expenses.toLocaleString('es-MX')}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-[#FEE2E2] flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-[#E53E3E]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E1F5EE] bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                  Flujo neto
                </p>
                <p className="text-3xl font-medium text-[#1D9E75] mt-1 tracking-[-0.03em]">
                  ${netCash.toLocaleString('es-MX')}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-[#1D9E75]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff overview */}
        <Card className="border-[#E1F5EE] bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                Equipo de hoy
              </CardTitle>
              <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                <Building2 className="h-3 w-3 mr-1" />
                Sinap Hub
              </Badge>
            </div>
          </CardHeader>
          <Separator className="bg-[#E1F5EE]" />
          <div className="p-3 space-y-3">
            {staffMembers.map((staff) => (
              <div
                key={staff.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-[#F1EFE8]"
              >
                <div className="h-10 w-10 rounded-full bg-[#534AB7] flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium text-white">{staff.avatar}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2C2C2A]">{staff.name}</p>
                  <p className="text-xs text-[#888780]">{staff.specialty}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-[#1D9E75]" />
                    <span className="text-sm font-medium text-[#2C2C2A]">
                      {staff.todayAppointments}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#888780]">citas hoy</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Inventory alerts */}
        <Card className="border-[#E1F5EE] bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                Alertas de inventario
              </CardTitle>
              <Badge className="bg-[#FEE2E2] text-[#E53E3E] border-0 text-[10px]">
                {inventoryAlerts.filter((i) => i.urgency === 'high').length} urgente
              </Badge>
            </div>
          </CardHeader>
          <Separator className="bg-[#E1F5EE]" />
          <ScrollArea className="max-h-72">
            <div className="p-3 space-y-2">
              {inventoryAlerts.map((item) => {
                const colors = urgencyColors[item.urgency]
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#F1EFE8]"
                  >
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: colors.bg }}
                    >
                      {item.urgency === 'high' ? (
                        <AlertTriangle className="h-4 w-4" style={{ color: colors.text }} />
                      ) : (
                        <Package className="h-4 w-4" style={{ color: colors.text }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#2C2C2A]">{item.item}</p>
                      <p className="text-xs text-[#888780]">
                        Stock: {item.stock} / Mín: {item.minStock}
                      </p>
                    </div>
                    <Badge
                      className="text-[9px] border-0"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {item.urgency === 'high'
                        ? 'Urgente'
                        : item.urgency === 'medium'
                        ? 'Medio'
                        : 'Bajo'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}
