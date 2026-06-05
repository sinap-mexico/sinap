'use client'

import { useState, useEffect } from 'react'
import { useSinapStore, type SinapModule } from '@/lib/sinap-store'
import { signOut } from 'next-auth/react'
import { Bell, Menu, Calendar, CheckCircle2, MessageSquare, Receipt, UserPlus, X, LogOut, Send, Loader2, ArrowRight } from 'lucide-react'

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
  SheetDescription,
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

// Notification type from API
interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  icon: string | null
  actionUrl: string | null
  isRead: boolean
  createdAt: string
}

// Map notification type to icon + color
const notifTypeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  appointment: { icon: Calendar, color: '#1D9E75' },
  payment: { icon: CheckCircle2, color: '#534AB7' },
  invoice: { icon: Receipt, color: '#D97706' },
  system: { icon: Activity, color: '#534AB7' },
  campaign: { icon: Send, color: '#1D9E75' },
  message: { icon: MessageSquare, color: '#1D9E75' },
  patient: { icon: UserPlus, color: '#D97706' },
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`
  return date.toLocaleDateString('es-MX')
}

export function SinapHeader() {
  const { activeModule, clinicName, plan, clinicMode, setActiveModule, clinicId, doctorProfile, isDemoMode, resetStore } = useSinapStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false)

  const handleLogout = async () => {
    document.cookie = 'sinap-demo=; path=/; max-age=0; SameSite=Lax'
    resetStore()
    try { await signOut({ redirect: false }) } catch {}
    window.location.href = '/login'
  }

  const isNavVisible = (item: typeof navItems[number]) => {
    // All features unlocked for free trial — no plan restrictions
    // if (item.requiresPlan === 'pro' && plan === 'starter') return false
    if (item.requiresClinic && clinicMode !== 'clinic') return false
    return true
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  // Fetch notifications from API
  useEffect(() => {
    if (!clinicId) return
    async function loadNotifs() {
      setIsLoadingNotifs(true)
      try {
        const res = await fetch(`/api/notifications?clinicId=${clinicId}&limit=20`)
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications || [])
        }
      } catch {
        // Non-blocking
      } finally {
        setIsLoadingNotifs(false)
      }
    }
    loadNotifs()
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifs, 30000)
    return () => clearInterval(interval)
  }, [clinicId])

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId, markAllRead: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch {
      // Non-blocking
    }
  }

  const handleMarkRead = async (notifId: string, actionUrl?: string | null) => {
    try {
      await fetch(`/api/notifications/${notifId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      })
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n))
      // Navigate if actionUrl
      if (actionUrl) {
        window.location.href = actionUrl
      }
    } catch {
      // Non-blocking
    }
  }

  return (
    <>
      <header className="h-14 md:h-16 bg-white border-b border-[#E1F5EE] flex items-center justify-between px-4 lg:px-6 shrink-0 relative">
        {/* Left: Mobile menu button (mobile) / Module title (desktop) */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop module title */}
          <div className="hidden lg:block">
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

        {/* Center: Sinap logo on mobile */}
        <div className="lg:hidden absolute left-1/2 -translate-x-1/2">
          <SinapLogo size={28} />
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
                {isLoadingNotifs ? (
                  <div className="py-8 text-center">
                    <Loader2 className="h-5 w-5 mx-auto animate-spin text-[#534AB7]" />
                    <p className="text-xs text-[#888780] mt-2">Cargando...</p>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notif, i) => {
                    const config = notifTypeConfig[notif.type] || notifTypeConfig.system
                    const NotifIcon = config.icon
                    const notifColor = config.color
                    return (
                      <motion.div
                        key={notif.id}
                        className={`p-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-[#F1EFE8] ${
                          !notif.isRead ? 'bg-[#EEEDFE]/30' : ''
                        }`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => handleMarkRead(notif.id, notif.actionUrl)}
                      >
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: notifColor + '15' }}
                        >
                          <NotifIcon className="h-4 w-4" style={{ color: notifColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#2C2C2A] leading-tight">{notif.title}</p>
                          <p className="text-xs text-[#888780] leading-relaxed mt-0.5">{notif.message}</p>
                          <p className="text-[10px] text-[#888780]/60 mt-0.5">{formatTimeAgo(notif.createdAt)}</p>
                        </div>
                        {!notif.isRead && (
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
              <div className="p-2 border-t border-[#E1F5EE] space-y-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" className="w-full text-xs text-[#534AB7] h-7" onClick={handleMarkAllRead}>
                    Marcar todas como leidas
                  </Button>
                )}
                <button
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-[#534AB7] hover:text-[#534AB7]/80 font-medium py-1.5 rounded-md hover:bg-[#EEEDFE]/50 transition-colors"
                  onClick={() => {
                    setActiveModule('os')
                  }}
                >
                  Ver todas
                  <ArrowRight className="h-3 w-3" />
                </button>
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
        <SheetContent side="left" className="p-0 w-[280px] bg-[#0F2D26] border-0">
          <SheetTitle className="sr-only">Navegacion</SheetTitle>
          <SheetDescription className="sr-only">Menu de navegacion principal</SheetDescription>
          <div className="flex flex-col h-full">
            {/* Logo + User info */}
            <div className="px-4 pt-5 pb-4">
              <div className="flex items-center gap-2.5 mb-4">
                <SinapLogo size={36} variant="dark" showText showTagline />
              </div>
              {/* User info section */}
              <div className="flex items-center gap-3 mt-3 p-3 rounded-xl bg-white/[0.06]">
                <div className="relative">
                  <Avatar className="h-10 w-10 border-2 border-white/20">
                    <AvatarFallback className="bg-[#534AB7] text-white text-sm font-medium">
                      {doctorProfile.name ? doctorProfile.name.split(' ').filter(w => w.length > 2).map(w => w[0]).join('').slice(0, 2) : '??'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#1D9E75] border-2 border-[#0F2D26]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{doctorProfile.name || 'Usuario'}</p>
                  <p className="text-[11px] text-white/50 truncate">{doctorProfile.email || (isDemoMode ? 'Modo demo' : 'Sin correo')}</p>
                </div>
              </div>
            </div>
            <Separator className="bg-white/10 mx-3" />

            {/* Navigation */}
            <ScrollArea className="flex-1 py-3">
              <nav className="flex flex-col gap-1 px-3">
                {navItems.filter(isNavVisible).map((item) => {
                  const Icon = item.icon
                  const isActive = activeModule === item.module
                  return (
                    <motion.button
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
                      whileTap={{ scale: 0.97 }}
                    >
                      {/* Active indicator - left border */}
                      {isActive && (
                        <motion.div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full"
                          layoutId="mobileActiveIndicator"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="font-medium">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <Badge className="ml-auto bg-[#534AB7] text-white text-[10px] h-5 min-w-[20px] flex items-center justify-center border-0">
                          {item.badge}
                        </Badge>
                      )}
                    </motion.button>
                  )
                })}
                <Separator className="bg-white/10 my-2" />
                <motion.button
                  onClick={() => {
                    setActiveModule('config')
                    setMobileMenuOpen(false)
                  }}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 relative ${
                    activeModule === 'config'
                      ? 'bg-[#534AB7] text-white shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-[#1D9E75]/20'
                  }`}
                  whileTap={{ scale: 0.97 }}
                >
                  {activeModule === 'config' && (
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full"
                      layoutId="mobileActiveIndicator"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Settings className="h-5 w-5 shrink-0" />
                  <span className="font-medium">Configuracion</span>
                </motion.button>
              </nav>
            </ScrollArea>

            {/* Bottom section: Logout + Tagline */}
            <div className="mt-auto border-t border-white/10">
              <div className="px-3 py-2">
                <motion.button
                  onClick={handleLogout}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/40 hover:text-white hover:bg-red-500/20 transition-all duration-200 w-full"
                  whileTap={{ scale: 0.97 }}
                >
                  <LogOutIcon className="h-5 w-5 shrink-0" />
                  <span className="font-medium">Cerrar sesion</span>
                </motion.button>
              </div>
              <div className="px-5 pb-4">
                <p className="text-[11px] text-white/30 italic tracking-wide">
                  Inteligencia que conecta
                </p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
