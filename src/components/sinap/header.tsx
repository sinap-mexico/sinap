'use client'

import { useState } from 'react'
import { useSinapStore, type SinapModule } from '@/lib/sinap-store'
import { Bell, Menu, Calendar } from 'lucide-react'
import { clinic } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  MessageSquare,
  Activity,
  Receipt,
  TrendingUp,
  BarChart3,
  Building2,
  Settings,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'

const moduleLabels: Record<SinapModule, string> = {
  os: 'Sinap OS',
  agenda: 'Agenda',
  desk: 'Sinap Desk',
  flow: 'Sinap Flow',
  bill: 'Sinap Bill',
  grow: 'Sinap Grow',
  sight: 'Sinap Sight',
  hub: 'Sinap Hub',
  config: 'Configuración',
}

const moduleDescriptions: Record<SinapModule, string> = {
  os: 'Panel principal',
  agenda: 'Calendario de citas',
  desk: 'Agente de recepción',
  flow: 'Agente clínico',
  bill: 'Agente de facturación',
  grow: 'Agente de marketing',
  sight: 'Agente de analítica',
  hub: 'Agente de operaciones',
  config: 'Feature flags y ajustes',
}

const navItems: {
  module: SinapModule
  label: string
  icon: React.ElementType
  badge?: number
  requiresPlan?: 'pro' | 'enterprise'
  requiresClinic?: boolean
}[] = [
  { module: 'os', label: 'Sinap OS', icon: LayoutDashboard },
  { module: 'agenda', label: 'Agenda', icon: Calendar },
  { module: 'desk', label: 'Sinap Desk', icon: MessageSquare, badge: 3 },
  { module: 'flow', label: 'Sinap Flow', icon: Activity },
  { module: 'bill', label: 'Sinap Bill', icon: Receipt },
  { module: 'grow', label: 'Sinap Grow', icon: TrendingUp, requiresPlan: 'pro' },
  { module: 'sight', label: 'Sinap Sight', icon: BarChart3, requiresPlan: 'pro' },
  { module: 'hub', label: 'Sinap Hub', icon: Building2, requiresClinic: true },
]

export function SinapHeader() {
  const { activeModule, clinicName, plan, clinicMode, setActiveModule } = useSinapStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isNavVisible = (item: typeof navItems[number]) => {
    if (item.requiresPlan === 'pro' && plan === 'starter') return false
    if (item.requiresClinic && clinicMode !== 'clinic') return false
    return true
  }

  return (
    <>
      <header className="h-16 bg-white border-b border-[#E1F5EE] flex items-center justify-between px-4 lg:px-6 shrink-0">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menú"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-medium tracking-[-0.03em] text-[#2C2C2A]">
                {moduleLabels[activeModule]}
              </h1>
              <Badge
                variant="secondary"
                className="text-[10px] bg-[#EEEDFE] text-[#534AB7] border-0 font-medium"
              >
                {moduleDescriptions[activeModule]}
              </Badge>
            </div>
            <p className="text-xs text-[#888780] mt-0.5">{clinicName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-[#888780]" />
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-[#534AB7] rounded-full text-[9px] text-white flex items-center justify-center">
              4
            </span>
          </Button>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#534AB7] text-white text-xs font-medium">
                AR
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-[#2C2C2A] leading-tight">{clinic.doctor.name}</p>
              <p className="text-[11px] text-[#888780]">{clinic.doctor.specialty}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-[260px] bg-[#0F2D26] border-0">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 pt-5 pb-4">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="shrink-0">
                <circle cx="18" cy="18" r="5" fill="#534AB7" />
                <circle cx="18" cy="5" r="3.5" fill="#1D9E75" />
                <circle cx="30" cy="14" r="3.5" fill="#1D9E75" />
                <circle cx="30" cy="26" r="3.5" fill="#1D9E75" />
                <circle cx="18" cy="31" r="3.5" fill="#1D9E75" />
                <circle cx="6" cy="26" r="3.5" fill="#1D9E75" />
                <circle cx="6" cy="14" r="3.5" fill="#1D9E75" />
                <line x1="18" y1="13" x2="18" y2="8.5" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
                <line x1="22.5" y1="15.5" x2="26.5" y2="14" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
                <line x1="22.5" y1="20.5" x2="26.5" y2="26" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
                <line x1="18" y1="23" x2="18" y2="27.5" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
                <line x1="13.5" y1="20.5" x2="9.5" y2="26" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
                <line x1="13.5" y1="15.5" x2="9.5" y2="14" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
              </svg>
              <span className="text-lg font-medium tracking-[-0.03em] text-white">Sinap</span>
            </div>
            <Separator className="bg-white/10 mx-3" />

            {/* Navigation */}
            <ScrollArea className="flex-1 py-3">
              <nav className="flex flex-col gap-1 px-3">
                {navItems.filter(isNavVisible).map((item) => {
                  const Icon = item.icon
                  const isActive = activeModule === item.module
                  return (
                    <button
                      key={item.module}
                      onClick={() => {
                        setActiveModule(item.module)
                        setMobileMenuOpen(false)
                      }}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 relative ${
                        isActive
                          ? 'bg-[#534AB7] text-white shadow-md'
                          : 'text-white/60 hover:text-white hover:bg-[#1D9E75]/20'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="font-medium">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <Badge className="ml-auto bg-[#534AB7] text-white text-[10px] h-5 min-w-[20px] flex items-center justify-center border-0">
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  )
                })}
                <Separator className="bg-white/10 my-2" />
                <button
                  onClick={() => {
                    setActiveModule('config')
                    setMobileMenuOpen(false)
                  }}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                    activeModule === 'config'
                      ? 'bg-[#534AB7] text-white shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-[#1D9E75]/20'
                  }`}
                >
                  <Settings className="h-5 w-5 shrink-0" />
                  <span className="font-medium">Configuración</span>
                </button>
              </nav>
            </ScrollArea>

            {/* Tagline */}
            <div className="px-5 py-4 border-t border-white/10">
              <p className="text-[11px] text-white/30 italic tracking-wide">
                La sinapsis de tu negocio de salud
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
