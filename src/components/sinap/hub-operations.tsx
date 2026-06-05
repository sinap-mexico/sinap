'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSinapStore } from '@/lib/sinap-store'
import {
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Loader2,
  Plus,
  Minus,
  Receipt,
  Wrench,
  Users,
  Megaphone,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  Trash2,
  Pencil,
  FlaskConical,
  Stethoscope,
  Pill,
  Zap,
  Warehouse,
} from 'lucide-react'
import { motion } from 'framer-motion'

// ─── Types ──────────────────────────────────────────────

interface StaffMember {
  id: string
  name: string
  specialty: string
  todayAppointments: number
  avatar: string
}

interface ExpenseItem {
  id: string
  category: string
  description: string
  amount: number
  date: string
  isRecurring: boolean
  recurrence: string | null
  vendor: string | null
  notes: string | null
}

interface InventoryItemData {
  id: string
  name: string
  category: string
  quantity: number
  minQuantity: number
  unit: string
  costPerUnit: number
  supplier: string | null
  expiryDate: string | null
  location: string | null
  notes: string | null
  isActive: boolean
}

// ─── Config Maps ────────────────────────────────────────

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  rent: { label: 'Renta', icon: <Building2 className="h-3 w-3" />, color: '#534AB7' },
  supplies: { label: 'Insumos', icon: <Package className="h-3 w-3" />, color: '#1D9E75' },
  salaries: { label: 'Salarios', icon: <Users className="h-3 w-3" />, color: '#D97706' },
  equipment: { label: 'Equipo', icon: <Wrench className="h-3 w-3" />, color: '#E53E3E' },
  services: { label: 'Servicios', icon: <Receipt className="h-3 w-3" />, color: '#0891B2' },
  marketing: { label: 'Marketing', icon: <Megaphone className="h-3 w-3" />, color: '#7C3AED' },
  utilities: { label: 'Servicios públicos', icon: <Zap className="h-3 w-3" />, color: '#CA8A04' },
  other: { label: 'Otro', icon: <MoreHorizontal className="h-3 w-3" />, color: '#888780' },
}

const inventoryCategoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  medication: { label: 'Medicamento', icon: <Pill className="h-3 w-3" />, color: '#534AB7' },
  supply: { label: 'Insumo', icon: <Package className="h-3 w-3" />, color: '#1D9E75' },
  equipment: { label: 'Equipo', icon: <Stethoscope className="h-3 w-3" />, color: '#0891B2' },
  instrument: { label: 'Instrumento', icon: <Wrench className="h-3 w-3" />, color: '#D97706' },
  other: { label: 'Otro', icon: <MoreHorizontal className="h-3 w-3" />, color: '#888780' },
}

const unitLabels: Record<string, string> = {
  pieza: 'Pieza',
  caja: 'Caja',
  frasco: 'Frasco',
  ml: 'ml',
  mg: 'mg',
}

const recurrenceLabels: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
}

// ─── Animation Variants ─────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

// ─── Component ──────────────────────────────────────────

