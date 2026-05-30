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
} from 'lucide-react'

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

export function BillDashboard() {
  const { clinicProfile } = useSinapStore()
  const [invoiceList, setInvoiceList] = useState<CFDIInvoice[]>(invoices.map(i => ({ ...i, isSimulated: true })))
  const [showCFDIDialog, setShowCFDIDialog] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<CFDIInvoice | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  // CFDI form state
  const [formPatient, setFormPatient] = useState('')
  const [formConcept, setFormConcept] = useState('')
  const [formSubtotal, setFormSubtotal] = useState('')
  const [formFormaPago, setFormFormaPago] = useState('01')
  const [formMetodoPago, setFormMetodoPago] = useState('PUE')
  const [formUsoCFDI, setFormUsoCFDI] = useState('G01')

  const facturamaConnected = process.env.NODE_ENV === 'development' // Always show as sandbox
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

  const formaPagoLabels: Record<string, string> = {
    '01': '01 - Efectivo',
    '03': '03 - Transferencia',
    '04': '04 - Tarjeta',
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-[#E1F5EE] bg-white">
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
              <div className="h-10 w-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center">
                <Receipt className="h-5 w-5 text-[#1D9E75]" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-[#E1F5EE] text-[#1D9E75] border-0 text-[10px]">
                {timbradas} timbradas
              </Badge>
              <Badge className="bg-[#FEE2E2] text-[#E53E3E] border-0 text-[10px]">
                {errores} error
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E1F5EE] bg-white">
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
              <div className="h-10 w-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-[#1D9E75]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E1F5EE] bg-white">
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
              <div className="h-10 w-10 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
                <Clock className="h-5 w-5 text-[#D97706]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices table */}
      <Card className="border-[#E1F5EE] bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium tracking-[-0.03em]">
              Facturas recientes
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Facturama connection status */}
              <Badge className={`text-[10px] border-0 ${facturamaConnected ? 'bg-amber-100 text-amber-700' : 'bg-[#FEE2E2] text-[#E53E3E]'}`}>
                {facturamaConnected ? (
                  <><Database className="h-3 w-3 mr-1" />Facturama {facturamaMode}</>
                ) : (
                  <><WifiOff className="h-3 w-3 mr-1" />Desconectado</>
                )}
              </Badge>
              <Button
                className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-8 text-xs"
                onClick={() => setShowCFDIDialog(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Generar CFDI
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96">
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
                    <th className="text-right text-[10px] text-[#888780] uppercase tracking-wide pb-2 font-medium">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceList.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-[#E1F5EE]/50 hover:bg-[#F1EFE8] transition-colors"
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

      {/* Generate CFDI Dialog */}
      <Dialog open={showCFDIDialog} onOpenChange={setShowCFDIDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-[-0.03em] flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#534AB7]" />
              Generar CFDI 4.0
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[#FEF3C7] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#D97706] shrink-0" />
              <p className="text-xs text-[#D97706]">
                Modo sandbox. Los CFDIs generados no son fiscales.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Paciente</Label>
              <Select value={formPatient} onValueChange={setFormPatient}>
                <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE]">
                  <SelectValue placeholder="Seleccionar paciente..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Concepto</Label>
              <Input
                className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                placeholder="Ej: Consulta dermatologica"
                value={formConcept}
                onChange={(e) => setFormConcept(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Subtotal (MXN)</Label>
              <Input
                type="number"
                className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
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

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Forma de Pago</Label>
                <Select value={formFormaPago} onValueChange={setFormFormaPago}>
                  <SelectTrigger className="h-9 text-xs bg-[#F1EFE8] border-[#E1F5EE]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01">01 Efectivo</SelectItem>
                    <SelectItem value="03">03 Transferencia</SelectItem>
                    <SelectItem value="04">04 Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Metodo de Pago</Label>
                <Select value={formMetodoPago} onValueChange={setFormMetodoPago}>
                  <SelectTrigger className="h-9 text-xs bg-[#F1EFE8] border-[#E1F5EE]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUE">PUE</SelectItem>
                    <SelectItem value="PPD">PPD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Uso CFDI</Label>
                <Select value={formUsoCFDI} onValueChange={setFormUsoCFDI}>
                  <SelectTrigger className="h-9 text-xs bg-[#F1EFE8] border-[#E1F5EE]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="G01">G01</SelectItem>
                    <SelectItem value="G02">G02</SelectItem>
                    <SelectItem value="G03">G03</SelectItem>
                    <SelectItem value="I01">I01</SelectItem>
                    <SelectItem value="P01">P01</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#F1EFE8] text-xs text-[#888780] space-y-1">
              <p><span className="font-medium text-[#2C2C2A]">Emisor:</span> {clinicProfile.name} | RFC: {clinicProfile.rfc}</p>
              <p><span className="font-medium text-[#2C2C2A]">Receptor:</span> {formPatient ? patients.find(p => p.id === formPatient)?.name : 'Seleccionar paciente'}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="text-sm"
              onClick={() => { setShowCFDIDialog(false); resetForm() }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white text-sm"
              onClick={handleGenerateCFDI}
              disabled={isGenerating || !formPatient || !formConcept || !formSubtotal}
            >
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generando...</>
              ) : (
                <><Receipt className="h-4 w-4 mr-1" />Generar CFDI</>
              )}
            </Button>
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
    </div>
  )
}
