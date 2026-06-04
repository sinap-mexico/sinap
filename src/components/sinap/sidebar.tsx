'use client'

import { useSinapStore, type SinapModule } from '@/lib/sinap-store'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  Activity,
  Receipt,
  TrendingUp,
  BarChart3,
  Building2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SinapLogo } from '@/components/sinap/sinap-logo'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { motion, AnimatePresence } from 'framer-motion'

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
  { module: 'desk', label: 'Sinap Desk', icon: MessageSquare },
  { module: 'flow', label: 'Sinap Flow', icon: Activity },
  { module: 'bill', label: 'Sinap Bill', icon: Receipt },
  { module: 'grow', label: 'Sinap Grow', icon: TrendingUp, requiresPlan: 'pro' },
  { module: 'sight', label: 'Sinap Sight', icon: BarChart3, requiresPlan: 'pro' },
  { module: 'hub', label: 'Sinap Hub', icon: Building2, requiresClinic: true },
]

const configItem = { module: 'config' as SinapModule, label: 'Configuracion', icon: Settings }

export function SinapSidebar() {
  const { activeModule, setActiveModule, sidebarCollapsed, toggleSidebar, plan, clinicMode, isDemoMode, resetStore } = useSinapStore()

  const handleLogout = async () => {
    // Clear demo cookie
    document.cookie = 'sinap-demo=; path=/; max-age=0; SameSite=Lax'
    // Reset Zustand store
    resetStore()
    // Sign out from NextAuth (no redirect — we do it manually)
    try { await signOut({ redirect: false }) } catch {}
    // Navigate to login
    window.location.href = '/login'
  }

  const isVisible = (item: typeof navItems[number]) => {
    if (item.requiresPlan === 'pro' && plan === 'starter') return false
    if (item.requiresClinic && clinicMode !== 'clinic') return false
    return true
  }

  return (
    <TooltipProvider delayDuration={200}>
      <motion.aside
        className="flex flex-col h-screen bg-[#0F2D26] text-white relative overflow-hidden"
        animate={{ width: sidebarCollapsed ? 72 : 250 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {/* Logo area */}
        <div className={cn('flex items-center gap-2.5 px-4 pt-5 pb-4', sidebarCollapsed && 'justify-center px-2')}>
          <SinapLogo size={36} variant="dark" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <span className="text-lg font-medium tracking-[-0.03em] text-white whitespace-nowrap leading-tight">
                  Sinap
                </span>
                <span className="text-[9px] text-white/40 tracking-wide whitespace-nowrap">
                  Inteligencia que conecta
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Separator className="bg-white/10 mx-3" />

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="flex flex-col gap-1 px-3">
            {navItems.filter(isVisible).map((item) => {
              const Icon = item.icon
              const isActive = activeModule === item.module

              const navButton = (
                <motion.button
                  key={item.module}
                  onClick={() => setActiveModule(item.module)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 relative w-full',
                    sidebarCollapsed && 'justify-center px-2',
                    isActive
                      ? 'bg-[#534AB7] text-white shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-[#1D9E75]/20'
                  )}
                  whileHover={{ x: isActive ? 0 : 3 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {/* Active indicator - left border */}
                  {isActive && (
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full"
                      layoutId="activeIndicator"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}

                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                  </motion.div>

                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.div
                        className="flex items-center flex-1 min-w-0"
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        transition={{ duration: 0.15 }}
                      >
                        <span className="font-medium truncate">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, delay: 0.2 }}
                          >
                            <Badge className="ml-auto bg-[#534AB7] text-white text-[10px] h-5 min-w-[20px] flex items-center justify-center border-0">
                              {item.badge}
                            </Badge>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {sidebarCollapsed && item.badge && item.badge > 0 && (
                    <motion.span
                      className="absolute -top-1 -right-1 bg-[#534AB7] text-white text-[10px] h-4 min-w-[16px] rounded-full flex items-center justify-center"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {item.badge}
                    </motion.span>
                  )}
                </motion.button>
              )

              // If collapsed, wrap with tooltip
              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.module}>
                    <TooltipTrigger asChild>
                      {navButton}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-[#2C2C2A] text-white text-xs border-0">
                      {item.label}
                      {item.badge ? ` (${item.badge})` : ''}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return navButton
            })}

            <Separator className="bg-white/10 my-2" />

            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={() => setActiveModule(configItem.module)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 w-full',
                    sidebarCollapsed && 'justify-center px-2',
                    activeModule === configItem.module
                      ? 'bg-[#534AB7] text-white shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-[#1D9E75]/20'
                  )}
                  whileHover={{ x: activeModule === configItem.module ? 0 : 3 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {activeModule === configItem.module && (
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full"
                      layoutId="activeIndicator"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <motion.div whileHover={{ scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }}>
                    <configItem.icon className="h-5 w-5 shrink-0" />
                  </motion.div>
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        className="font-medium"
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        transition={{ duration: 0.15 }}
                      >
                        {configItem.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right" className="bg-[#2C2C2A] text-white text-xs border-0">
                  {configItem.label}
                </TooltipContent>
              )}
            </Tooltip>
          </nav>
        </ScrollArea>

        {/* Logout + Tagline at bottom */}
        <div className="mt-auto">
          <div className="px-3 py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={handleLogout}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 w-full text-white/40 hover:text-white hover:bg-red-500/20',
                    sidebarCollapsed && 'justify-center px-2'
                  )}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        className="font-medium"
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        transition={{ duration: 0.15 }}
                      >
                        Cerrar sesion
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right" className="bg-[#2C2C2A] text-white text-xs border-0">
                  Cerrar sesion
                </TooltipContent>
              )}
            </Tooltip>
          </div>

          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                className="px-5 py-4 border-t border-white/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-[11px] text-white/30 italic tracking-wide">
                  Inteligencia que conecta
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle */}
        <motion.button
          onClick={toggleSidebar}
          className="absolute -right-3 top-7 bg-[#0F2D26] border border-white/10 rounded-full p-1 text-white/60 hover:text-white hover:bg-[#534AB7] transition-colors shadow-md z-10"
          aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div
            animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </motion.div>
        </motion.button>
      </motion.aside>
    </TooltipProvider>
  )
}