export function HubOperations() {
  const { clinicId, setClinicId, clinicSlug } = useSinapStore()
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [isLoadingStaff, setIsLoadingStaff] = useState(true)
  const [kpiData, setKpiData] = useState<{
    totalFacturado: number
    currentMonthRevenue: number
    citasHoy: number
    doctorAppointments: Array<{ doctorId: string; doctorName: string; todayCount: number }>
  }>({ totalFacturado: 0, currentMonthRevenue: 0, citasHoy: 0, doctorAppointments: [] })
  const [isLoadingKpi, setIsLoadingKpi] = useState(true)

  // Expense state
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [prevTotalExpenses, setPrevTotalExpenses] = useState(0)
  const [changePercent, setChangePercent] = useState(0)
  const [expensesByCategory, setExpensesByCategory] = useState<Record<string, number>>({})
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true)

  // Inventory state
  const [inventoryItems, setInventoryItems] = useState<InventoryItemData[]>([])
  const [inventoryTotal, setInventoryTotal] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [expiringCount, setExpiringCount] = useState(0)
  const [inventoryTotalValue, setInventoryTotalValue] = useState(0)
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<string>('all')
  const [isLoadingInventory, setIsLoadingInventory] = useState(true)

  // Expense dialog state
  const [showExpenseDialog, setShowExpenseDialog] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [expenseCategory, setExpenseCategory] = useState('supplies')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [expenseIsRecurring, setExpenseIsRecurring] = useState(false)
  const [expenseRecurrence, setExpenseRecurrence] = useState('monthly')
  const [expenseVendor, setExpenseVendor] = useState('')
  const [expenseNotes, setExpenseNotes] = useState('')
  const [isSavingExpense, setIsSavingExpense] = useState(false)

  // Inventory dialog state
  const [showInventoryDialog, setShowInventoryDialog] = useState(false)
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null)
  const [invName, setInvName] = useState('')
  const [invCategory, setInvCategory] = useState('supply')
  const [invQuantity, setInvQuantity] = useState('')
  const [invMinQuantity, setInvMinQuantity] = useState('5')
  const [invUnit, setInvUnit] = useState('pieza')
  const [invCostPerUnit, setInvCostPerUnit] = useState('')
  const [invSupplier, setInvSupplier] = useState('')
  const [invExpiryDate, setInvExpiryDate] = useState('')
  const [invLocation, setInvLocation] = useState('')
  const [invNotes, setInvNotes] = useState('')
  const [isSavingInventory, setIsSavingInventory] = useState(false)

  // Delete confirmation dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'expense' | 'inventory'; id: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  // Fetch KPI data
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

  // Fetch expenses from API
  const fetchExpenses = useCallback(async () => {
    if (!clinicId) return
    setIsLoadingExpenses(true)
    try {
      const now = new Date()
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      const res = await fetch(`/api/expenses?clinicId=${clinicId}&from=${from}&to=${to}`)
      if (res.ok) {
        const data = await res.json()
        setExpenses(
          (data.expenses || []).map((e: Record<string, unknown>) => ({
            id: e.id as string,
            category: e.category as string,
            description: e.description as string,
            amount: e.amount as number,
            date: new Date(e.date as string).toLocaleDateString('es-MX'),
            isRecurring: (e.isRecurring as boolean) || false,
            recurrence: (e.recurrence as string) || null,
            vendor: (e.vendor as string) || null,
            notes: (e.notes as string) || null,
          }))
        )
        setTotalExpenses(data.total || 0)
        setPrevTotalExpenses(data.prevTotal || 0)
        setChangePercent(data.changePercent || 0)
        setExpensesByCategory(data.byCategory || {})
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
    } finally {
      setIsLoadingExpenses(false)
    }
  }, [clinicId])

  // Fetch inventory from API
  const fetchInventory = useCallback(async () => {
    if (!clinicId) return
    setIsLoadingInventory(true)
    try {
      const params = new URLSearchParams({ clinicId })
      if (inventoryCategoryFilter && inventoryCategoryFilter !== 'all') {
        params.set('category', inventoryCategoryFilter)
      }
      const res = await fetch(`/api/inventory?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setInventoryItems(
          (data.items || []).map((item: Record<string, unknown>) => ({
            id: item.id as string,
            name: item.name as string,
            category: item.category as string,
            quantity: item.quantity as number,
            minQuantity: item.minQuantity as number,
            unit: item.unit as string,
            costPerUnit: item.costPerUnit as number,
            supplier: (item.supplier as string) || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate as string).toISOString().split('T')[0] : null,
            location: (item.location as string) || null,
            notes: (item.notes as string) || null,
            isActive: item.isActive as boolean,
          }))
        )
        setInventoryTotal(data.total || 0)
        setLowStockCount(data.lowStockCount || 0)
        setExpiringCount(data.expiringCount || 0)
        setInventoryTotalValue(data.totalValue || 0)
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err)
    } finally {
      setIsLoadingInventory(false)
    }
  }, [clinicId, inventoryCategoryFilter])

  useEffect(() => { fetchStaff() }, [fetchStaff])
  useEffect(() => { fetchKpi() }, [fetchKpi])
  useEffect(() => { fetchExpenses() }, [fetchExpenses])
  useEffect(() => { fetchInventory() }, [fetchInventory])

  // Merge appointment counts
  useEffect(() => {
    if (staffMembers.length === 0 || kpiData.doctorAppointments.length === 0) return
    const apptMap = new Map(kpiData.doctorAppointments.map(d => [d.doctorId, d.todayCount]))
    setStaffMembers(prev =>
      prev.map(s => ({ ...s, todayAppointments: apptMap.get(s.id) || 0 }))
    )
  }, [kpiData.doctorAppointments])

  const income = kpiData.currentMonthRevenue || kpiData.totalFacturado
  const netCash = income - totalExpenses

  // ─── Expense Handlers ───────────────────────────────

  const handleSaveExpense = async () => {
    if (!expenseDescription.trim() || !expenseAmount || !expenseDate) return
    setIsSavingExpense(true)
    try {
      const payload: Record<string, unknown> = {
        clinicId,
        category: expenseCategory,
        description: expenseDescription,
        amount: parseFloat(expenseAmount),
        date: expenseDate,
        isRecurring: expenseIsRecurring,
        recurrence: expenseIsRecurring ? expenseRecurrence : null,
        vendor: expenseVendor || null,
        notes: expenseNotes || null,
      }

      const url = editingExpenseId
        ? `/api/expenses/${editingExpenseId}`
        : '/api/expenses'
      const method = editingExpenseId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        fetchExpenses()
        resetExpenseForm()
        setShowExpenseDialog(false)
      }
    } catch (err) {
      console.error('Failed to save expense:', err)
    } finally {
      setIsSavingExpense(false)
    }
  }

  const handleEditExpense = (expense: ExpenseItem) => {
    setEditingExpenseId(expense.id)
    setExpenseCategory(expense.category)
    setExpenseDescription(expense.description)
    setExpenseAmount(String(expense.amount))
    setExpenseDate(expense.date)
    setExpenseIsRecurring(expense.isRecurring)
    setExpenseRecurrence(expense.recurrence || 'monthly')
    setExpenseVendor(expense.vendor || '')
    setExpenseNotes(expense.notes || '')
    setShowExpenseDialog(true)
  }

  const handleDeleteExpense = async () => {
    if (!deleteTarget || deleteTarget.type !== 'expense') return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/expenses/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchExpenses()
      }
    } catch (err) {
      console.error('Failed to delete expense:', err)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setDeleteTarget(null)
    }
  }

  const resetExpenseForm = () => {
    setEditingExpenseId(null)
    setExpenseCategory('supplies')
    setExpenseDescription('')
    setExpenseAmount('')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setExpenseIsRecurring(false)
    setExpenseRecurrence('monthly')
    setExpenseVendor('')
    setExpenseNotes('')
  }

  // ─── Inventory Handlers ─────────────────────────────

  const handleSaveInventory = async () => {
    if (!invName.trim()) return
    setIsSavingInventory(true)
    try {
      const payload: Record<string, unknown> = {
        clinicId,
        name: invName,
        category: invCategory,
        quantity: parseInt(invQuantity || '0', 10),
        minQuantity: parseInt(invMinQuantity || '5', 10),
        unit: invUnit,
        costPerUnit: parseFloat(invCostPerUnit || '0'),
        supplier: invSupplier || null,
        expiryDate: invExpiryDate || null,
        location: invLocation || null,
        notes: invNotes || null,
      }

      const url = editingInventoryId
        ? `/api/inventory/${editingInventoryId}`
        : '/api/inventory'
      const method = editingInventoryId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        fetchInventory()
        resetInventoryForm()
        setShowInventoryDialog(false)
      }
    } catch (err) {
      console.error('Failed to save inventory item:', err)
    } finally {
      setIsSavingInventory(false)
    }
  }

  const handleEditInventory = (item: InventoryItemData) => {
    setEditingInventoryId(item.id)
    setInvName(item.name)
    setInvCategory(item.category)
    setInvQuantity(String(item.quantity))
    setInvMinQuantity(String(item.minQuantity))
    setInvUnit(item.unit)
    setInvCostPerUnit(String(item.costPerUnit))
    setInvSupplier(item.supplier || '')
    setInvExpiryDate(item.expiryDate || '')
    setInvLocation(item.location || '')
    setInvNotes(item.notes || '')
    setShowInventoryDialog(true)
  }

  const handleDeleteInventory = async () => {
    if (!deleteTarget || deleteTarget.type !== 'inventory') return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/inventory/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchInventory()
      }
    } catch (err) {
      console.error('Failed to delete inventory item:', err)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setDeleteTarget(null)
    }
  }

  const handleQuickAdjustQuantity = async (item: InventoryItemData, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta)
    try {
      await fetch(`/api/inventory/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      })
      fetchInventory()
    } catch (err) {
      console.error('Failed to adjust quantity:', err)
    }
  }

  const resetInventoryForm = () => {
    setEditingInventoryId(null)
    setInvName('')
    setInvCategory('supply')
    setInvQuantity('')
    setInvMinQuantity('5')
    setInvUnit('pieza')
    setInvCostPerUnit('')
    setInvSupplier('')
    setInvExpiryDate('')
    setInvLocation('')
    setInvNotes('')
  }

  // ─── Helpers ────────────────────────────────────────

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return new Date(expiryDate) <= thirtyDaysFromNow
  }

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false
    return new Date(expiryDate) < new Date()
  }

  const formatExpiryDate = (expiryDate: string | null) => {
    if (!expiryDate) return ''
    return new Date(expiryDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // ─── Render ─────────────────────────────────────────

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
                    {isLoadingExpenses ? '—' : `$${totalExpenses.toLocaleString('es-MX')}`}
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
                {totalExpenses > 0
                  ? changePercent !== 0
                    ? `${changePercent > 0 ? '+' : ''}${changePercent}% vs mes anterior`
                    : 'Gastos registrados'
                  : 'Sin gastos registrados'}
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
                    {isLoadingKpi || isLoadingExpenses ? '—' : `$${netCash.toLocaleString('es-MX')}`}
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
            <div className="p-3 space-y-3 flex-1 max-h-80 overflow-y-auto">
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

        {/* Expenses breakdown */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="border-[#E1F5EE] bg-white h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Gastos del mes
                </CardTitle>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-7 text-xs"
                    onClick={() => {
                      resetExpenseForm()
                      setShowExpenseDialog(true)
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar gasto
                  </Button>
                </motion.div>
              </div>
            </CardHeader>
            <Separator className="bg-[#E1F5EE]" />

            {isLoadingExpenses ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-[#534AB7]" />
              </div>
            ) : Object.keys(expensesByCategory).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-8 w-8 text-[#888780]/30 mb-2" />
                <p className="text-xs text-[#888780]">Sin gastos registrados este mes</p>
                <p className="text-[10px] text-[#888780]/70 mt-1">Registra gastos para ver el desglose</p>
              </div>
            ) : (
              <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-96">
                {/* Category breakdown bars */}
                {Object.entries(expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount], i) => {
                    const config = categoryConfig[category] || categoryConfig.other
                    const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                    return (
                      <motion.div
                        key={category}
                        className="space-y-1"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.08 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span style={{ color: config.color }}>{config.icon}</span>
                            <span className="text-xs font-medium text-[#2C2C2A]">{config.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#888780]">{Math.round(percentage)}%</span>
                            <span className="text-xs font-medium text-[#2C2C2A]">${amount.toLocaleString('es-MX')}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-[#F1EFE8] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: config.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.6, delay: 0.3 + i * 0.08 }}
                          />
                        </div>
                      </motion.div>
                    )
                  })}

                {/* Month-over-month comparison */}
                {prevTotalExpenses > 0 && (
                  <div className="p-2 rounded-lg bg-[#F8F7F3] flex items-center gap-2">
                    {changePercent > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-[#E53E3E]" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-[#1D9E75]" />
                    )}
                    <span className="text-xs text-[#2C2C2A]">
                      {changePercent > 0 ? '+' : ''}{changePercent}% vs mes anterior
                    </span>
                    <span className="text-[10px] text-[#888780] ml-auto">
                      Antes: ${prevTotalExpenses.toLocaleString('es-MX')}
                    </span>
                  </div>
                )}

                {/* Recent expenses list */}
                {expenses.length > 0 && (
                  <div className="pt-2 border-t border-[#E1F5EE]">
                    <p className="text-[10px] font-semibold text-[#888780] uppercase tracking-wide mb-2">
                      Gastos recientes
                    </p>
                    <div className="space-y-1.5">
                      {expenses.slice(0, 10).map((expense) => {
                        const config = categoryConfig[expense.category] || categoryConfig.other
                        return (
                          <div key={expense.id} className="flex items-center justify-between p-1.5 rounded bg-[#F1EFE8] text-xs group">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span style={{ color: config.color }}>{config.icon}</span>
                              <span className="text-[#2C2C2A] truncate">{expense.description}</span>
                              {expense.isRecurring && (
                                <Badge className="bg-[#EEEDFE] text-[#534AB7] border-0 text-[8px] h-4 px-1 shrink-0">
                                  <Clock className="h-2 w-2 mr-0.5" />
                                  {recurrenceLabels[expense.recurrence || 'monthly'] || 'Recurrente'}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-medium text-[#2C2C2A]">${expense.amount.toLocaleString('es-MX')}</span>
                              <span className="text-[#888780] hidden sm:inline">{expense.date}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-[#888780] hover:text-[#534AB7]"
                                onClick={() => handleEditExpense(expense)}
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-[#888780] hover:text-[#E53E3E]"
                                onClick={() => {
                                  setDeleteTarget({ type: 'expense', id: expense.id })
                                  setShowDeleteDialog(true)
                                }}
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Inventory Section */}
      <motion.div variants={itemVariants}>
        <Card className="border-[#E1F5EE] bg-white">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-sm font-medium tracking-[-0.03em]">
                  Inventario
                </CardTitle>
                {lowStockCount > 0 && (
                  <Badge className="bg-[#FEE2E2] text-[#E53E3E] border-0 text-[10px]">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {lowStockCount} bajo stock
                  </Badge>
                )}
                {expiringCount > 0 && (
                  <Badge className="bg-[#FEF3C7] text-[#D97706] border-0 text-[10px]">
                    <Clock className="h-3 w-3 mr-1" />
                    {expiringCount} por vencer
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select value={inventoryCategoryFilter} onValueChange={setInventoryCategoryFilter}>
                  <SelectTrigger className="h-7 w-32 text-xs bg-[#F8F7F3] border-[#E1F5EE]">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="medication">Medicamento</SelectItem>
                    <SelectItem value="supply">Insumo</SelectItem>
                    <SelectItem value="equipment">Equipo</SelectItem>
                    <SelectItem value="instrument">Instrumento</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white h-7 text-xs"
                    onClick={() => {
                      resetInventoryForm()
                      setShowInventoryDialog(true)
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar producto
                  </Button>
                </motion.div>
              </div>
            </div>
          </CardHeader>
          <Separator className="bg-[#E1F5EE]" />

          {/* Inventory summary row */}
          {!isLoadingInventory && (
            <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#E1F5EE] flex items-center justify-center">
                  <Package className="h-4 w-4 text-[#1D9E75]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#888780] uppercase tracking-wide">Productos</p>
                  <p className="text-sm font-medium text-[#2C2C2A]">{inventoryTotal}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#FEE2E2] flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-[#E53E3E]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#888780] uppercase tracking-wide">Stock bajo</p>
                  <p className="text-sm font-medium text-[#E53E3E]">{lowStockCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
                  <Clock className="h-4 w-4 text-[#D97706]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#888780] uppercase tracking-wide">Por vencer</p>
                  <p className="text-sm font-medium text-[#D97706]">{expiringCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#EEEDFE] flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-[#534AB7]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#888780] uppercase tracking-wide">Valor total</p>
                  <p className="text-sm font-medium text-[#2C2C2A]">${inventoryTotalValue.toLocaleString('es-MX')}</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 pb-4">
            {isLoadingInventory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-[#534AB7]" />
              </div>
            ) : inventoryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Warehouse className="h-8 w-8 text-[#888780]/30 mb-2" />
                <p className="text-xs text-[#888780]">Sin productos en inventario</p>
                <p className="text-[10px] text-[#888780]/70 mt-1">Agrega productos para llevar control de stock</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_100px_80px_80px_100px_60px] gap-2 px-2 py-2 border-b border-[#E1F5EE]">
                    <span className="text-[10px] font-semibold text-[#888780] uppercase tracking-wide">Producto</span>
                    <span className="text-[10px] font-semibold text-[#888780] uppercase tracking-wide">Cantidad</span>
                    <span className="text-[10px] font-semibold text-[#888780] uppercase tracking-wide">Mínimo</span>
                    <span className="text-[10px] font-semibold text-[#888780] uppercase tracking-wide">Costo/u</span>
                    <span className="text-[10px] font-semibold text-[#888780] uppercase tracking-wide">Vencimiento</span>
                    <span className="text-[10px] font-semibold text-[#888780] uppercase tracking-wide text-right">Acciones</span>
                  </div>

                  {/* Table rows */}
                  <div className="max-h-80 overflow-y-auto">
                    {inventoryItems.map((item) => {
                      const catConfig = inventoryCategoryConfig[item.category] || inventoryCategoryConfig.other
                      const isLowStock = item.quantity <= item.minQuantity
                      const expiring = isExpiringSoon(item.expiryDate)
                      const expired = isExpired(item.expiryDate)

                      return (
                        <motion.div
                          key={item.id}
                          className={`grid grid-cols-[1fr_100px_80px_80px_100px_60px] gap-2 px-2 py-2.5 border-b border-[#F1EFE8] items-center hover:bg-[#F8F7F3] transition-colors ${isLowStock ? 'bg-[#FEF2F2]/50' : ''}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {/* Product name */}
                          <div className="flex items-center gap-2 min-w-0">
                            <span style={{ color: catConfig.color }}>{catConfig.icon}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-[#2C2C2A] truncate">{item.name}</span>
                                {isLowStock && (
                                  <AlertTriangle className="h-3 w-3 text-[#E53E3E] shrink-0" />
                                )}
                              </div>
                              <span className="text-[10px] text-[#888780]">{catConfig.label}{item.location ? ` · ${item.location}` : ''}</span>
                            </div>
                          </div>

                          {/* Quantity with +/- buttons */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-5 w-5 text-[#888780] border-[#E1F5EE] hover:bg-[#F1EFE8] hover:text-[#E53E3E]"
                              onClick={() => handleQuickAdjustQuantity(item, -1)}
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </Button>
                            <span className={`text-xs font-medium min-w-[24px] text-center ${isLowStock ? 'text-[#E53E3E]' : 'text-[#2C2C2A]'}`}>
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-5 w-5 text-[#888780] border-[#E1F5EE] hover:bg-[#E1F5EE] hover:text-[#1D9E75]"
                              onClick={() => handleQuickAdjustQuantity(item, 1)}
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </Button>
                            <span className="text-[10px] text-[#888780]">{unitLabels[item.unit] || item.unit}</span>
                          </div>

                          {/* Min quantity */}
                          <div className="flex items-center">
                            <div className="h-1.5 w-full bg-[#F1EFE8] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isLowStock ? 'bg-[#E53E3E]' : 'bg-[#1D9E75]'}`}
                                style={{ width: `${Math.min(100, (item.quantity / Math.max(item.minQuantity, 1)) * 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-[#888780] ml-1.5">{item.minQuantity}</span>
                          </div>

                          {/* Cost per unit */}
                          <span className="text-xs text-[#2C2C2A]">
                            ${item.costPerUnit.toLocaleString('es-MX')}
                          </span>

                          {/* Expiry date */}
                          <div>
                            {item.expiryDate ? (
                              <span className={`text-xs ${expired ? 'text-[#E53E3E] font-medium' : expiring ? 'text-[#D97706] font-medium' : 'text-[#888780]'}`}>
                                {formatExpiryDate(item.expiryDate)}
                                {expired && ' ✗'}
                                {!expired && expiring && ' ⚠'}
                              </span>
                            ) : (
                              <span className="text-xs text-[#888780]/50">—</span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-[#888780] hover:text-[#534AB7]"
                              onClick={() => handleEditInventory(item)}
                            >
                              <Pencil className="h-2.5 w-2.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-[#888780] hover:text-[#E53E3E]"
                              onClick={() => {
                                setDeleteTarget({ type: 'inventory', id: item.id })
                                setShowDeleteDialog(true)
                              }}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* ─── Expense Dialog ────────────────────────────── */}
      <Dialog open={showExpenseDialog} onOpenChange={(open) => {
        setShowExpenseDialog(open)
        if (!open) resetExpenseForm()
      }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-[#2C2C2A]">
              {editingExpenseId ? 'Editar gasto' : 'Registrar gasto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Categoría</Label>
              <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                <SelectTrigger className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">Renta</SelectItem>
                  <SelectItem value="supplies">Insumos</SelectItem>
                  <SelectItem value="salaries">Salarios</SelectItem>
                  <SelectItem value="equipment">Equipo</SelectItem>
                  <SelectItem value="services">Servicios</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="utilities">Servicios públicos</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Descripción</Label>
              <Input
                className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#534AB7]"
                placeholder="Ej: Renta del consultorio"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Monto (MXN)</Label>
                <Input
                  type="number"
                  className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#534AB7]"
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Fecha</Label>
                <Input
                  type="date"
                  className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#534AB7]"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
            </div>

            {/* Recurring toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8F7F3]">
              <div>
                <Label className="text-xs text-[#2C2C2A] font-medium">Gasto recurrente</Label>
                <p className="text-[10px] text-[#888780]">Se repite automáticamente</p>
              </div>
              <Switch
                checked={expenseIsRecurring}
                onCheckedChange={setExpenseIsRecurring}
              />
            </div>

            {expenseIsRecurring && (
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Frecuencia</Label>
                <Select value={expenseRecurrence} onValueChange={setExpenseRecurrence}>
                  <SelectTrigger className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Proveedor (opcional)</Label>
              <Input
                className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#534AB7]"
                placeholder="Ej: Distribuidora Médica ABC"
                value={expenseVendor}
                onChange={(e) => setExpenseVendor(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Notas (opcional)</Label>
              <Input
                className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#534AB7]"
                placeholder="Notas adicionales..."
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="text-xs h-8"
              onClick={() => {
                setShowExpenseDialog(false)
                resetExpenseForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              className="text-xs h-8 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white"
              onClick={handleSaveExpense}
              disabled={isSavingExpense || !expenseDescription.trim() || !expenseAmount}
            >
              {isSavingExpense ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
              {editingExpenseId ? 'Guardar cambios' : 'Registrar gasto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Inventory Dialog ──────────────────────────── */}
      <Dialog open={showInventoryDialog} onOpenChange={(open) => {
        setShowInventoryDialog(open)
        if (!open) resetInventoryForm()
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-[#2C2C2A]">
              {editingInventoryId ? 'Editar producto' : 'Agregar producto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Nombre</Label>
                <Input
                  className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#1D9E75]"
                  placeholder="Ej: Guantes de látex"
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Categoría</Label>
                <Select value={invCategory} onValueChange={setInvCategory}>
                  <SelectTrigger className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medication">Medicamento</SelectItem>
                    <SelectItem value="supply">Insumo</SelectItem>
                    <SelectItem value="equipment">Equipo</SelectItem>
                    <SelectItem value="instrument">Instrumento</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Cantidad</Label>
                <Input
                  type="number"
                  className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#1D9E75]"
                  placeholder="0"
                  value={invQuantity}
                  onChange={(e) => setInvQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Mínimo</Label>
                <Input
                  type="number"
                  className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#1D9E75]"
                  placeholder="5"
                  value={invMinQuantity}
                  onChange={(e) => setInvMinQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Unidad</Label>
                <Select value={invUnit} onValueChange={setInvUnit}>
                  <SelectTrigger className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pieza">Pieza</SelectItem>
                    <SelectItem value="caja">Caja</SelectItem>
                    <SelectItem value="frasco">Frasco</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="mg">mg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Costo por unidad (MXN)</Label>
                <Input
                  type="number"
                  className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#1D9E75]"
                  placeholder="0.00"
                  value={invCostPerUnit}
                  onChange={(e) => setInvCostPerUnit(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Fecha de vencimiento</Label>
                <Input
                  type="date"
                  className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#1D9E75]"
                  value={invExpiryDate}
                  onChange={(e) => setInvExpiryDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Proveedor</Label>
                <Input
                  className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#1D9E75]"
                  placeholder="Ej: Distribuidora ABC"
                  value={invSupplier}
                  onChange={(e) => setInvSupplier(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Ubicación</Label>
                <Input
                  className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#1D9E75]"
                  placeholder="Ej: Estante A2"
                  value={invLocation}
                  onChange={(e) => setInvLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-[#888780]">Notas (opcional)</Label>
              <Input
                className="h-9 text-sm bg-[#F8F7F3] border-[#E1F5EE] focus:border-[#1D9E75]"
                placeholder="Notas adicionales..."
                value={invNotes}
                onChange={(e) => setInvNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="text-xs h-8"
              onClick={() => {
                setShowInventoryDialog(false)
                resetInventoryForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              className="text-xs h-8 bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white"
              onClick={handleSaveInventory}
              disabled={isSavingInventory || !invName.trim()}
            >
              {isSavingInventory ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
              {editingInventoryId ? 'Guardar cambios' : 'Agregar producto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ────────────────── */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open)
        if (!open) setDeleteTarget(null)
      }}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-[#2C2C2A]">Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#888780]">
            {deleteTarget?.type === 'expense'
              ? '¿Estás seguro de eliminar este gasto? Esta acción no se puede deshacer.'
              : '¿Estás seguro de eliminar este producto del inventario? Esta acción no se puede deshacer.'}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              className="text-xs h-8"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteTarget(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              className="text-xs h-8 bg-[#E53E3E] hover:bg-[#E53E3E]/90 text-white"
              onClick={deleteTarget?.type === 'expense' ? handleDeleteExpense : handleDeleteInventory}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
