'use client'

import { useSinapStore, type SinapModule } from '@/lib/sinap-store'
import {
  LayoutDashboard,
  MessageSquare,
  Activity,
  Receipt,
  TrendingUp,
  BarChart3,
  Building2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

const navItems: {
  module: SinapModule
  label: string
  icon: React.ElementType
  badge?: number
  requiresPlan?: 'pro' | 'enterprise'
  requiresClinic?: boolean
}[] = [
  { module: 'os', label: 'Sinap OS', icon: LayoutDashboard },
  { module: 'desk', label: 'Sinap Desk', icon: MessageSquare, badge: 3 },
  { module: 'flow', label: 'Sinap Flow', icon: Activity },
  { module: 'bill', label: 'Sinap Bill', icon: Receipt },
  { module: 'grow', label: 'Sinap Grow', icon: TrendingUp, requiresPlan: 'pro' },
  { module: 'sight', label: 'Sinap Sight', icon: BarChart3, requiresPlan: 'pro' },
  { module: 'hub', label: 'Sinap Hub', icon: Building2, requiresClinic: true },
]

const configItem = { module: 'config' as SinapModule, label: 'Configuración', icon: Settings }

export function SinapSidebar() {
  const { activeModule, setActiveModule, sidebarCollapsed, toggleSidebar, plan, clinicMode } = useSinapStore()

  const isVisible = (item: typeof navItems[number]) => {
    if (item.requiresPlan === 'pro' && plan === 'starter') return false
    if (item.requiresClinic && clinicMode !== 'clinic') return false
    return true
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-[#0F2D26] text-white transition-all duration-300 ease-in-out relative',
        sidebarCollapsed ? 'w-[72px]' : 'w-[250px]'
      )}
    >
      {/* Logo area */}
      <div className={cn('flex items-center gap-3 px-4 pt-5 pb-4', sidebarCollapsed && 'justify-center px-2')}>
        {/* Neural network logo mark */}
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="shrink-0">
          {/* Central node - Orchestrator */}
          <circle cx="18" cy="18" r="5" fill="#534AB7" />
          {/* Secondary nodes - Agents */}
          <circle cx="18" cy="5" r="3.5" fill="#1D9E75" />
          <circle cx="30" cy="14" r="3.5" fill="#1D9E75" />
          <circle cx="30" cy="26" r="3.5" fill="#1D9E75" />
          <circle cx="18" cy="31" r="3.5" fill="#1D9E75" />
          <circle cx="6" cy="26" r="3.5" fill="#1D9E75" />
          <circle cx="6" cy="14" r="3.5" fill="#1D9E75" />
          {/* Connections - Center to secondaries */}
          <line x1="18" y1="13" x2="18" y2="8.5" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
          <line x1="22.5" y1="15.5" x2="26.5" y2="14" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
          <line x1="22.5" y1="20.5" x2="26.5" y2="26" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
          <line x1="18" y1="23" x2="18" y2="27.5" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
          <line x1="13.5" y1="20.5" x2="9.5" y2="26" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
          <line x1="13.5" y1="15.5" x2="9.5" y2="14" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
          {/* Tertiary nodes - External */}
          <circle cx="18" cy="1" r="1.5" fill="#5DCAA5" opacity="0.6" />
          <circle cx="34" cy="11" r="1.5" fill="#5DCAA5" opacity="0.6" />
          <circle cx="34" cy="29" r="1.5" fill="#5DCAA5" opacity="0.6" />
          <circle cx="2" cy="29" r="1.5" fill="#5DCAA5" opacity="0.6" />
          <circle cx="2" cy="11" r="1.5" fill="#5DCAA5" opacity="0.6" />
          {/* Tertiary connections */}
          <line x1="18" y1="1.5" x2="18" y2="3.5" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.4" />
          <line x1="33" y1="12.5" x2="30.5" y2="13.5" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.4" />
          <line x1="33" y1="27.5" x2="30.5" y2="26.5" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.4" />
          <line x1="3" y1="27.5" x2="5.5" y2="26.5" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.4" />
          <line x1="3" y1="12.5" x2="5.5" y2="13.5" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.4" />
        </svg>
        {!sidebarCollapsed && (
          <span className="text-lg font-medium tracking-[-0.03em] text-white">Sinap</span>
        )}
      </div>

      <Separator className="bg-white/10 mx-3" />

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-1 px-3">
          {navItems.filter(isVisible).map((item) => {
            const Icon = item.icon
            const isActive = activeModule === item.module
            return (
              <button
                key={item.module}
                onClick={() => setActiveModule(item.module)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 relative',
                  sidebarCollapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-[#534AB7] text-white shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-[#1D9E75]/20'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="font-medium">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <Badge className="ml-auto bg-[#534AB7] text-white text-[10px] h-5 min-w-[20px] flex items-center justify-center border-0">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
                {sidebarCollapsed && item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#534AB7] text-white text-[10px] h-4 min-w-[16px] rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}

          <Separator className="bg-white/10 my-2" />

          <button
            onClick={() => setActiveModule(configItem.module)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
              sidebarCollapsed && 'justify-center px-2',
              activeModule === configItem.module
                ? 'bg-[#534AB7] text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-[#1D9E75]/20'
            )}
          >
            <configItem.icon className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">{configItem.label}</span>}
          </button>
        </nav>
      </ScrollArea>

      {/* Tagline at bottom */}
      {!sidebarCollapsed && (
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-[11px] text-white/30 italic tracking-wide">
            La sinapsis de tu negocio de salud
          </p>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-7 bg-[#0F2D26] border border-white/10 rounded-full p-1 text-white/60 hover:text-white hover:bg-[#534AB7] transition-colors shadow-md z-10"
        aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>
    </aside>
  )
}
