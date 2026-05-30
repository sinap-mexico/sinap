'use client'

import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { invoices, kpiData } from '@/lib/mock-data'
import {
  Receipt,
  DollarSign,
  Clock,
  AlertTriangle,
  Plus,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
} from 'lucide-react'

function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    timbrada: { color: '#1D9E75', bg: '#E1F5EE', icon: <CheckCircle2 className="h-3 w-3" /> },
    pendiente: { color: '#D97706', bg: '#FEF3C7', icon: <Clock className="h-3 w-3" /> },
    error: { color: '#E53E3E', bg: '#FEE2E2', icon: <XCircle className="h-3 w-3" /> },
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

export function BillDashboard() {
  const timbradas = invoices.filter((i) => i.status === 'timbrada').length
  const pendientes = invoices.filter((i) => i.status === 'pendiente').length
  const errores = invoices.filter((i) => i.status === 'error').length
  const totalTimbrado = invoices
    .filter((i) => i.status === 'timbrada')
    .reduce((sum, i) => sum + i.total, 0)
  const totalPendiente = invoices
    .filter((i) => i.status === 'pendiente')
    .reduce((sum, i) => sum + i.total, 0)

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
                  {invoices.length}
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
                <p className="text-[10px] text-[#888780]">MXN · {pendientes} facturas</p>
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
              <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
                <Database className="h-3 w-3 mr-1" />
                Facturama Sandbox
              </Badge>
              <Button className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-8 text-xs">
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
                    <th className="text-left text-[10px] text-[#888780] uppercase tracking-wide pb-2 font-medium">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
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
                      <td className="py-3">
                        <span className="text-xs text-[#888780]">{inv.date}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
