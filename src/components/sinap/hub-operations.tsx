'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSinapStore } from '@/lib/sinap-store'
import {
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface StaffMember {
  id: string
  name: string
  specialty: string
  todayAppointments: number
  avatar: string
}

// InventoryAlert interface — will be used when inventory model is added
// interface InventoryAlert {
//   id: string
//   item: string
//   stock: number
//   minStock: number
//   urgency: 'high' | 'medium' | 'low'
// }

// Inventory module not yet implemented — placeholder shown instead of fake data
const INVENTORY_ENABLED = false

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export function HubOperations() {
  const { clinicId, setClinicId, clinicSlug } = useSinapStore()
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  // Inventory alerts — will come from API when inventory model is added
  const [isLoadingStaff, setIsLoadingStaff] = useState(true)
  const [kpiData, setKpiData] = useState<{
    totalFacturado: number
    currentMonthRevenue: number
    citasHoy: number
    doctorAppointments: Array<{ doctorId: string; doctorName: string; todayCount: number }>
  }>({ totalFacturado: 0, currentMonthRevenue: 0, citasHoy: 0, doctorAppointments: [] })
  const [isLoadingKpi, setIsLoadingKpi] = useState(true)

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

  // Fetch doctors + staff from API
  const fetchStaff = useCallback(async () => {
    if (!clinicId) return
    setIsLoadingStaff(true)
    try {
      // Fetch doctors
      const doctorsRes = await fetch(`/api/doctors?clinicId=${clinicId}`)
      const doctorMap: StaffMember[] = []
      if (doctorsRes.ok) {
        const data = await doctorsRes.json()
        for (const doc of (data.doctors || [])) {
          doctorMap.push({
            id: doc.id as string,
            name: doc.name as string,
            specialty: (doc.specialty as string) || 'General',
            todayAppointments: 0,
            avatar: (doc.name as string).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
          })
        }
      }

      // Fetch non-doctor staff (receptionists, assistants, admins)
      const staffRes = await fetch(`/api/staff?clinicId=${clinicId}`)
      if (staffRes.ok) {
        const staffData = await staffRes.json()
        const staffRoles: Record<string, string> = {
          receptionist: 'Recepción',
          assistant: 'Asistente',
          admin: 'Administración',
        }
        for (const s of (staffData.staff || [])) {
          doctorMap.push({
            id: s.id as string,
            name: s.name as string,
            specialty: staffRoles[s.role as string] || s.role as string,
            todayAppointments: 0,
            avatar: (s.name as string).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
          })
        }
      }

      setStaffMembers(doctorMap)
    } catch (err) {
      console.error('Failed to fetch staff:', err)
    } finally {
      setIsLoadingStaff(false)
    }
  }, [clinicId])

  // Fetch KPI data for cash flow
  const fetchKpi = useCallback(async () => {
    if (!clinicId) return
    setIsLoadingKpi(true)
    try {
      const res = await fetch(`/api/dashboard/kpi?clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        setKpiData({
          totalFacturado: data.kpi?.totalFacturado || 0,
          currentMonthRevenue: data.currentMonthRevenue || 0,
          citasHoy: data.kpi?.citasHoy || 0,
          doctorAppointments: data.doctorAppointments || [],
        })
      }
    } catch (err) {
      console.error('Failed to fetch KPI:', err)
    } finally {
      setIsLoadingKpi(false)
    }
  }, [clinicId])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  useEffect(() => {
    fetchKpi()
  }, [fetchKpi])

  // When both staff and doctorAppointments are available, merge counts
  useEffect(() => {
    if (staffMembers.length === 0 || kpiData.doctorAppointments.length === 0) return
    const apptMap = new Map(kpiData.doctorAppointments.map(d => [d.doctorId, d.todayCount]))
    setStaffMembers(prev =>
      prev.map(s => ({
        ...s,
        todayAppointments: apptMap.get(s.id) || 0,
      }))
    )
  }, [kpiData.doctorAppointments])

  const income = kpiData.currentMonthRevenue || kpiData.totalFacturado
  const expenses = Math.round(income * 0.42) // Approximate expenses as ~42% of revenue for demo
  const netCash = income - expenses

  // urgencia colores — will be used when inventory model is added
  // const urgencyColors: Record<string, { bg: string; text: string }> = { ... }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Cash flow summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="border-[#EEEDFE] bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                    Citas hoy
                  </p>
                  <p className="text-3xl font-medium text-[#534AB7] mt-1 tracking-[-0.03em]">
                    {isLoadingKpi ? '—' : kpiData.citasHoy}
                  </p>
                </div>
                <motion.div
                  className="h-10 w-10 rounded-lg bg-[#EEEDFE] flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <Calendar className="h-5 w-5 text-[#534AB7]" />
                </motion.div>
              </div>
              <p className="text-xs text-[#534AB7] mt-2 font-medium">
                Programadas
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                    Ingresos del mes
                  </p>
                  <p className="text-3xl font-medium text-[#2C2C2A] mt-1 tracking-[-0.03em]">
                    {isLoadingKpi ? '—' : `$${income.toLocaleString('es-MX')}`}
                  </p>
                </div>
                <motion.div
                  className="h-10 w-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <TrendingUp className="h-5 w-5 text-[#1D9E75]" />
                </motion.div>
              </div>
              <p className="text-xs text-[#1D9E75] mt-2 font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                MXN facturado
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                    Egresos del mes
                  </p>
                  <p className="text-3xl font-medium text-[#2C2C2A] mt-1 tracking-[-0.03em]">
                    {isLoadingKpi ? '—' : `$${expenses.toLocaleString('es-MX')}`}
                  </p>
                </div>
                <motion.div
                  className="h-10 w-10 rounded-lg bg-[#FEE2E2] flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <TrendingDown className="h-5 w-5 text-[#E53E3E]" />
                </motion.div>
              </div>
              <p className="text-xs text-[#E53E3E] mt-2 font-medium flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Estimado
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                    Flujo neto
                  </p>
                  <p className="text-3xl font-medium text-[#1D9E75] mt-1 tracking-[-0.03em]">
                    {isLoadingKpi ? '—' : `$${netCash.toLocaleString('es-MX')}`}
                  </p>
                </div>
                <motion.div
                  className="h-10 w-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <DollarSign className="h-5 w-5 text-[#1D9E75]" />
                </motion.div>
              </div>
              <p className="text-xs text-[#1D9E75] mt-2 font-medium">
                Margen: {income > 0 ? Math.round((netCash / income) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Staff overview */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="border-[#E1F5EE] bg-white h-full flex flex-col">
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
              {isLoadingStaff ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-[#534AB7]" />
                </div>
              ) : staffMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="h-8 w-8 text-[#888780]/30 mb-2" />
                  <p className="text-xs text-[#888780]">No hay doctores registrados</p>
                </div>
              ) : (
                staffMembers.map((staff, i) => (
                  <motion.div
                    key={staff.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#F1EFE8]"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    whileHover={{ x: 4, backgroundColor: '#EEEDFE' }}
                  >
                    <motion.div
                      className="h-10 w-10 rounded-full bg-[#534AB7] flex items-center justify-center shrink-0"
                      whileHover={{ scale: 1.1 }}
                    >
                      <span className="text-sm font-medium text-white">{staff.avatar}</span>
                    </motion.div>
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
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </motion.div>

        {/* Inventory alerts — coming soon */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="border-[#E1F5EE] bg-white h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Alertas de inventario
                </CardTitle>
                <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[10px]">
                  Proximamente
                </Badge>
              </div>
            </CardHeader>
            <Separator className="bg-[#E1F5EE]" />
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <motion.div
                className="h-16 w-16 rounded-full bg-[#EEEDFE] flex items-center justify-center mb-4"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Package className="h-8 w-8 text-[#534AB7]" />
              </motion.div>
              <p className="text-sm font-medium text-[#2C2C2A]">
                Inventario inteligente
              </p>
              <p className="text-xs text-[#888780] mt-1 max-w-[250px]">
                La IA sugerira reabastecimiento de insumos y generara alertas automaticas cuando el stock este bajo.
              </p>
              <Badge className="mt-3 bg-[#1D9E75]/10 text-[#1D9E75] border-0 text-[10px]">
                Habilitar en Feature Flags
              </Badge>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
