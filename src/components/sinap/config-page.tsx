'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useSinapStore, type FeatureFlagState, type SinapModule } from '@/lib/sinap-store'
import { clinic } from '@/lib/mock-data'
import {
  Settings,
  MessageSquare,
  Activity,
  Receipt,
  TrendingUp,
  BarChart3,
  Building2,
  Wifi,
  WifiOff,
  AlertTriangle,
  Zap,
  Shield,
  Database,
} from 'lucide-react'

const moduleIcons: Record<string, React.ElementType> = {
  desk: MessageSquare,
  flow: Activity,
  bill: Receipt,
  grow: TrendingUp,
  sight: BarChart3,
  hub: Building2,
}

const moduleLabels: Record<string, string> = {
  desk: 'Sinap Desk',
  flow: 'Sinap Flow',
  bill: 'Sinap Bill',
  grow: 'Sinap Grow',
  sight: 'Sinap Sight',
  hub: 'Sinap Hub',
}

function TriToggle({
  state,
  onStateChange,
}: {
  state: FeatureFlagState
  onStateChange: (s: FeatureFlagState) => void
}) {
  return (
    <div className="inline-flex rounded-full bg-[#F1EFE8] p-0.5">
      {([
        { key: 'on' as FeatureFlagState, label: 'ON', color: '#534AB7' },
        { key: 'assist' as FeatureFlagState, label: 'ASSIST', color: '#1D9E75' },
        { key: 'off' as FeatureFlagState, label: 'OFF', color: '#888780' },
      ]).map((opt) => (
        <button
          key={opt.key}
          onClick={() => onStateChange(opt.key)}
          className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${
            state === opt.key ? 'text-white' : 'text-[#888780] hover:text-[#2C2C2A]'
          }`}
          style={state === opt.key ? { backgroundColor: opt.color } : undefined}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function ConfigPage() {
  const { featureFlags, setFeatureFlag, clinicMode, setClinicMode, clinicName, setClinicName } =
    useSinapStore()

  // Group flags by module
  const grouped = featureFlags.reduce(
    (acc, flag) => {
      if (!acc[flag.module]) acc[flag.module] = []
      acc[flag.module].push(flag)
      return acc
    },
    {} as Record<string, typeof featureFlags>
  )

  return (
    <div className="space-y-6">
      {/* Feature Flags */}
      <Card className="border-[#E1F5EE] bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#534AB7]" />
              <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                Feature Flags
              </CardTitle>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#534AB7]" />
                ON = Auto
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#1D9E75]" />
                ASSIST = Híbrido
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#888780]" />
                OFF = Manual
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(grouped).map(([module, flags]) => {
              const Icon = moduleIcons[module] || Settings
              return (
                <div key={module}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded bg-[#EEEDFE] flex items-center justify-center">
                      <Icon className="h-3.5 w-3.5 text-[#534AB7]" />
                    </div>
                    <span className="text-sm font-medium text-[#2C2C2A]">
                      {moduleLabels[module] || module}
                    </span>
                  </div>
                  <div className="space-y-3 pl-8">
                    {flags.map((flag) => (
                      <div
                        key={flag.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#F1EFE8]"
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="text-sm font-medium text-[#2C2C2A]">{flag.name}</p>
                          <p className="text-xs text-[#888780] mt-0.5">{flag.description}</p>
                        </div>
                        <TriToggle
                          state={flag.state}
                          onStateChange={(s) => setFeatureFlag(flag.id, s)}
                        />
                      </div>
                    ))}
                  </div>
                  <Separator className="bg-[#E1F5EE] mt-4" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clinic Settings */}
        <Card className="border-[#E1F5EE] bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-[#534AB7]" />
              <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                Datos de la clínica
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Nombre de la clínica</Label>
              <Input
                defaultValue={clinic.name}
                className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">RFC</Label>
              <Input
                defaultValue={clinic.rfc}
                className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Teléfono</Label>
              <Input
                defaultValue={clinic.phone}
                className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Dirección</Label>
              <Input
                defaultValue={clinic.address}
                className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Modo de clínica</Label>
              <div className="inline-flex rounded-full bg-[#F1EFE8] p-0.5">
                <button
                  onClick={() => setClinicMode('solo')}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    clinicMode === 'solo'
                      ? 'bg-[#534AB7] text-white'
                      : 'text-[#888780] hover:text-[#2C2C2A]'
                  }`}
                >
                  Solo
                </button>
                <button
                  onClick={() => setClinicMode('clinic')}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    clinicMode === 'clinic'
                      ? 'bg-[#534AB7] text-white'
                      : 'text-[#888780] hover:text-[#2C2C2A]'
                  }`}
                >
                  Clínica
                </button>
              </div>
            </div>
            <Button className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-9">
              Guardar cambios
            </Button>
          </CardContent>
        </Card>

        {/* API Status */}
        <Card className="border-[#E1F5EE] bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#534AB7]" />
              <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                Estado de integraciones
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Meta API */}
            <div className="p-4 rounded-lg bg-[#F1EFE8]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#2C2C2A]">Meta Business API</span>
                </div>
                <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Simulación
                </Badge>
              </div>
              <p className="text-xs text-[#888780]">
                WhatsApp Business API no conectada. Las conversaciones son simuladas.
              </p>
              <Button variant="outline" className="mt-2 h-7 text-xs border-[#534AB7] text-[#534AB7]">
                Conectar API
              </Button>
            </div>

            {/* Facturama */}
            <div className="p-4 rounded-lg bg-[#F1EFE8]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#2C2C2A]">Facturama</span>
                </div>
                <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
                  <Database className="h-3 w-3 mr-1" />
                  Sandbox
                </Badge>
              </div>
              <p className="text-xs text-[#888780]">
                Conectado en modo sandbox. CFDIs no son fiscales.
              </p>
              <div className="mt-2 inline-flex rounded-full bg-[#F1EFE8] p-0.5">
                <button className="px-3 py-1 rounded-full text-[10px] font-medium bg-amber-500 text-white">
                  Sandbox
                </button>
                <button className="px-3 py-1 rounded-full text-[10px] font-medium text-[#888780] hover:text-[#2C2C2A]">
                  Producción
                </button>
              </div>
            </div>

            {/* Sinap OS Status */}
            <div className="p-4 rounded-lg bg-[#E1F5EE]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#2C2C2A]">Sinap OS</span>
                </div>
                <Badge className="bg-[#E1F5EE] text-[#1D9E75] border-0 text-[10px]">
                  <Wifi className="h-3 w-3 mr-1" />
                  Activo
                </Badge>
              </div>
              <p className="text-xs text-[#888780]">
                Orchestrador funcionando. 7 agentes conectados. Último latido: hace 2s.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
