'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { patientSegments, campaigns, funnelData } from '@/lib/mock-data'
import {
  TrendingUp,
  Users,
  UserPlus,
  UserMinus,
  Crown,
  Clock,
  Send,
  BarChart3,
} from 'lucide-react'

const segmentConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  new: { color: '#534AB7', bg: '#EEEDFE', icon: <UserPlus className="h-4 w-4" />, label: 'Nuevos' },
  active: { color: '#1D9E75', bg: '#E1F5EE', icon: <Users className="h-4 w-4" />, label: 'Activos' },
  inactive: { color: '#D97706', bg: '#FEF3C7', icon: <Clock className="h-4 w-4" />, label: 'Inactivos' },
  churned: { color: '#E53E3E', bg: '#FEE2E2', icon: <UserMinus className="h-4 w-4" />, label: 'Perdidos' },
  vip: { color: '#534AB7', bg: '#EEEDFE', icon: <Crown className="h-4 w-4" />, label: 'VIP' },
}

export function GrowMarketing() {
  const maxFunnel = Math.max(...funnelData.map((d) => d.count))

  return (
    <div className="space-y-6">
      {/* Patient segments */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(patientSegments).map(([key, count]) => {
          const config = segmentConfig[key]
          return (
            <Card key={key} className="border-[#E1F5EE] bg-white">
              <CardContent className="p-4">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: config.bg }}
                >
                  <span style={{ color: config.color }}>{config.icon}</span>
                </div>
                <p className="text-2xl font-medium text-[#2C2C2A] tracking-[-0.03em]">{count}</p>
                <p className="text-xs text-[#888780] mt-0.5">{config.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel visualization */}
        <Card className="border-[#E1F5EE] bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                Embudo de conversión
              </CardTitle>
              <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                <BarChart3 className="h-3 w-3 mr-1" />
                Sinap Sight
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelData.map((stage) => (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#2C2C2A] font-medium">{stage.stage}</span>
                    <span className="text-sm text-[#888780]">{stage.count}</span>
                  </div>
                  <div className="h-8 bg-[#F1EFE8] rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-3"
                      style={{
                        width: `${(stage.count / maxFunnel) * 100}%`,
                        backgroundColor: stage.color,
                      }}
                    >
                      <span className="text-[10px] text-white font-medium">
                        {Math.round((stage.count / maxFunnel) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-[#EEEDFE] rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#534AB7]" />
                <span className="text-xs font-medium text-[#534AB7]">Insight IA</span>
              </div>
              <p className="text-xs text-[#2C2C2A] mt-1">
                Tasa de conversión Lead → Primera cita: 56.7%. Por encima del promedio del sector (42%). El punto de mayor caída es Recurrente → VIP.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card className="border-[#E1F5EE] bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                Campañas de reactivación
              </CardTitle>
              <Button className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white h-7 text-xs">
                <Send className="h-3 w-3 mr-1" />
                Nueva campaña
              </Button>
            </div>
          </CardHeader>
          <Separator className="bg-[#E1F5EE]" />
          <ScrollArea className="max-h-96">
            <div className="p-3 space-y-3">
              {campaigns.map((camp) => (
                <div key={camp.id} className="p-3 rounded-lg bg-[#F1EFE8]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#2C2C2A]">{camp.name}</span>
                    <Badge
                      className={`text-[9px] border-0 ${
                        camp.status === 'active'
                          ? 'bg-[#E1F5EE] text-[#1D9E75]'
                          : camp.status === 'completed'
                          ? 'bg-[#EEEDFE] text-[#534AB7]'
                          : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}
                    >
                      {camp.status === 'active'
                        ? 'Activa'
                        : camp.status === 'completed'
                        ? 'Completada'
                        : 'Pendiente'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#888780]">
                    <span>{camp.patients} pacientes</span>
                    <span>{camp.sent} enviados</span>
                    <span>{camp.responses} respuestas</span>
                  </div>
                  {camp.sent > 0 && (
                    <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1D9E75] rounded-full"
                        style={{
                          width: `${(camp.responses / camp.sent) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-[#888780] mt-1">
                    Tasa de respuesta:{' '}
                    {camp.sent > 0
                      ? `${Math.round((camp.responses / camp.sent) * 100)}%`
                      : 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}
