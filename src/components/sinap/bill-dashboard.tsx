'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { useSinapStore } from '@/lib/sinap-store'
import { eventBus } from '@/lib/event-bus'
import { FORMA_PAGO, METODO_PAGO, USO_CFDI } from '@/lib/facturama'
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
  WifiOff,
  X,
  FileText,
  Trash2,
  TrendingUp,
  TrendingDown,
  Download,
  FileDown,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    timbrada: { color: '#1D9E75', bg: '#E1F5EE', icon: <CheckCircle2 className="h-3 w-3" /> },
    pendiente: { color: '#D97706', bg: '#FEF3C7', icon: <Clock className="h-3 w-3" /> },
    pending: { color: '#D97706', bg: '#FEF3C7', icon: <Clock className="h-3 w-3" /> },
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
  paymentStatus: string
  date: string
  paymentMethod: string
  isSimulated?: boolean
  appointmentId?: string | null
  appointmentDate?: string | null
  appointmentDoctor?: string | null
}

interface PatientOption {
  id: string
  fullName: string
  rfc?: string | null
}

interface ClinicBillingConfig {
  rfc: string | null
  regimenFiscal: string | null
  name: string | null
  facturamaUserId: string | null
  facturamaToken: string | null
  facturamaSandbox: boolean
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
  const { clinicProfile, clinicId, setClinicId, clinicSlug } = useSinapStore()
  const [invoiceList, setInvoiceList] = useState<CFDIInvoice[]>([])
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true)
  const [isLoadingPatients, setIsLoadingPatients] = useState(true)
  const [showCFDIDialog, setShowCFDIDialog] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<CFDIInvoice | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cfdiStep, setCfdiStep] = useState(0)

  // Mark as paid state
  const [payTarget, setPayTarget] = useState<CFDIInvoice | null>(null)
  const [payMethod, setPayMethod] = useState('01')
  const [payAmount, setPayAmount] = useState<string>('')
  const [payReference, setPayReference] = useState('')
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)

  // Payment history state
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null)
  const [invoicePayments, setInvoicePayments] = useState<Record<string, { id: string; amount: number; formaPago: string; reference: string | null; createdAt: string }[]>>({})

  // Clinic billing config from DB
  const [clinicBilling, setClinicBilling] = useState<ClinicBillingConfig | null>(null)
  const [isLoadingBilling, setIsLoadingBilling] = useState(true)

  // Derived: facturamaConnected based on DB data
  const facturamaConnected = clinicBilling
    ? !!(clinicBilling.facturamaToken || clinicBilling.facturamaSandbox)
    : false
  const facturamaMode = clinicBilling?.facturamaSandbox ? 'sandbox' : clinicBilling?.facturamaToken ? 'producción' : 'desconectado'

  // CFDI form state
  const [formPatient, setFormPatient] = useState('')
  const [formConcept, setFormConcept] = useState('')
  const [formSubtotal, setFormSubtotal] = useState('')
  const [formFormaPago, setFormFormaPago] = useState('01')
  const [formMetodoPago, setFormMetodoPago] = useState('PUE')
  const [formUsoCFDI, setFormUsoCFDI] = useState('G01')
  const [formIvaRate, setFormIvaRate] = useState(0) // 0 = exento (salud), 0.16 = 16%

  // Resolve clinicId on mount if needed, and fetch billing config
  useEffect(() => {
    async function resolveClinicAndBilling() {
      if (!clinicId) {
        // Try to resolve clinicId first
        try {
          const res = await fetch(`/api/clinic?slug=${encodeURIComponent(clinicSlug)}`)
          if (res.ok) {
            const data = await res.json()
            if (data.clinic?.id) {
              setClinicId(data.clinic.id)
              // Also store billing config from this response
              setClinicBilling({
                rfc: data.clinic.rfc || null,
                regimenFiscal: data.clinic.regimenFiscal || null,
                name: data.clinic.name || null,
                facturamaUserId: data.clinic.facturamaUserId || null,
                facturamaToken: data.clinic.facturamaToken || null,
                facturamaSandbox: data.clinic.facturamaSandbox ?? true,
              })
              setIsLoadingBilling(false)
              return
            }
          }
        } catch (err) {
          console.error('Failed to resolve clinicId:', err)
        }
        setIsLoadingBilling(false)
        return
      }

      // clinicId is already available — fetch billing config
      setIsLoadingBilling(true)
      try {
        const res = await fetch(`/api/clinic?clinicId=${encodeURIComponent(clinicId)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.clinic) {
            setClinicBilling({
              rfc: data.clinic.rfc || null,
              regimenFiscal: data.clinic.regimenFiscal || null,
              name: data.clinic.name || null,
              facturamaUserId: data.clinic.facturamaUserId || null,
              facturamaToken: data.clinic.facturamaToken || null,
              facturamaSandbox: data.clinic.facturamaSandbox ?? true,
            })
          }
        }
      } catch (err) {
        console.error('Failed to fetch clinic billing config:', err)
      } finally {
        setIsLoadingBilling(false)
      }
    }
    resolveClinicAndBilling()
  }, [clinicId, clinicSlug, setClinicId])

  // Fetch invoices from API
  const fetchInvoices = useCallback(async () => {
    if (!clinicId) return
    setIsLoadingInvoices(true)
    try {
      const res = await fetch(`/api/invoices?clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        const mapped: CFDIInvoice[] = (data.invoices || []).map((inv: Record<string, unknown>) => {
          const apt = inv.appointment as Record<string, unknown> | null
          return {
            id: inv.id as string,
            uuid: (inv.cfdiUuid as string) || 'PENDING',
            patientName: (inv.patient as Record<string, unknown>)?.fullName as string || 'Desconocido',
            concept: (inv.concepto as string) || '',
            total: (inv.total as number) || 0,
            status: (inv.status as string) || 'pending',
            paymentStatus: (inv.paymentStatus as string) || 'unpaid',
            date: inv.createdAt ? new Date(inv.createdAt as string).toISOString().split('T')[0] : '',
            paymentMethod: (inv.formaPago as string) === '01' ? 'Efectivo' : (inv.formaPago as string) === '03' ? 'Transferencia' : 'Tarjeta',
            isSimulated: false,
            appointmentId: (inv.appointmentId as string) || null,
            appointmentDate: apt?.date ? new Date(apt.date as string).toLocaleDateString('es-MX') : null,
            appointmentDoctor: (apt?.doctor as Record<string, unknown>)?.name as string || null,
          }
        })
        setInvoiceList(mapped)
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err)
    } finally {
      setIsLoadingInvoices(false)
    }
  }, [clinicId])

  // Fetch patients from API
  const fetchPatients = useCallback(async () => {
    if (!clinicId) return
    setIsLoadingPatients(true)
    try {
      const res = await fetch(`/api/patients?clinicId=${clinicId}`)
      if (res.ok) {
        const data = await res.json()
        setPatients(
          (data.patients || []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            fullName: p.fullName as string,
            rfc: p.rfc as string | null,
          }))
        )
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err)
    } finally {
      setIsLoadingPatients(false)
    }
  }, [clinicId])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  const timbradas = invoiceList.filter((i) => i.status === 'timbrada').length
  const pendientes = invoiceList.filter((i) => i.status === 'pendiente' || i.status === 'pending').length
  const errores = invoiceList.filter((i) => i.status === 'error').length
  const pagadas = invoiceList.filter((i) => i.paymentStatus === 'paid').length
  const totalTimbrado = invoiceList
    .filter((i) => i.status === 'timbrada')
    .reduce((sum, i) => sum + i.total, 0)
  const totalPendiente = invoiceList
    .filter((i) => (i.status === 'pendiente' || i.status === 'pending') && i.paymentStatus !== 'paid')
    .reduce((sum, i) => sum + i.total, 0)
  const totalCobrado = invoiceList
    .filter((i) => i.paymentStatus === 'paid')
    .reduce((sum, i) => sum + i.total, 0)

  // Use DB-driven emisor info, fallback to store profile, fallback to defaults
  const emisorRfc = clinicBilling?.rfc || clinicProfile.rfc || 'CSA230515ABC'
  const emisorName = clinicBilling?.name || clinicProfile.name || 'Clínica San Ángel'
  const emisorRegimenFiscal = clinicBilling?.regimenFiscal || '612'

  const handleGenerateCFDI = async () => {
    if (!formPatient || !formConcept || !formSubtotal) return

    setIsGenerating(true)
    try {
      const patient = patients.find(p => p.id === formPatient)
      const subtotal = parseFloat(formSubtotal)

      // Send clinicId + patientId so the API can look up credentials from DB
      // The API will look up the patient's RFC from the DB as well
      const response = await fetch('/api/facturama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: clinicId || 'demo',
          patientId: formPatient,
          concept: formConcept,
          subtotal,
          ivaRate: formIvaRate,
          formaPago: formFormaPago,
          metodoPago: formMetodoPago,
          usoCFDI: formUsoCFDI,
          // Fallback values in case DB lookup fails
          rfcReceptor: patient?.rfc || 'XAXX010101000',
          nombreReceptor: patient?.fullName || 'Público en general',
          rfcEmisor: emisorRfc,
          nombreEmisor: emisorName,
          regimenFiscal: emisorRegimenFiscal,
        }),
      })

      const data = await response.json()

      if (response.ok && data.cfdiUuid) {
        // Create the invoice in our DB with all CFDI fields
        await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinicId: clinicId,
            patientId: formPatient,
            concepto: formConcept,
            subtotal,
            iva: data.iva || Math.round(subtotal * formIvaRate * 100) / 100,
            ivaRate: formIvaRate,
            total: data.total || Math.round((subtotal + Math.round(subtotal * formIvaRate * 100) / 100) * 100) / 100,
            formaPago: formFormaPago,
            metodoPago: formMetodoPago,
            usoCFDI: formUsoCFDI,
            tipoComprobante: data.tipoComprobante || 'I',
            cfdiUuid: data.cfdiUuid,
            facturamaId: data.facturamaId,
            pdfUrl: data.pdfUrl,
            xmlUrl: data.xmlUrl,
            serie: data.serie || 'A',
            status: 'timbrada',
            paymentStatus: 'unpaid',
          }),
        })

        const newInvoice: CFDIInvoice = {
          id: `inv${Date.now()}`,
          uuid: data.cfdiUuid,
          patientName: patient?.fullName || 'Público en general',
          concept: formConcept,
          total: data.total,
          status: 'timbrada',
          paymentStatus: 'unpaid',
          date: new Date().toISOString().split('T')[0],
          paymentMethod: formFormaPago === '01' ? 'Efectivo' : formFormaPago === '03' ? 'Transferencia' : 'Tarjeta',
          isSimulated: data.isSimulated,
        }
        setInvoiceList([newInvoice, ...invoiceList])
        setShowCFDIDialog(false)
        resetForm()
        setCfdiStep(0)
      } else {
        // Create error invoice in DB
        await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinicId: clinicId,
            patientId: formPatient,
            concepto: formConcept,
            subtotal,
            iva: Math.round(subtotal * formIvaRate * 100) / 100,
            ivaRate: formIvaRate,
            total: Math.round((subtotal + Math.round(subtotal * formIvaRate * 100) / 100) * 100) / 100,
            formaPago: formFormaPago,
            metodoPago: formMetodoPago,
            usoCFDI: formUsoCFDI,
            tipoComprobante: 'I',
            status: 'error',
            paymentStatus: 'unpaid',
            errorMessage: data.error || 'Error al timbrar CFDI',
          }),
        })

        const errorInvoice: CFDIInvoice = {
          id: `inv${Date.now()}`,
          uuid: 'ERROR',
          patientName: patient?.fullName || 'Público en general',
          concept: formConcept,
          total: subtotal * 1.16,
          status: 'error',
          paymentStatus: 'unpaid',
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
          clinicId: clinicId || 'demo',
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

  const handleDeleteInvoice = async (invoiceId: string) => {
    const inv = invoiceList.find(i => i.id === invoiceId)
    const isTimbrada = inv?.status === 'timbrada'
    const msg = isTimbrada
      ? 'Esta factura está timbrada ante el SAT. ¿Estás seguro de que deseas eliminarla del sistema? (El CFDI seguirá vigente ante el SAT).'
      : '¿Eliminar esta factura? Esta acción no se puede deshacer.'
    if (!confirm(msg)) return
    try {
      const res = await fetch(`/api/invoices?invoiceId=${invoiceId}`, { method: 'DELETE' })
      if (res.ok) {
        setInvoiceList(prev => prev.filter(i => i.id !== invoiceId))
      }
    } catch (err) {
      console.error('Failed to delete invoice:', err)
    }
  }

  const handleRevertPayment = async (invoiceId: string) => {
    if (!confirm('¿Eliminar el pago registrado? La factura volverá a pendiente.')) return
    try {
      const res = await fetch('/api/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          paymentStatus: 'unpaid',
        }),
      })
      if (res.ok) {
        setInvoiceList(prev => prev.map(i =>
          i.id === invoiceId ? { ...i, paymentStatus: 'unpaid' } : i
        ))
      }
    } catch (err) {
      console.error('Failed to revert payment:', err)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!payTarget) return

    setIsMarkingPaid(true)
    try {
      // Use the payments API to create a proper payment record
      const amount = payAmount ? parseFloat(payAmount) : payTarget.total
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: payTarget.id,
          amount,
          formaPago: payMethod,
          reference: payReference || undefined,
        }),
      })

      if (response.ok) {
        // Refresh invoice list from server to get updated payment status
        fetchInvoices()
      }
    } catch {
      // Error handling
    } finally {
      setIsMarkingPaid(false)
      setPayTarget(null)
      setPayMethod('01')
      setPayAmount('')
      setPayReference('')
    }
  }

  // Fetch payments for an invoice (expandable section)
  const handleTogglePayments = async (invoiceId: string) => {
    if (expandedInvoice === invoiceId) {
      setExpandedInvoice(null)
      return
    }
    setExpandedInvoice(invoiceId)
    if (!invoicePayments[invoiceId]) {
      try {
        const res = await fetch(`/api/payments?invoiceId=${invoiceId}`)
        if (res.ok) {
          const data = await res.json()
          setInvoicePayments(prev => ({
            ...prev,
            [invoiceId]: (data.payments || []).map((p: Record<string, unknown>) => ({
              id: p.id as string,
              amount: p.amount as number,
              formaPago: p.formaPago as string,
              reference: p.reference as string | null,
              createdAt: p.createdAt as string,
            })),
          }))
        }
      } catch (err) {
        console.error('Failed to fetch payments:', err)
      }
    }
  }

  const resetForm = () => {
    setFormPatient('')
    setFormConcept('')
    setFormSubtotal('')
    setFormFormaPago('01')
    setFormMetodoPago('PUE')
    setFormUsoCFDI('G01')
    setFormIvaRate(0)
  }

  return (
    <motion.div
      className="flex flex-col gap-6 h-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 shrink-0 items-stretch">
        <motion.div variants={itemVariants} className="h-full">
          <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow h-full flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                    Facturas del mes
                  </p>
                  <p className="text-3xl font-medium text-[#2C2C2A] mt-1 tracking-[-0.03em]">
                    {isLoadingInvoices ? '—' : invoiceList.length}
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

        <motion.div variants={itemVariants} className="h-full">
          <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow h-full flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                    Total facturado
                  </p>
                  <p className="text-3xl font-medium text-[#2C2C2A] mt-1 tracking-[-0.03em]">
                    {isLoadingInvoices ? '—' : `$${totalTimbrado.toLocaleString('es-MX')}`}
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
                {invoiceList.length > 0 ? `${timbradas} facturas timbradas` : 'Sin facturas aún'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow h-full flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                    Cobrado
                  </p>
                  <p className="text-3xl font-medium text-[#1D9E75] mt-1 tracking-[-0.03em]">
                    {isLoadingInvoices ? '—' : `$${totalCobrado.toLocaleString('es-MX')}`}
                  </p>
                  <p className="text-[10px] text-[#888780]">{pagadas} pagadas</p>
                </div>
                <motion.div
                  className="h-10 w-10 rounded-lg bg-[#E1F5EE] flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <DollarSign className="h-5 w-5 text-[#1D9E75]" />
                </motion.div>
              </div>
              <p className="text-xs text-[#1D9E75] mt-2 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {pagadas > 0 ? `${Math.round((totalCobrado / (totalCobrado + totalPendiente || 1)) * 100)}% cobrado` : 'Sin cobros registrados'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <Card className="border-[#E1F5EE] bg-white hover:shadow-md transition-shadow h-full flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#888780] font-medium uppercase tracking-wide">
                    Pendientes de cobro
                  </p>
                  <p className="text-3xl font-medium text-[#D97706] mt-1 tracking-[-0.03em]">
                    {isLoadingInvoices ? '—' : `$${totalPendiente.toLocaleString('es-MX')}`}
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
      <motion.div variants={itemVariants} className="flex-1 min-h-0 h-full">
        <Card className="border-[#E1F5EE] bg-white flex flex-col h-full overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                Facturas recientes
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={`text-[10px] border-0 ${
                  facturamaConnected
                    ? clinicBilling?.facturamaToken
                      ? 'bg-[#E1F5EE] text-[#1D9E75]'
                      : 'bg-amber-100 text-amber-700'
                    : 'bg-[#FEE2E2] text-[#E53E3E]'
                }`}>
                  {isLoadingBilling ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Cargando...</>
                  ) : facturamaConnected ? (
                    clinicBilling?.facturamaToken ? (
                      <><Database className="h-3 w-3 mr-1" />Facturama {facturamaMode}</>
                    ) : (
                      <><Sparkles className="h-3 w-3 mr-1" />Facturama sandbox</>
                    )
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
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-full">
              <div className="overflow-x-auto px-6 pb-4">
                {isLoadingInvoices ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-[#534AB7]" />
                  </div>
                ) : invoiceList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Receipt className="h-10 w-10 text-[#888780]/30 mb-3" />
                    <p className="text-sm text-[#888780]">No hay facturas registradas</p>
                    <p className="text-xs text-[#888780]/70 mt-1">Genera tu primer CFDI para comenzar</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E1F5EE]">
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
                          CFDI
                        </th>
                        <th className="text-center text-[10px] text-[#888780] uppercase tracking-wide pb-2 pr-4 font-medium">
                          Pago
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
                        <>
                          <tr
                            key={inv.id}
                            className="border-b border-[#E1F5EE]/50 hover:bg-[#F1EFE8] transition-colors group"
                          >
                          <td className="py-3 pr-4">
                            <span className="text-sm text-[#2C2C2A]">{inv.patientName}</span>
                            {inv.appointmentId && (
                              <button
                                className="flex items-center gap-1 text-[10px] text-[#534AB7] hover:underline mt-0.5"
                                onClick={() => {
                                  const { setActiveModule } = useSinapStore.getState()
                                  setActiveModule('desk')
                                }}
                              >
                                <ExternalLink className="h-2.5 w-2.5" />
                                {inv.appointmentDate && inv.appointmentDoctor ? `${inv.appointmentDate} — Dr. ${inv.appointmentDoctor}` : 'Ver cita'}
                              </button>
                            )}
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
                          <td className="py-3 pr-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge
                                className="text-[10px] border-0 font-medium flex items-center gap-1 mx-auto w-fit"
                                style={{
                                  backgroundColor: inv.paymentStatus === 'paid' ? '#E1F5EE' : inv.paymentStatus === 'partial' ? '#FEF3C7' : '#FEF3C7',
                                  color: inv.paymentStatus === 'paid' ? '#1D9E75' : inv.paymentStatus === 'partial' ? '#D97706' : '#D97706',
                                }}
                              >
                                {inv.paymentStatus === 'paid' ? (
                                  <><CheckCircle2 className="h-3 w-3" />Pagado</>
                                ) : inv.paymentStatus === 'partial' ? (
                                  <><DollarSign className="h-3 w-3" />Parcial</>
                                ) : (
                                  <><Clock className="h-3 w-3" />Pendiente</>
                                )}
                              </Badge>
                              <button
                                className="flex items-center gap-0.5 text-[9px] text-[#534AB7] hover:underline"
                                onClick={() => handleTogglePayments(inv.id)}
                              >
                                {expandedInvoice === inv.id ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                                Pagos
                              </button>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-xs text-[#888780]">{inv.date}</span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {inv.paymentStatus !== 'paid' && inv.status !== 'cancelled' && inv.status !== 'error' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-[#1D9E75] hover:text-[#1D9E75] hover:bg-[#E1F5EE]"
                                  onClick={() => setPayTarget(inv)}
                                >
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Cobrar
                                </Button>
                              )}
                              {inv.paymentStatus === 'paid' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-[#D97706] hover:text-[#D97706] hover:bg-[#FEF3C7]"
                                  onClick={() => handleRevertPayment(inv.id)}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Eliminar pago
                                </Button>
                              )}
                              {inv.status === 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-[#534AB7] hover:text-[#534AB7] hover:bg-[#EEEDFE]"
                                  onClick={() => {
                                    // Pre-fill the CFDI dialog with this invoice's data
                                    const patient = patients.find(p => p.fullName === inv.patientName)
                                    if (patient) setFormPatient(patient.id)
                                    setFormConcept(inv.concept)
                                    setFormSubtotal(String(inv.total))
                                    setShowCFDIDialog(true)
                                    setCfdiStep(0)
                                  }}
                                >
                                  <Receipt className="h-3 w-3 mr-1" />
                                  CFDI
                                </Button>
                              )}
                              {inv.status === 'timbrada' && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#534AB7]">
                                    <FileDown className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-[#E53E3E] hover:text-[#E53E3E] hover:bg-[#FEE2E2]"
                                    onClick={() => setCancelTarget(inv)}
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Cancelar CFDI
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-[#E53E3E] hover:text-[#E53E3E] hover:bg-[#FEE2E2]"
                                onClick={() => handleDeleteInvoice(inv.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded payment history row */}
                        {expandedInvoice === inv.id && (
                          <tr key={`${inv.id}-payments`}>
                            <td colSpan={7} className="p-0">
                              <div className="px-6 py-3 bg-[#F1EFE8] border-b border-[#E1F5EE]">
                                <p className="text-[10px] font-semibold text-[#888780] uppercase tracking-wide mb-2">Historial de pagos</p>
                                {invoicePayments[inv.id] ? (
                                  invoicePayments[inv.id].length > 0 ? (
                                    <div className="space-y-1">
                                      {invoicePayments[inv.id].map((p) => (
                                        <div key={p.id} className="flex items-center justify-between p-2 rounded bg-white text-xs">
                                          <div className="flex items-center gap-3">
                                            <span className="font-medium text-[#2C2C2A]">${p.amount.toLocaleString('es-MX')}</span>
                                            <span className="text-[#888780]">
                                              {p.formaPago === '01' ? 'Efectivo' : p.formaPago === '03' ? 'Transferencia' : 'Tarjeta'}
                                            </span>
                                            {p.reference && <span className="text-[#888780]">ref: {p.reference}</span>}
                                          </div>
                                          <span className="text-[#888780]">{new Date(p.createdAt).toLocaleDateString('es-MX')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-[#888780]">Sin pagos registrados</p>
                                  )
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="h-3 w-3 animate-spin text-[#534AB7]" />
                                    <span className="text-xs text-[#888780]">Cargando pagos...</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        </>
                      ))}
                    </tbody>
                  </table>
                )}
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
            {facturamaConnected && !clinicBilling?.facturamaToken && (
              <div className="p-3 rounded-lg bg-[#FEF3C7] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#D97706] shrink-0" />
                <p className="text-xs text-[#D97706]">
                  Modo sandbox. Los CFDIs generados no son fiscales.
                </p>
              </div>
            )}

            {cfdiStep === 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Paciente</Label>
                <Select value={formPatient} onValueChange={setFormPatient}>
                  <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]">
                    <SelectValue placeholder={isLoadingPatients ? 'Cargando...' : 'Seleccionar paciente...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formPatient && (() => {
                  const sel = patients.find(p => p.id === formPatient)
                  return sel?.rfc ? (
                    <p className="text-[10px] text-[#888780]">RFC del paciente: <span className="text-[#2C2C2A] font-medium">{sel.rfc}</span></p>
                  ) : (
                    <p className="text-[10px] text-[#D97706]">Sin RFC registrado — se usará XAXX010101000</p>
                  )
                })()}
              </div>
            )}

            {cfdiStep === 1 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Concepto</Label>
                  <Input
                    className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]"
                    placeholder="Ej: Consulta dermatologica"
                    value={formConcept}
                    onChange={(e) => setFormConcept(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Subtotal (MXN)</Label>
                  <Input
                    type="number"
                    className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7]"
                    placeholder="0.00"
                    value={formSubtotal}
                    onChange={(e) => setFormSubtotal(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">IVA</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormIvaRate(0)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                        formIvaRate === 0
                          ? 'bg-[#E1F5EE] border-[#1D9E75] text-[#1D9E75]'
                          : 'bg-white border-[#E1F5EE] text-[#888780] hover:border-[#1D9E75]/50'
                      }`}
                    >
                      Exento (0%)
                      <span className="block text-[9px] font-normal opacity-70">Servicios de salud</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormIvaRate(0.16)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                        formIvaRate === 0.16
                          ? 'bg-[#EEEDFE] border-[#534AB7] text-[#534AB7]'
                          : 'bg-white border-[#E1F5EE] text-[#888780] hover:border-[#534AB7]/50'
                      }`}
                    >
                      16% IVA
                      <span className="block text-[9px] font-normal opacity-70">Producto/servicio gravado</span>
                    </button>
                  </div>
                </div>
                {formSubtotal && (
                  <div className="rounded-lg bg-[#F1EFE8] p-2.5 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#888780]">Subtotal</span>
                      <span className="text-[#2C2C2A]">${(parseFloat(formSubtotal) || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#888780]">IVA {formIvaRate > 0 ? `(${(formIvaRate * 100).toFixed(0)}%)` : '(Exento)'}</span>
                      <span className="text-[#2C2C2A]">${((parseFloat(formSubtotal) || 0) * formIvaRate).toFixed(2)}</span>
                    </div>
                    <Separator className="bg-[#E1F5EE]" />
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[#2C2C2A]">Total</span>
                      <span className="text-[#534AB7]">${((parseFloat(formSubtotal) || 0) * (1 + formIvaRate)).toFixed(2)}</span>
                    </div>
                  </div>
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
              <p><span className="font-medium text-[#2C2C2A]">Emisor:</span> {emisorName} | RFC: {emisorRfc} | Régimen: {emisorRegimenFiscal}</p>
              <p><span className="font-medium text-[#2C2C2A]">Receptor:</span> {formPatient ? patients.find(p => p.id === formPatient)?.fullName : 'Seleccionar paciente'}{formPatient && patients.find(p => p.id === formPatient)?.rfc ? ` | RFC: ${patients.find(p => p.id === formPatient)?.rfc}` : ''}</p>
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

      {/* Mark as Paid Dialog — now supports partial payments */}
      <Dialog open={!!payTarget} onOpenChange={() => { setPayTarget(null); setPayMethod('01'); setPayAmount(''); setPayReference('') }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-medium tracking-[-0.03em] flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#1D9E75]" />
              Registrar pago
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {payTarget && (
              <div className="p-3 rounded-lg bg-[#E1F5EE] text-sm">
                <p className="font-medium text-[#2C2C2A]">{payTarget.patientName}</p>
                <p className="text-xs text-[#888780]">{payTarget.concept} — ${payTarget.total.toLocaleString('es-MX')} MXN</p>
                {payTarget.paymentStatus === 'partial' && (
                  <p className="text-[10px] text-[#D97706] mt-1">Pago parcial — permite registrar abonos</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Monto del pago</Label>
              <Input
                type="number"
                className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                placeholder={payTarget ? `$${payTarget.total.toLocaleString('es-MX')}` : '$0.00'}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                min={0}
                max={payTarget?.total}
                step={0.01}
              />
              <p className="text-[10px] text-[#888780]">Dejar vacío para pagar el total</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Método de pago</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">Efectivo</SelectItem>
                  <SelectItem value="03">Transferencia</SelectItem>
                  <SelectItem value="04">Tarjeta de crédito</SelectItem>
                  <SelectItem value="28">Tarjeta de débito</SelectItem>
                  <SelectItem value="99">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Referencia (opcional)</Label>
              <Input
                className="h-9 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                placeholder="Ej: #transferencia, últimos 4 dígitos"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="text-sm" onClick={() => { setPayTarget(null); setPayAmount(''); setPayReference('') }}>
              Cancelar
            </Button>
            <Button
              className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white text-sm"
              onClick={handleMarkAsPaid}
              disabled={isMarkingPaid}
            >
              {isMarkingPaid ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Guardando...</>
              ) : (
                <><DollarSign className="h-4 w-4 mr-1" />Registrar pago</>
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
    </motion.div>
  )
}
