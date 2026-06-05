'use client'

import { useState } from 'react'
import { useSinapStore, type SinapModule } from '@/lib/sinap-store'
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
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'

// Bottom nav primary items (5 key modules always visible)
const primaryNavItems: {
  module: SinapModule
  label: string
  icon: React.ElementType
}[] = [
  { module: 'os', label: 'OS', icon: LayoutDashboard },
  { module: 'agenda', label: 'Agenda', icon: Calendar },
  { module: 'patients', label: 'Pacientes', icon: Users },
  { module: 'desk', label: 'Desk', icon: MessageSquare },
  { module: 'flow', label: 'Flow', icon: Activity },
]

// Secondary items (shown in "More" sheet)
const secondaryNavItems: {
  module: SinapModule
  label: string
  icon: React.ElementType
  requiresPlan?: 'pro' | 'enterprise'
  requiresClinic?: boolean
}[] = [
  { module: 'bill', label: 'Sinap Bill', icon: Receipt },
  { module: 'grow', label: 'Sinap Grow', icon: TrendingUp, requiresPlan: 'pro' },
  { module: 'sight', label: 'Sinap Sight', icon: BarChart3, requiresPlan: 'pro' },
  { module: 'hub', label: 'Sinap Hub', icon: Building2, requiresClinic: true },
  { module: 'config', label: 'Config', icon: Settings },
]

export function MobileBottomNav() {
  const { activeModule, setActiveModule, plan, clinicMode } = useSinapStore()
  const [moreOpen, setMoreOpen] = useState(false)

  const isSecondaryVisible = (item: typeof secondaryNavItems[number]) => {
    // All features unlocked for free trial — no plan restrictions
    // if (item.requiresPlan === 'pro' && plan === 'starter') return false
    if (item.requiresClinic && clinicMode !== 'clinic') return false
    return true
  }

  // Check if any secondary item is active
  const isSecondaryActive = secondaryNavItems.some(
    (item) => activeModule === item.module
  )

  const handlePrimaryTap = (module: SinapModule) => {
    setActiveModule(module)
  }

  const handleSecondaryTap = (module: SinapModule) => {
    setActiveModule(module)
    setMoreOpen(false)
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="h-16 bg-white/95 backdrop-blur-lg border-t border-[#E1F5EE] shadow-[0_-2px_10px_rgba(0,0,0,0.06)] flex items-center justify-around px-1">
          {primaryNavItems.map((item) => {
            const Icon = item.icon
            const isActive = activeModule === item.module
            return (
              <motion.button
                key={item.module}
                onClick={() => handlePrimaryTap(item.module)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 min-w-[48px] py-1.5 rounded-lg transition-colors relative',
                  isActive
                    ? 'text-[#534AB7]'
                    : 'text-[#888780] active:text-[#2C2C2A]'
                )}
                whileTap={{ scale: 0.9 }}
              >
                {isActive && (
                  <motion.div
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-[#534AB7] rounded-full"
                    layoutId="bottomNavIndicator"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </motion.button>
            )
          })}

          {/* More button */}
          <motion.button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 min-w-[48px] py-1.5 rounded-lg transition-colors relative',
              isSecondaryActive
                ? 'text-[#534AB7]'
                : 'text-[#888780] active:text-[#2C2C2A]'
            )}
            whileTap={{ scale: 0.9 }}
          >
            {isSecondaryActive && (
              <motion.div
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-[#534AB7] rounded-full"
                layoutId="bottomNavIndicatorMore"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight">Más</span>
          </motion.button>
        </div>
      </nav>

      {/* "More" Sheet — slides up from bottom */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl border-t border-[#E1F5EE] p-0 max-h-[70vh] bg-white">
          <SheetTitle className="sr-only">Más módulos</SheetTitle>
          <SheetDescription className="sr-only">Acceso a los módulos adicionales de Sinap</SheetDescription>

          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-[#E1F5EE]" />
          </div>

          {/* Header */}
          <div className="px-5 pb-3">
            <h3 className="text-sm font-medium text-[#2C2C2A] tracking-[-0.03em]">Más módulos</h3>
            <p className="text-xs text-[#888780] mt-0.5">Acceso rápido a todos los agentes</p>
          </div>

          <Separator className="bg-[#E1F5EE]" />

          {/* Module grid */}
          <div className="grid grid-cols-3 gap-1 p-4">
            <AnimatePresence>
              {secondaryNavItems.filter(isSecondaryVisible).map((item, i) => {
                const Icon = item.icon
                const isActive = activeModule === item.module
                return (
                  <motion.button
                    key={item.module}
                    onClick={() => handleSecondaryTap(item.module)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 rounded-xl p-4 transition-colors',
                      isActive
                        ? 'bg-[#534AB7]/10 text-[#534AB7]'
                        : 'text-[#2C2C2A] hover:bg-[#F1EFE8] active:bg-[#E1F5EE]'
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div
                      className={cn(
                        'h-10 w-10 rounded-lg flex items-center justify-center',
                        isActive
                          ? 'bg-[#534AB7] text-white'
                          : 'bg-[#F1EFE8] text-[#534AB7]'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-medium leading-tight text-center">
                      {item.label.replace('Sinap ', '')}
                    </span>
                    {isActive && (
                      <Badge className="bg-[#534AB7] text-white text-[8px] h-4 px-1.5 border-0">
                        Activo
                      </Badge>
                    )}
                  </motion.button>
                )
              })}
            </AnimatePresence>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
