'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSinapStore } from '@/lib/sinap-store'
import {
  activityFeed,
  agentStatuses,
  kpiData,
  clinic,
  weeklyAppointments,
} from '@/lib/mock-data'
import {
  Calendar,
  MessageSquare,
  Receipt,
  Users,
  Plus,
  Send,
  RefreshCw,
  BarChart3,
  Circle,
  Zap,
  Clock,
} from 'lucide-react'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatDate() {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  return now.toLocaleDateString('es-MX', options)
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'active'
      ? '#1D9E75'
      : status === 'processing'
      ? '#534AB7'
      : '#888780'
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'processing' && (
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
          style={{ backgroundColor: color }}
        />
      )}
      <Circle
        className="relative inline-flex h-2.5 w-2.5 fill-current"
        style={{ color }}
      />
    </span>
  )
}

const statusLabels: Record<string, string> = {
  active: 'Activo',
  processing: 'Procesando',
  idle: 'Inactivo',
}

export function OsOverview() {
  const { setActiveModule } = useSinapStore()

  const maxAppointments = Math.max(...weeklyAppointments.map((d) => d.count))

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-[#0F2D26] to-[#1D9E75] rounded-xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-medium tracking-[-0.03em]">
              {getGreeting()}, Dr. Ruiz
            </h2>
            <p className="text-white/70 text-sm mt-1 capitalize">{formatDate()}</p>
          </div>
          <Badge className="bg-[#534AB7] text-white border-0 text-xs px-3 py-1">
            <Zap className="h-3 w-3 mr-1" />
            7 neuronas activas
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E1F5EE] bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                  Citas hoy
                </p>
                <p className="text-3xl font-medium text-[#2C2C2A] mt-1 tracking-[-0.03em]">
                  {kpiData.citasHoy}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center">
                <Calendar className="h-5 w-5 text-[#1D9E75]" />
              </div>
            </div>
            <p className="text-xs text-[#1D9E75] mt-2 font-medium">+2 vs ayer</p>
          </CardContent>
        </Card>

        <Card className="border-[#E1F5EE] bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                  Conversaciones activas
                </p>
                <p className="text-3xl font-medium text-[#2C2C2A] mt-1 tracking-[-0.03em]">
                  {kpiData.conversacionesActivas}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-[#EEEDFE] flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-[#534AB7]" />
              </div>
            </div>
            <p className="text-xs text-[#534AB7] mt-2 font-medium">3 sin leer</p>
          </CardContent>
        </Card>

        <Card className="border-[#E1F5EE] bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                  Facturado este mes
                </p>
                <p className="text-3xl font-medium text-[#2C2C2A] mt-1 tracking-[-0.03em]">
                  ${kpiData.totalFacturado.toLocaleString('es-MX')}
                </p>
                <p className="text-[10px] text-[#888780]">MXN</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center">
                <Receipt className="h-5 w-5 text-[#1D9E75]" />
              </div>
            </div>
            <p className="text-xs text-[#1D9E75] mt-2 font-medium">+15% vs abril</p>
          </CardContent>
        </Card>

        <Card className="border-[#E1F5EE] bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                  Pacientes nuevos
                </p>
                <p className="text-3xl font-medium text-[#2C2C2A] mt-1 tracking-[-0.03em]">
                  {kpiData.pacientesNuevos}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center">
                <Users className="h-5 w-5 text-[#5DCAA5]" />
              </div>
            </div>
            <p className="text-xs text-[#5DCAA5] mt-2 font-medium">Este mes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Status Panel */}
        <Card className="border-[#E1F5EE] bg-white lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium tracking-[-0.03em] text-[#2C2C2A]">
              Estado de neuronas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {agentStatuses.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#F1EFE8] transition-colors cursor-pointer"
                onClick={() => setActiveModule(agent.id as any)}
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: agent.color + '15' }}
                >
                  <Zap className="h-4 w-4" style={{ color: agent.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2C2C2A]">{agent.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusDot status={agent.status} />
                    <span className="text-[11px] text-[#888780]">
                      {statusLabels[agent.status]}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[#2C2C2A]">{agent.messages}</p>
                  <p className="text-[10px] text-[#888780]">msgs hoy</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Weekly Appointments Mini Chart */}
        <Card className="border-[#E1F5EE] bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium tracking-[-0.03em] text-[#2C2C2A]">
              Citas esta semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-40">
              {weeklyAppointments.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-[#2C2C2A]">{d.count}</span>
                  <div
                    className="w-full rounded-t-md bg-[#1D9E75] transition-all duration-500"
                    style={{
                      height: `${(d.count / maxAppointments) * 100}%`,
                      minHeight: '8px',
                    }}
                  />
                  <span className="text-[10px] text-[#888780]">{d.day}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#1D9E75]" />
              <span className="text-xs text-[#888780]">Ocupación: {kpiData.ocupacion}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-[#E1F5EE] bg-white lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium tracking-[-0.03em] text-[#2C2C2A]">
              Actividad reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {activityFeed.slice(0, 6).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-2.5">
                    <span className="text-sm shrink-0">{activity.icon}</span>
                    <p className="text-xs text-[#2C2C2A] leading-relaxed">
                      {activity.text}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-[#E1F5EE] bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium tracking-[-0.03em] text-[#2C2C2A]">
            Acciones rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button
              className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-auto py-3 flex-col gap-2"
              onClick={() => setActiveModule('flow')}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs">Agendar cita</span>
            </Button>
            <Button
              className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white h-auto py-3 flex-col gap-2"
              onClick={() => setActiveModule('bill')}
            >
              <Send className="h-5 w-5" />
              <span className="text-xs">Enviar factura</span>
            </Button>
            <Button
              className="bg-[#5DCAA5] hover:bg-[#5DCAA5]/90 text-white h-auto py-3 flex-col gap-2"
              onClick={() => setActiveModule('grow')}
            >
              <RefreshCw className="h-5 w-5" />
              <span className="text-xs">Reactivar pacientes</span>
            </Button>
            <Button
              variant="outline"
              className="border-[#534AB7] text-[#534AB7] hover:bg-[#EEEDFE] h-auto py-3 flex-col gap-2"
              onClick={() => setActiveModule('sight')}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs">Ver reporte</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
