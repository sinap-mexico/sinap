'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { weeklyAppointments, monthlyRevenue, kpiData } from '@/lib/mock-data'
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

export function SightAnalytics() {
  const maxRevenue = Math.max(...monthlyRevenue.map((d) => d.amount))
  const maxAppointments = Math.max(...weeklyAppointments.map((d) => d.count))

  const alerts = [
    {
      id: 'al1',
      type: 'warning',
      title: 'Ocupación baja los jueves',
      description: 'La ocupación de jueves ha bajado un 15% en las últimas 3 semanas.',
      action: 'Considerar promociones para horarios de jueves',
    },
    {
      id: 'al2',
      type: 'success',
      title: 'Pacientes nuevos en aumento',
      description: 'Los pacientes nuevos aumentaron 23% este mes vs. el anterior.',
      action: 'El agente Sinap Grow está funcionando bien',
    },
    {
      id: 'al3',
      type: 'info',
      title: 'Facturación en tendencia positiva',
      description: 'La facturación mensual crece consistentemente desde febrero.',
      action: 'Mantener estrategia actual de precios',
    },
    {
      id: 'al4',
      type: 'warning',
      title: 'Tasa de no-show elevada',
      description: 'El 12% de las citas no se presentan. Promedio sector: 8%.',
      action: 'Activar recordatorios automáticos por WhatsApp',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-[#E1F5EE] bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                Ocupación semanal
              </p>
              <ArrowUpRight className="h-4 w-4 text-[#1D9E75]" />
            </div>
            <p className="text-3xl font-medium text-[#2C2C2A] tracking-[-0.03em]">
              {kpiData.ocupacion}%
            </p>
            <p className="text-xs text-[#1D9E75] mt-1">+5% vs. semana pasada</p>
          </CardContent>
        </Card>
        <Card className="border-[#E1F5EE] bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                Ingresos del mes
              </p>
              <ArrowUpRight className="h-4 w-4 text-[#1D9E75]" />
            </div>
            <p className="text-3xl font-medium text-[#2C2C2A] tracking-[-0.03em]">
              $67k
            </p>
            <p className="text-xs text-[#1D9E75] mt-1">+15.5% vs. mayo</p>
          </CardContent>
        </Card>
        <Card className="border-[#E1F5EE] bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                Tasa de no-show
              </p>
              <ArrowDownRight className="h-4 w-4 text-[#E53E3E]" />
            </div>
            <p className="text-3xl font-medium text-[#2C2C2A] tracking-[-0.03em]">
              12%
            </p>
            <p className="text-xs text-[#E53E3E] mt-1">Por encima del promedio (8%)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments chart */}
        <Card className="border-[#E1F5EE] bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                Citas por día
              </CardTitle>
              <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                Esta semana
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 h-48">
              {weeklyAppointments.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-[#2C2C2A]">{d.count}</span>
                  <div className="w-full relative" style={{ height: '140px' }}>
                    <div
                      className="absolute bottom-0 w-full rounded-t-lg transition-all duration-700"
                      style={{
                        height: `${(d.count / maxAppointments) * 100}%`,
                        backgroundColor: d.day === 'Vie' ? '#534AB7' : '#1D9E75',
                        minHeight: '12px',
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-[#888780]">{d.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue chart */}
        <Card className="border-[#E1F5EE] bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                Ingresos mensuales
              </CardTitle>
              <Badge className="bg-[#E1F5EE] text-[#1D9E75] border-0 text-[10px]">
                2026
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyRevenue.map((d) => (
                <div key={d.month} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#2C2C2A] font-medium">{d.month}</span>
                    <span className="text-xs text-[#888780]">
                      ${(d.amount / 1000).toFixed(0)}k MXN
                    </span>
                  </div>
                  <div className="h-6 bg-[#F1EFE8] rounded-md overflow-hidden">
                    <div
                      className="h-full rounded-md transition-all duration-700"
                      style={{
                        width: `${(d.amount / maxRevenue) * 100}%`,
                        backgroundColor: d.month === 'Jun' ? '#534AB7' : '#5DCAA5',
                        minHeight: '4px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts panel */}
      <Card className="border-[#E1F5EE] bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium tracking-[-0.03em]">
              Alertas proactivas
            </CardTitle>
            <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
              <BarChart3 className="h-3 w-3 mr-1" />
              Sinap Sight
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${
                  alert.type === 'warning'
                    ? 'bg-[#FEF3C7] border-amber-200'
                    : alert.type === 'success'
                    ? 'bg-[#E1F5EE] border-[#1D9E75]/20'
                    : 'bg-[#EEEDFE] border-[#534AB7]/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {alert.type === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  ) : alert.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-[#1D9E75]" />
                  ) : (
                    <Info className="h-4 w-4 text-[#534AB7]" />
                  )}
                  <span className="text-sm font-medium text-[#2C2C2A]">{alert.title}</span>
                </div>
                <p className="text-xs text-[#2C2C2A] leading-relaxed mb-1">
                  {alert.description}
                </p>
                <p className="text-[10px] text-[#888780]">{alert.action}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
