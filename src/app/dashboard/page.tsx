'use client'

import { useSession } from 'next-auth/react'
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
import { Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function ModuleContent({ module }: { module: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={module}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {module === 'os' && <OsOverview />}
        {module === 'agenda' && <AgendaCalendar />}
        {module === 'desk' && <DeskInbox />}
        {module === 'flow' && <FlowClinical />}
        {module === 'bill' && <BillDashboard />}
        {module === 'grow' && <GrowMarketing />}
        {module === 'sight' && <SightAnalytics />}
        {module === 'hub' && <HubOperations />}
        {module === 'config' && <SettingsPages />}
      </motion.div>
    </AnimatePresence>
  )
}

export default function SinapDashboard() {
  const { data: session, status } = useSession()
  const { activeModule, onboardingComplete } = useSinapStore()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Show loading while session is being fetched
  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F1EFE8]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-[#534AB7]" />
        </motion.div>
      </div>
    )
  }

  // Show login screen if not authenticated
  if (!session?.user) {
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
