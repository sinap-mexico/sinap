'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { soapNote, appointments } from '@/lib/mock-data'
import { useSinapStore, type FeatureFlagState } from '@/lib/sinap-store'
import {
  Activity,
  CheckCircle2,
  Edit3,
  Sparkles,
  FileText,
  Clock,
  User,
  Stethoscope,
} from 'lucide-react'

function FeatureFlagPill({ state, onStateChange }: { state: FeatureFlagState; onStateChange: (s: FeatureFlagState) => void }) {
  return (
    <div className="inline-flex rounded-full bg-[#F1EFE8] p-0.5">
      {(['on', 'assist', 'off'] as FeatureFlagState[]).map((s) => (
        <button
          key={s}
          onClick={() => onStateChange(s)}
          className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${
            state === s
              ? s === 'on'
                ? 'bg-[#534AB7] text-white'
                : s === 'assist'
                ? 'bg-[#1D9E75] text-white'
                : 'bg-[#888780] text-white'
              : 'text-[#888780] hover:text-[#2C2C2A]'
          }`}
        >
          {s === 'on' ? 'AUTO' : s === 'assist' ? 'ASSIST' : 'OFF'}
        </button>
      ))}
    </div>
  )
}

export function FlowClinical() {
  const { featureFlags, setFeatureFlag } = useSinapStore()
  const soapFlag = featureFlags.find((f) => f.id === 'flow-soap')
  const preconsultaFlag = featureFlags.find((f) => f.id === 'flow-preconsulta')

  const pendingPreconsultas = appointments.filter(
    (a) => a.status === 'pending' || a.status === 'confirmed'
  ).slice(0, 5)

  const [selectedPatient, setSelectedPatient] = useState(pendingPreconsultas[0])

  return (
    <div className="space-y-6">
      {/* Feature flags indicator */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#534AB7]" />
          <span className="text-sm font-medium text-[#2C2C2A]">Modo SOAP</span>
          <FeatureFlagPill
            state={soapFlag?.state || 'assist'}
            onStateChange={(s) => setFeatureFlag('flow-soap', s)}
          />
        </div>
        <Separator orientation="vertical" className="h-6 bg-[#E1F5EE]" />
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-[#1D9E75]" />
          <span className="text-sm font-medium text-[#2C2C2A]">Pre-consulta</span>
          <FeatureFlagPill
            state={preconsultaFlag?.state || 'on'}
            onStateChange={(s) => setFeatureFlag('flow-preconsulta', s)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Pre-consulta queue */}
        <Card className="border-[#E1F5EE] bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium tracking-[-0.03em]">
              Cola de pre-consulta
            </CardTitle>
          </CardHeader>
          <Separator className="bg-[#E1F5EE]" />
          <ScrollArea className="max-h-96">
            <div className="p-3 space-y-2">
              {pendingPreconsultas.map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => setSelectedPatient(apt)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedPatient?.id === apt.id
                      ? 'bg-[#E1F5EE] border border-[#1D9E75]/30'
                      : 'hover:bg-[#F1EFE8]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#2C2C2A]">
                      {apt.patientName}
                    </span>
                    <span className="text-[10px] text-[#888780]">{apt.time}</span>
                  </div>
                  <p className="text-xs text-[#888780] mt-0.5">{apt.type}</p>
                  <Badge
                    className={`mt-1.5 text-[9px] border-0 ${
                      apt.status === 'confirmed'
                        ? 'bg-[#E1F5EE] text-[#1D9E75]'
                        : 'bg-[#FEF3C7] text-[#D97706]'
                    }`}
                  >
                    {apt.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                  </Badge>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* SOAP Note */}
        <Card className="border-[#E1F5EE] bg-white lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Nota SOAP
                </CardTitle>
                <p className="text-xs text-[#888780] mt-0.5">
                  {soapNote.patientName} · {soapNote.date}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                  <Sparkles className="h-3 w-3 mr-1" />
                  IA Assist
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subjetivo */}
            <div className="rounded-lg bg-[#E1F5EE] p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#1D9E75] text-white border-0 text-[10px]">S</Badge>
                  <span className="text-sm font-medium text-[#2C2C2A]">Subjetivo</span>
                  <Badge className="bg-white text-[#1D9E75] border border-[#1D9E75]/20 text-[9px]">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                    Generado por IA
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-[#888780]">
                    <Edit3 className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-[#1D9E75]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Aprobar
                  </Button>
                </div>
              </div>
              <p className="text-sm text-[#2C2C2A] leading-relaxed">{soapNote.subjective}</p>
            </div>

            {/* Objetivo */}
            <div className="rounded-lg bg-[#E1F5EE] p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#1D9E75] text-white border-0 text-[10px]">O</Badge>
                  <span className="text-sm font-medium text-[#2C2C2A]">Objetivo</span>
                  <Badge className="bg-white text-[#1D9E75] border border-[#1D9E75]/20 text-[9px]">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                    Generado por IA
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-[#888780]">
                    <Edit3 className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-[#1D9E75]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Aprobar
                  </Button>
                </div>
              </div>
              <p className="text-sm text-[#2C2C2A] leading-relaxed">{soapNote.objective}</p>
            </div>

            {/* Assessment */}
            <div className="rounded-lg bg-[#EEEDFE] p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#534AB7] text-white border-0 text-[10px]">A</Badge>
                  <span className="text-sm font-medium text-[#2C2C2A]">Assessment</span>
                  <Badge className="bg-white text-[#534AB7] border border-[#534AB7]/20 text-[9px]">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                    Sugerido por IA
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-[#888780]">
                    <Edit3 className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-[#534AB7]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Aprobar
                  </Button>
                </div>
              </div>
              <p className="text-sm text-[#2C2C2A] leading-relaxed">{soapNote.assessment}</p>
            </div>

            {/* Plan */}
            <div className="rounded-lg bg-[#EEEDFE] p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#534AB7] text-white border-0 text-[10px]">P</Badge>
                  <span className="text-sm font-medium text-[#2C2C2A]">Plan</span>
                  <Badge className="bg-white text-[#534AB7] border border-[#534AB7]/20 text-[9px]">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                    Sugerido por IA
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-[#888780]">
                    <Edit3 className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-[#534AB7]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Aprobar
                  </Button>
                </div>
              </div>
              <p className="text-sm text-[#2C2C2A] leading-relaxed whitespace-pre-line">
                {soapNote.plan}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-9">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Aprobar nota completa
              </Button>
              <Button variant="outline" className="border-[#E1F5EE] text-[#2C2C2A] h-9">
                <Edit3 className="h-4 w-4 mr-1.5" />
                Editar todo
              </Button>
              <Button variant="ghost" className="text-[#888780] h-9">
                <FileText className="h-4 w-4 mr-1.5" />
                Exportar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
