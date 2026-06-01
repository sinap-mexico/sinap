'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useSinapStore } from '@/lib/sinap-store'
import {
  TrendingUp,
  Users,
  UserPlus,
  UserMinus,
  Crown,
  Clock,
  Send,
  BarChart3,
  Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface PatientSegments {
  new: number
  active: number
  inactive: number
  churned: number
  vip: number
}

interface FunnelStage {
  stage: string
  count: number
  color: string
}

interface Campaign {
  id: string
  name: string
  segment: string
  patients: number
  sent: number
  responses: number
  status: string
}

const segmentConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  new: { color: '#534AB7', bg: '#EEEDFE', icon: <UserPlus className="h-4 w-4" />, label: 'Nuevos' },
  active: { color: '#1D9E75', bg: '#E1F5EE', icon: <Users className="h-4 w-4" />, label: 'Activos' },
  inactive: { color: '#D97706', bg: '#FEF3C7', icon: <Clock className="h-4 w-4" />, label: 'Inactivos' },
  churned: { color: '#E53E3E', bg: '#FEE2E2', icon: <UserMinus className="h-4 w-4" />, label: 'Perdidos' },
  vip: { color: '#534AB7', bg: '#EEEDFE', icon: <Crown className="h-4 w-4" />, label: 'VIP' },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export function GrowMarketing() {
  const { clinicId, setClinicId, clinicSlug } = useSinapStore()
  const [patientSegments, setPatientSegments] = useState<PatientSegments>({ new: 0, active: 0, inactive: 0, churned: 0, vip: 0 })
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Resolve clinicId on mount if needed
  useEffect(() => {
    async function resolveClinicId() {
      if (clinicId) return
      try {
        const res = await fetch(`/api/clinic?slug=${encodeURIComponent(clinicSlug)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.clinic?.id) {
            setClinicId(data.clinic.id)
          }
        }
      } catch (err) {
        console.error('Failed to resolve clinicId:', err)
      }
    }
    resolveClinicId()
  }, [clinicId, clinicSlug, setClinicId])

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!clinicId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/analytics?clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.patientSegments) {
          setPatientSegments(data.patientSegments)
        }
        if (data.funnelData) {
          setFunnelData(data.funnelData)
        }
        if (data.campaigns) {
          setCampaigns(data.campaigns)
        }
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [clinicId])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const maxFunnel = Math.max(...funnelData.map((d) => d.count), 1)

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Patient segments */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <motion.div key={i} variants={itemVariants}>
              <Card className="border-[#E1F5EE] bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-center h-16">
                    <Loader2 className="h-5 w-5 animate-spin text-[#534AB7]" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          Object.entries(patientSegments).map(([key, count], i) => {
            const config = segmentConfig[key]
            if (!config) return null
            return (
              <motion.div key={key} variants={itemVariants}>
                <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <motion.div
                      className="h-9 w-9 rounded-lg flex items-center justify-center mb-3"
                      style={{ backgroundColor: config.bg }}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <span style={{ color: config.color }}>{config.icon}</span>
                    </motion.div>
                    <p className="text-2xl font-medium text-[#2C2C2A] tracking-[-0.03em]">{count}</p>
                    <p className="text-xs text-[#888780] mt-0.5">{config.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Funnel visualization */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="border-[#E1F5EE] bg-white h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Embudo de conversion
                </CardTitle>
                <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Sinap Sight
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-[#534AB7]" />
                </div>
              ) : funnelData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="h-8 w-8 text-[#888780]/30 mb-2" />
                  <p className="text-xs text-[#888780]">Sin datos de embudo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {funnelData.map((stage, i) => (
                    <motion.div
                      key={stage.stage}
                      className="space-y-1"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#2C2C2A] font-medium">{stage.stage}</span>
                        <span className="text-sm text-[#888780]">{stage.count}</span>
                      </div>
                      <div className="h-8 bg-[#F1EFE8] rounded-lg overflow-hidden">
                        <motion.div
                          className="h-full rounded-lg flex items-center justify-end pr-3"
                          style={{ backgroundColor: stage.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(stage.count / maxFunnel) * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: 'easeOut' }}
                        >
                          <span className="text-[10px] text-white font-medium">
                            {Math.round((stage.count / maxFunnel) * 100)}%
                          </span>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              <motion.div
                className="mt-4 p-3 bg-[#EEEDFE] rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#534AB7]" />
                  <span className="text-xs font-medium text-[#534AB7]">Insight IA</span>
                </div>
                <p className="text-xs text-[#2C2C2A] mt-1">
                  {funnelData.length >= 2 && funnelData[1].count > 0
                    ? `Tasa de conversion Lead a Primera cita: ${Math.round((funnelData[1].count / Math.max(funnelData[0].count, 1)) * 100)}%. ${funnelData[1].count > 0 ? 'El punto de mayor caida es Recurrente a VIP.' : 'Necesitas mas datos para insights.'}`
                    : 'Necesitas mas datos de pacientes para generar insights del embudo.'}
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Campaigns */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="border-[#E1F5EE] bg-white h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Campanas de reactivacion
                </CardTitle>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white h-7 text-xs">
                    <Send className="h-3 w-3 mr-1" />
                    Nueva campana
                  </Button>
                </motion.div>
              </div>
            </CardHeader>
            <Separator className="bg-[#E1F5EE]" />
            <ScrollArea className="max-h-[calc(100vh-380px)]">
              <div className="p-3 space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-[#534AB7]" />
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Send className="h-8 w-8 text-[#888780]/30 mb-2" />
                    <p className="text-xs text-[#888780]">No hay campanas activas</p>
                    <p className="text-[10px] text-[#888780]/70 mt-1">Crea una campana para reactivar pacientes inactivos</p>
                  </div>
                ) : (
                  campaigns.map((camp, i) => (
                    <motion.div
                      key={camp.id}
                      className="p-3 rounded-lg bg-[#F1EFE8] hover:bg-[#F1EFE8]/80 transition-colors"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      whileHover={{ x: 2 }}
                    >
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
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-[#888780]">Tasa de respuesta</span>
                            <span className="text-[10px] font-medium text-[#1D9E75]">
                              {Math.round((camp.responses / camp.sent) * 100)}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-white rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-[#1D9E75] rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${(camp.responses / camp.sent) * 100}%` }}
                              transition={{ duration: 0.6, delay: 0.5 }}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
