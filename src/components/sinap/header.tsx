'use client'

import { useState } from 'react'
import { useSinapStore, type SinapModule } from '@/lib/sinap-store'
import { signOut } from 'next-auth/react'
import { Bell, Menu, Calendar, CheckCircle2, MessageSquare, Receipt, UserPlus, X, LogOut } from 'lucide-react'

import { SinapLogo } from '@/components/sinap/sinap-logo'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  LayoutDashboard,
  Users,
  MessageSquare as MessageSquareIcon,
  Activity,
  Receipt as ReceiptIcon,
  TrendingUp,
  BarChart3,
  Building2,
  Settings,
  LogOut as LogOutIcon,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { motion, AnimatePresence } from 'framer-motion'

const moduleLabels: Record<SinapModule, string> = {
  os: 'Sinap OS',
  agenda: 'Agenda',
  patients: 'Pacientes',
  desk: 'Sinap Desk',
  flow: 'Sinap Flow',
  bill: 'Sinap Bill',
  grow: 'Sinap Grow',
  sight: 'Sinap Sight',
  hub: 'Sinap Hub',
  config: 'Configuracion',
}

const moduleDescriptions: Record<SinapModule, string> = {
  os: 'Panel principal',
  agenda: 'Calendario de citas',
  patients: 'CRM y fichas de pacientes',
  desk: 'Agente de recepcion',
  flow: 'Agente clinico',
  bill: 'Agente de facturacion',
  grow: 'Agente de marketing',
  sight: 'Agente de analitica',
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
  { module: 'patients', label: 'Pacientes', icon: Users },
  { module: 'desk', label: 'Sinap Desk', icon: MessageSquareIcon },
  { module: 'flow', label: 'Sinap Flow', icon: Activity },
  { module: 'bill', label: 'Sinap Bill', icon: ReceiptIcon },
  { module: 'grow', label: 'Sinap Grow', icon: TrendingUp, requiresPlan: 'pro' },
  { module: 'sight', label: 'Sinap Sight', icon: BarChart3, requiresPlan: 'pro' },
  { module: 'hub', label: 'Sinap Hub', icon: Building2, requiresClinic: true },
]

// Notifications will come from the API in the future.
// For now, start with empty — no fake data for real accounts.
const emptyNotifications: Array<{ id: string; icon: React.ElementType; text: string; time: string; color: string; read: boolean }> = []

export function SinapHeader() {
  const { activeModule, clinicName, plan, clinicMode, setActiveModule, doctorProfile, isDemoMode, resetStore } = useSinapStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    document.cookie = 'sinap-demo=; path=/; max-age=0; SameSite=Lax'
    resetStore()
    try { await signOut({ redirect: false }) } catch {}
    window.location.href = '/login'
  }

  const isNavVisible = (item: typeof navItems[number]) => {
    if (item.requiresPlan === 'pro' && plan === 'starter') return false
    if (item.requiresClinic && clinicMode !== 'clinic') return false
    return true
  }

  const unreadCount = emptyNotifications.filter(n => !n.read).length

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
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={activeModule}
                  className="text-lg font-medium tracking-[-0.03em] text-[#2C2C2A]"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  {moduleLabels[activeModule]}
                </motion.h1>
              </AnimatePresence>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeModule + '-badge'}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-[#EEEDFE] text-[#534AB7] border-0 font-medium"
                  >
                    {moduleDescriptions[activeModule]}
                  </Badge>
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="text-xs text-[#888780] mt-0.5">{clinicName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-[#888780]" />
                {unreadCount > 0 && (
                  <motion.span
                    className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-[#534AB7] rounded-full text-[9px] text-white flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 border-[#E1F5EE]" align="end">
              <div className="p-3 border-b border-[#E1F5EE]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[#2C2C2A] tracking-[-0.03em]">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <Badge className="bg-[#534AB7] text-white border-0 text-[9px]">{unreadCount} nuevas</Badge>
                  )}
                </div>
              </div>
              <ScrollArea className="max-h-72">
                <div className="divide-y divide-[#E1F5EE]">
                {emptyNotifications.length > 0 ? (
                  emptyNotifications.map((notif, i) => {
                    const NotifIcon = notif.icon
                    return (
                      <motion.div
                        key={notif.id}
                        className={`p-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-[#F1EFE8] ${
                          !notif.read ? 'bg-[#EEEDFE]/30' : ''
                        }`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: notif.color + '15' }}
                        >
                          <NotifIcon className="h-4 w-4" style={{ color: notif.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#2C2C2A] leading-relaxed">{notif.text}</p>
                          <p className="text-[10px] text-[#888780] mt-0.5">{notif.time}</p>
                        </div>
                        {!notif.read && (
                          <div className="h-2 w-2 rounded-full bg-[#534AB7] shrink-0 mt-1.5" />
                        )}
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="py-8 text-center">
                    <Bell className="h-8 w-8 mx-auto text-[#888780]/30 mb-2" />
                    <p className="text-xs text-[#888780]">Sin notificaciones</p>
                    <p className="text-[10px] text-[#888780]/60 mt-0.5">Las notificaciones aparecerán aquí</p>
                  </div>
                )}
                </div>
              </ScrollArea>
              <div className="p-2 border-t border-[#E1F5EE]">
                <Button variant="ghost" className="w-full text-xs text-[#534AB7] h-7">
                  Marcar todas como leidas
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* User avatar with dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-[#F1EFE8] transition-colors">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#534AB7] text-white text-xs font-medium">
                      {doctorProfile.name ? doctorProfile.name.split(' ').filter(w => w.length > 2).map(w => w[0]).join('').slice(0, 2) : '??'}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online status indicator */}
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#1D9E75] border-2 border-white" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-[#2C2C2A] leading-tight">{doctorProfile.name || 'Usuario'}</p>
                  <p className="text-[11px] text-[#888780]">{doctorProfile.specialty || (isDemoMode ? 'Modo demo' : 'Mi cuenta')}</p>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 border-[#E1F5EE]" align="end">
              <div className="px-2 py-1.5 mb-1">
                <p className="text-sm font-medium text-[#2C2C2A]">{doctorProfile.name || 'Usuario'}</p>
                <p className="text-xs text-[#888780]">{doctorProfile.email || 'Sin correo'}</p>
                {isDemoMode && (
                  <span className="inline-block mt-1 text-[10px] bg-[#1D9E75]/10 text-[#1D9E75] px-1.5 py-0.5 rounded font-medium">
                    Modo demo
                  </span>
                )}
              </div>
              <Separator className="bg-[#E1F5EE] my-1" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full rounded-md px-2 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesion
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-[260px] bg-[#0F2D26] border-0">
          <SheetTitle className="sr-only">Navegacion</SheetTitle>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
              <SinapLogo size={36} variant="dark" showText showTagline />
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
                  <span className="font-medium">Configuracion</span>
                </button>

                <Separator className="bg-white/10 my-2" />

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/40 hover:text-white hover:bg-red-500/20 transition-all duration-200 w-full"
                >
                  <LogOutIcon className="h-5 w-5 shrink-0" />
                  <span className="font-medium">Cerrar sesion</span>
                </button>
              </nav>
            </ScrollArea>

            {/* Tagline */}
            <div className="px-5 py-4 border-t border-white/10">
              <p className="text-[11px] text-white/30 italic tracking-wide">
                Inteligencia que conecta
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
