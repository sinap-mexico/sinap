'use client'

import { useSinapStore, type SinapModule } from '@/lib/sinap-store'
import { SinapSidebar } from '@/components/sinap/sidebar'
import { SinapHeader } from '@/components/sinap/header'
import { OsOverview } from '@/components/sinap/os-overview'
import { AgendaCalendar } from '@/components/sinap/agenda-calendar'
import { DeskInbox } from '@/components/sinap/desk-inbox'
import { BillDashboard } from '@/components/sinap/bill-dashboard'
import { FlowClinical } from '@/components/sinap/flow-clinical'
import { GrowMarketing } from '@/components/sinap/grow-marketing'
import { SightAnalytics } from '@/components/sinap/sight-analytics'
import { HubOperations } from '@/components/sinap/hub-operations'
import { SettingsPages } from '@/components/sinap/settings-pages'
import { LoginScreen } from '@/components/sinap/login-screen'
import { OnboardingFlow } from '@/components/sinap/onboarding-flow'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState, useEffect } from 'react'

function ModuleContent({ module }: { module: string }) {
  switch (module) {
    case 'os':
      return <OsOverview />
    case 'agenda':
      return <AgendaCalendar />
    case 'desk':
      return <DeskInbox />
    case 'flow':
      return <FlowClinical />
    case 'bill':
      return <BillDashboard />
    case 'grow':
      return <GrowMarketing />
    case 'sight':
      return <SightAnalytics />
    case 'hub':
      return <HubOperations />
    case 'config':
      return <SettingsPages />
    default:
      return <OsOverview />
  }
}

export default function SinapDashboard() {
  const { activeModule, isLoggedIn, onboardingComplete } = useSinapStore()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return <LoginScreen />
  }

  // Show onboarding if not complete
  if (!onboardingComplete) {
    return <OnboardingFlow />
  }

  // Show dashboard
  return (
    <div className="flex h-screen overflow-hidden bg-[#F1EFE8]">
      {/* Desktop sidebar */}
      {!isMobile && <SinapSidebar />}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <SinapHeader />

        {/* Content area */}
        <ScrollArea className="flex-1">
          <main className="p-4 lg:p-6">
            <ModuleContent module={activeModule} />
          </main>
        </ScrollArea>
      </div>
    </div>
  )
}
