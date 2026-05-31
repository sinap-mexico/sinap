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
import { motion } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

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
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Cash flow summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow">
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
                <motion.div
                  className="h-10 w-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <TrendingUp className="h-5 w-5 text-[#1D9E75]" />
                </motion.div>
              </div>
              <p className="text-xs text-[#1D9E75] mt-2 font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +15% vs mes anterior
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
                    ${expenses.toLocaleString('es-MX')}
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
                +3% vs mes anterior
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
                    ${netCash.toLocaleString('es-MX')}
                  </p>
                </div>
                <motion.div
                  className="h-10 w-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <DollarSign className="h-5 w-5 text-[#1D9E75]" />
                </motion.div>
              </div>
              <p className="text-xs text-[#1D9E75] mt-2 font-medium">Margen: {Math.round((netCash / income) * 100)}%</p>
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
              {staffMembers.map((staff, i) => (
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
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Inventory alerts */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="border-[#E1F5EE] bg-white h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Alertas de inventario
                </CardTitle>
                <motion.div
                  animate={inventoryAlerts.filter((i) => i.urgency === 'high').length > 0 ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Badge className="bg-[#FEE2E2] text-[#E53E3E] border-0 text-[10px]">
                    {inventoryAlerts.filter((i) => i.urgency === 'high').length} urgente
                  </Badge>
                </motion.div>
              </div>
            </CardHeader>
            <Separator className="bg-[#E1F5EE]" />
            <ScrollArea className="max-h-72">
              <div className="p-3 space-y-2">
                {inventoryAlerts.map((item, i) => {
                  const colors = urgencyColors[item.urgency]
                  return (
                    <motion.div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-[#F1EFE8]"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      whileHover={{ x: 4 }}
                    >
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: colors.bg }}
                      >
                        {item.urgency === 'high' ? (
                          <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <AlertTriangle className="h-4 w-4" style={{ color: colors.text }} />
                          </motion.div>
                        ) : (
                          <Package className="h-4 w-4" style={{ color: colors.text }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2C2C2A]">{item.item}</p>
                        <p className="text-xs text-[#888780]">
                          Stock: {item.stock} / Min: {item.minStock}
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
                    </motion.div>
                  )
                })}
              </div>
            </ScrollArea>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
