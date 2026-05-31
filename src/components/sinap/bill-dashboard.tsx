'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { invoices, kpiData, patients } from '@/lib/mock-data'
import { useSinapStore } from '@/lib/sinap-store'
import { eventBus } from '@/lib/event-bus'
import { FORMA_PAGO, METODO_PAGO, USO_CFDI, REGIMEN_FISCAL_COMMON, HEALTH_PRODUCT_CODES, UNIT_CODES } from '@/lib/facturama'
import {
  Receipt,
  DollarSign,
  Clock,
  AlertTriangle,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  Wifi,
  WifiOff,
  X,
  FileText,
  Trash2,
  TrendingUp,
  TrendingDown,
  Download,
  FileDown,
  Search,
  Filter,
  Eye,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    timbrada: { color: '#1D9E75', bg: '#E1F5EE', icon: <CheckCircle2 className="h-3 w-3" /> },
    pendiente: { color: '#D97706', bg: '#FEF3C7', icon: <Clock className="h-3 w-3" /> },
    error: { color: '#E53E3E', bg: '#FEE2E2', icon: <XCircle className="h-3 w-3" /> },
    cancelled: { color: '#888780', bg: '#F1EFE8', icon: <XCircle className="h-3 w-3" /> },
  }
  const s = config[status] || config.pendiente
  return (
    <Badge
      className="text-[10px] border-0 font-medium flex items-center gap-1"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

interface CFDIInvoice {
  id: string
  uuid: string
  patientName: string
  concept: string
  total: number
  status: string
  date: string
  paymentMethod: string
  isSimulated?: boolean
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export function BillDashboard() {
  const { clinicProfile } = useSinapStore()
  const [invoiceList, setInvoiceList] = useState<CFDIInvoice[]>(invoices.map(i => ({ ...i, isSimulated: true })))
  const [showCFDIDialog, setShowCFDIDialog] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<CFDIInvoice | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cfdiStep, setCfdiStep] = useState(0)

  // CFDI form state
  const [formPatient, setFormPatient] = useState('')
  const [formConcept, setFormConcept] = useState('')
  const [formSubtotal, setFormSubtotal] = useState('')
  const [formFormaPago, setFormFormaPago] = useState('01')
  const [formMetodoPago, setFormMetodoPago] = useState('PUE')
  const [formUsoCFDI, setFormUsoCFDI] = useState('G01')

  const facturamaConnected = process.env.NODE_ENV === 'development'
  const facturamaMode = 'sandbox'

  const timbradas = invoiceList.filter((i) => i.status === 'timbrada').length
  const pendientes = invoiceList.filter((i) => i.status === 'pendiente').length
  const errores = invoiceList.filter((i) => i.status === 'error').length
  const totalTimbrado = invoiceList
    .filter((i) => i.status === 'timbrada')
    .reduce((sum, i) => sum + i.total, 0)
  const totalPendiente = invoiceList
    .filter((i) => i.status === 'pendiente')
    .reduce((sum, i) => sum + i.total, 0)

  const handleGenerateCFDI = async () => {
    if (!formPatient || !formConcept || !formSubtotal) return

    setIsGenerating(true)
    try {
      const patient = patients.find(p => p.id === formPatient)
      const subtotal = parseFloat(formSubtotal)

      const response = await fetch('/api/facturama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: 'demo',
          patientId: formPatient,
          concept: formConcept,
          subtotal,
          ivaRate: 0.16,
          formaPago: formFormaPago,
          metodoPago: formMetodoPago,
          usoCFDI: formUsoCFDI,
          rfcReceptor: patient?.name === 'Publico en general' ? 'XAXX010101000' : 'XAXX010101000',
          nombreReceptor: patient?.name || 'Publico en general',
          rfcEmisor: clinicProfile.rfc,
          nombreEmisor: clinicProfile.name,
        }),
      })

      const data = await response.json()

      if (response.ok && data.cfdiUuid) {
        const newInvoice: CFDIInvoice = {
          id: `inv${Date.now()}`,
          uuid: data.cfdiUuid,
          patientName: patient?.name || 'Publico en general',
          concept: formConcept,
          total: data.total,
          status: 'timbrada',
          date: new Date().toISOString().split('T')[0],
          paymentMethod: formFormaPago === '01' ? 'Efectivo' : formFormaPago === '03' ? 'Transferencia' : 'Tarjeta',
          isSimulated: data.isSimulated,
        }
        setInvoiceList([newInvoice, ...invoiceList])
        setShowCFDIDialog(false)
        resetForm()
        setCfdiStep(0)
      } else {
        const errorInvoice: CFDIInvoice = {
          id: `inv${Date.now()}`,
          uuid: 'ERROR',
          patientName: patient?.name || 'Publico en general',
          concept: formConcept,
          total: subtotal * 1.16,
          status: 'error',
          date: new Date().toISOString().split('T')[0],
          paymentMethod: formFormaPago === '01' ? 'Efectivo' : 'Transferencia',
        }
        setInvoiceList([errorInvoice, ...invoiceList])
        setShowCFDIDialog(false)
        setCfdiStep(0)
      }
    } catch {
      // Error handling
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCancelCFDI = async () => {
    if (!cancelTarget) return

    setIsCancelling(true)
    try {
      const response = await fetch('/api/facturama', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: 'demo',
          cfdiUuid: cancelTarget.uuid,
          motive: '02',
        }),
      })

      if (response.ok) {
        setInvoiceList(prev => prev.map(i =>
          i.id === cancelTarget.id ? { ...i, status: 'cancelled' } : i
        ))
      }
    } catch {
      // Error handling
    } finally {
      setIsCancelling(false)
      setCancelTarget(null)
    }
  }

  const resetForm = () => {
    setFormPatient('')
    setFormConcept('')
    setFormSubtotal('')
    setFormFormaPago('01')
    setFormMetodoPago('PUE')
    setFormUsoCFDI('G01')
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                    Facturas del mes
                  </p>
                  <p className="text-3xl font-medium text-[#2C2C2A] mt-1 tracking-[-0.03em]">
                    {invoiceList.length}
                  </p>
                </div>
                <motion.div
                  className="h-10 w-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <Receipt className="h-5 w-5 text-[#1D9E75]" />
                </motion.div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-[#E1F5EE] text-[#1D9E75] border-0 text-[10px] flex items-center gap-1">
                  <TrendingUp className="h-2.5 w-2.5" />
                  {timbradas} timbradas
                </Badge>
                <Badge className="bg-[#FEE2E2] text-[#E53E3E] border-0 text-[10px]">
                  {errores} error
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                    Total facturado
                  </p>
                  <p className="text-3xl font-medium text-[#2C2C2A] mt-1 tracking-[-0.03em]">
                    ${totalTimbrado.toLocaleString('es-MX')}
                  </p>
                  <p className="text-[10px] text-[#888780]">MXN timbrado</p>
                </div>
                <motion.div
                  className="h-10 w-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <DollarSign className="h-5 w-5 text-[#1D9E75]" />
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
                    Pendientes de cobro
                  </p>
                  <p className="text-3xl font-medium text-[#2C2C2A] mt-1 tracking-[-0.03em]">
                    ${totalPendiente.toLocaleString('es-MX')}
                  </p>
                  <p className="text-[10px] text-[#888780]">MXN / {pendientes} facturas</p>
                </div>
                <motion.div
                  className="h-10 w-10 rounded-lg bg-[#FEF3C7] flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <Clock className="h-5 w-5 text-[#D97706]" />
                </motion.div>
              </div>
              <p className="text-xs text-[#D97706] mt-2 font-medium flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                {pendientes} por cobrar
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Invoices table */}
      <motion.div variants={itemVariants}>
        <Card className="border-[#E1F5EE] bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                Facturas recientes
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={`text-[10px] border-0 ${facturamaConnected ? 'bg-amber-100 text-amber-700' : 'bg-[#FEE2E2] text-[#E53E3E]'}`}>
                  {facturamaConnected ? (
                    <><Database className="h-3 w-3 mr-1" />Facturama {facturamaMode}</>
                  ) : (
                    <><WifiOff className="h-3 w-3 mr-1" />Desconectado</>
                  )}
                </Badge>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-8 text-xs"
                    onClick={() => { setShowCFDIDialog(true); setCfdiStep(0) }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Generar CFDI
                  </Button>
                </motion.div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[calc(100vh-380px)]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E1F5EE]">
                      <th className="text-left text-[10px] text-[#888780] uppercase tracking-wide pb-2 pr-4 font-medium">
                        UUID
                      </th>
                      <th className="text-left text-[10px] text-[#888780] uppercase tracking-wide pb-2 pr-4 font-medium">
                        Paciente
                      </th>
                      <th className="text-left text-[10px] text-[#888780] uppercase tracking-wide pb-2 pr-4 font-medium">
                        Concepto
                      </th>
                      <th className="text-right text-[10px] text-[#888780] uppercase tracking-wide pb-2 pr-4 font-medium">
                        Total
                      </th>
                      <th className="text-center text-[10px] text-[#888780] uppercase tracking-wide pb-2 pr-4 font-medium">
                        Estado
                      </th>
                      <th className="text-left text-[10px] text-[#888780] uppercase tracking-wide pb-2 pr-4 font-medium">
                        Fecha
                      </th>
                      <th className="text-center text-[10px] text-[#888780] uppercase tracking-wide pb-2 pr-4 font-medium">
                        Descargar
                      </th>
                      <th className="text-right text-[10px] text-[#888780] uppercase tracking-wide pb-2 font-medium">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceList.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b border-[#E1F5EE]/50 hover:bg-[#F1EFE8] transition-colors group"
                      >
                        <td className="py-3 pr-4">
                          <span className="text-xs font-mono text-[#534AB7]">
                            {inv.uuid.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-sm text-[#2C2C2A]">{inv.patientName}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-xs text-[#888780]">{inv.concept}</span>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <span className="text-sm font-medium text-[#2C2C2A]">
                            ${inv.total.toLocaleString('es-MX')}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <InvoiceStatusBadge status={inv.status} />
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-xs text-[#888780]">{inv.date}</span>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          {inv.status === 'timbrada' && (
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#534AB7]">
                                <FileDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#1D9E75]">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {inv.status === 'timbrada' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-[#E53E3E] hover:text-[#E53E3E] hover:bg-[#FEE2E2]"
                              onClick={() => setCancelTarget(inv)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Cancelar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* Generate CFDI Dialog - Step-by-step feel */}
      <Dialog open={showCFDIDialog} onOpenChange={(open) => { setShowCFDIDialog(open); if (!open) setCfdiStep(0) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-[-0.03em] flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#534AB7]" />
              Generar CFDI 4.0
            </DialogTitle>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-4">
            {[
              { step: 0, label: 'Paciente' },
              { step: 1, label: 'Concepto' },
              { step: 2, label: 'Pago' },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-2 flex-1">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                  cfdiStep >= s.step ? 'bg-[#534AB7] text-white' : 'bg-[#F1EFE8] text-[#888780]'
                }`}>
                  {cfdiStep > s.step ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.step + 1}
                </div>
                <span className={`text-[10px] ${cfdiStep >= s.step ? 'text-[#534AB7] font-medium' : 'text-[#888780]'}`}>
                  {s.label}
                </span>
                {i < 2 && <div className="flex-1 h-px bg-[#E1F5EE]" />}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[#FEF3C7] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#D97706] shrink-0" />
              <p className="text-xs text-[#D97706]">
                Modo sandbox. Los CFDIs generados no son fiscales.
              </p>
            </div>

            {cfdiStep === 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Paciente</Label>
                <Select value={formPatient} onValueChange={setFormPatient}>
                  <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]">
                    <SelectValue placeholder="Seleccionar paciente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {cfdiStep === 1 && (
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Concepto</Label>
                <Input
                  className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]"
                  placeholder="Ej: Consulta dermatologica"
                  value={formConcept}
                  onChange={(e) => setFormConcept(e.target.value)}
                />
                <Label className="text-xs text-[#888780]">Subtotal (MXN)</Label>
                <Input
                  type="number"
                  className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]"
                  placeholder="0.00"
                  value={formSubtotal}
                  onChange={(e) => setFormSubtotal(e.target.value)}
                />
                {formSubtotal && (
                  <p className="text-[10px] text-[#888780]">
                    IVA (16%): ${((parseFloat(formSubtotal) || 0) * 0.16).toFixed(2)} | Total: ${((parseFloat(formSubtotal) || 0) * 1.16).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {cfdiStep === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Forma de Pago (SAT)</Label>
                  <Select value={formFormaPago} onValueChange={setFormFormaPago}>
                    <SelectTrigger className="h-9 text-xs bg-[#F1EFE8] border-[#E1F5EE]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {FORMA_PAGO.map(fp => (
                        <SelectItem key={fp.code} value={fp.code} className="text-xs">{fp.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Metodo de Pago (SAT)</Label>
                  <Select value={formMetodoPago} onValueChange={setFormMetodoPago}>
                    <SelectTrigger className="h-9 text-xs bg-[#F1EFE8] border-[#E1F5EE]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METODO_PAGO.map(mp => (
                        <SelectItem key={mp.code} value={mp.code} className="text-xs">{mp.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Uso CFDI (SAT)</Label>
                  <Select value={formUsoCFDI} onValueChange={setFormUsoCFDI}>
                    <SelectTrigger className="h-9 text-xs bg-[#F1EFE8] border-[#E1F5EE]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {USO_CFDI.map(uc => (
                        <SelectItem key={uc.code} value={uc.code} className="text-xs">{uc.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-[#F1EFE8] text-xs text-[#888780] space-y-1">
              <p><span className="font-medium text-[#2C2C2A]">Emisor:</span> {clinicProfile.name} | RFC: {clinicProfile.rfc}</p>
              <p><span className="font-medium text-[#2C2C2A]">Receptor:</span> {formPatient ? patients.find(p => p.id === formPatient)?.name : 'Seleccionar paciente'}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {cfdiStep > 0 && (
              <Button variant="outline" className="text-sm" onClick={() => setCfdiStep(cfdiStep - 1)}>
                Anterior
              </Button>
            )}
            {cfdiStep < 2 ? (
              <Button
                className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white text-sm"
                onClick={() => setCfdiStep(cfdiStep + 1)}
                disabled={(cfdiStep === 0 && !formPatient) || (cfdiStep === 1 && (!formConcept || !formSubtotal))}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white text-sm"
                onClick={handleGenerateCFDI}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generando...</>
                ) : (
                  <><Receipt className="h-4 w-4 mr-1" />Generar CFDI</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel CFDI Dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-[-0.03em] flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#E53E3E]" />
              Cancelar CFDI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-[#2C2C2A]">
              Esta a punto de cancelar el CFDI:
            </p>
            {cancelTarget && (
              <div className="p-3 rounded-lg bg-[#FEE2E2] text-sm">
                <p className="font-medium text-[#2C2C2A]">{cancelTarget.patientName}</p>
                <p className="text-xs text-[#888780]">{cancelTarget.concept} - ${cancelTarget.total.toLocaleString('es-MX')} MXN</p>
                <p className="text-xs font-mono text-[#534AB7] mt-1">UUID: {cancelTarget.uuid}</p>
              </div>
            )}
            <p className="text-xs text-[#888780]">
              Motivo: 02 - Comprobante emitido con errores con relacion.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="text-sm" onClick={() => setCancelTarget(null)}>
              No cancelar
            </Button>
            <Button
              className="bg-[#E53E3E] hover:bg-[#E53E3E]/90 text-white text-sm"
              onClick={handleCancelCFDI}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Cancelando...</>
              ) : (
                <><X className="h-4 w-4 mr-1" />Cancelar CFDI</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
