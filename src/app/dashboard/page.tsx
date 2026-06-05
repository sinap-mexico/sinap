'use client'

import { useSession } from '@/components/providers/session-provider'
import { useRouter } from 'next/navigation'
import { useSinapStore, type SinapModule } from '@/lib/sinap-store'
import { SinapSidebar } from '@/components/sinap/sidebar'
import { SinapHeader } from '@/components/sinap/header'
import { OsOverview } from '@/components/sinap/os-overview'
import { AgendaCalendar } from '@/components/sinap/agenda-calendar'
import { DeskInbox } from '@/components/sinap/desk-inbox'
import { PatientDirectory } from '@/components/sinap/patient-directory'
import { BillDashboard } from '@/components/sinap/bill-dashboard'
import { FlowClinical } from '@/components/sinap/flow-clinical'
import { GrowMarketing } from '@/components/sinap/grow-marketing'
import { SightAnalytics } from '@/components/sinap/sight-analytics'
import { HubOperations } from '@/components/sinap/hub-operations'
import { SettingsPages } from '@/components/sinap/settings-pages'
import { OnboardingFlow } from '@/components/sinap/onboarding-flow'
import { TrialBanner } from '@/components/sinap/trial-banner'
import { Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MobileBottomNav } from '@/components/sinap/mobile-bottom-nav'

// Modules that need full viewport height (no scroll on parent)
const FULL_HEIGHT_MODULES: SinapModule[] = ['desk', 'bill']

function ModuleContent({ module }: { module: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={module}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="h-full"
      >
        {module === 'os' && <OsOverview />}
        {module === 'agenda' && <AgendaCalendar />}
        {module === 'patients' && <PatientDirectory />}
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
  const { activeModule, onboardingComplete, isDemoMode, setClinicId, setOnboardingComplete, setIsTrialExpired, setTrialDaysRemaining } = useSinapStore()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const sessionHydratedRef = useRef(false)
  const demoSeededRef = useRef(false)
  const redirectAttemptedRef = useRef(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard SSR hydration pattern
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Hydrate Zustand from session data when session is available
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user || sessionHydratedRef.current) return

    sessionHydratedRef.current = true
    const sessionUser = session.user as any

    // Set clinicId from session
    if (sessionUser.clinicId) {
      setClinicId(sessionUser.clinicId)
    }

    // For real accounts (not demo), fetch full profile from DB
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return

        // Hydrate clinic data
        if (data.clinic) {
          const c = data.clinic
          useSinapStore.getState().setClinicId(c.id)
          useSinapStore.getState().setClinicName(c.name)
          useSinapStore.getState().setClinicSlug(c.slug)
          useSinapStore.getState().setClinicMode(c.mode === 'clinic' ? 'clinic' : 'solo')
          useSinapStore.getState().setClinicProfile({
            name: c.name,
            rfc: c.rfc || '',
            address: c.address || '',
            city: c.city || '',
            state: c.state || '',
            phone: c.phone || '',
            email: c.email || '',
          })
          // Hydrate plan from DB
          if (c.plan) {
            useSinapStore.getState().setPlan(c.plan as 'starter' | 'pro' | 'enterprise')
          }

          // Auto-upgrade starter clinics to enterprise (free trial with all features)
          if (c.plan === 'starter') {
            fetch('/api/clinic/upgrade-trial', { method: 'POST' })
              .then(res => res.ok ? res.json() : null)
              .then(data => {
                if (data?.success) {
                  useSinapStore.getState().setPlan('enterprise')
                  useSinapStore.getState().setTrialDaysRemaining(7)
                  useSinapStore.getState().setIsTrialExpired(false)
                }
              })
              .catch(() => {})
          }
        }

        // Hydrate trial status
        if (data.trial) {
          useSinapStore.getState().setTrialDaysRemaining(data.trial.daysRemaining)
          useSinapStore.getState().setIsTrialExpired(data.trial.isTrialExpired)

          // Don't redirect to trial-expired for enterprise/premium accounts
          // Free trial has all premium features unlocked
          if (data.trial.isTrialExpired && !isDemoMode && data.clinic?.plan !== 'premium' && data.clinic?.plan !== 'enterprise') {
            router.replace('/trial-expired')
          }
        }

        // Hydrate doctor profile
        if (data.doctor) {
          const d = data.doctor
          useSinapStore.getState().setDoctorProfile({
            id: d.id || '',
            name: d.name || '',
            specialty: d.specialty || '',
            license: d.license || '',
            email: d.email || '',
            phone: d.phone || '',
          })
        } else if (data.user) {
          useSinapStore.getState().setDoctorProfile({
            name: data.user.name || '',
            email: data.user.email || '',
          })
        }
      })
      .catch(() => {
        // Non-blocking — if API fails, use session data
      })

    // If onboarding is not complete in Zustand but user has a session with clinicId,
    // check if the clinic already has doctors (meaning onboarding was done before)
    if (!onboardingComplete && sessionUser.clinicId) {
      fetch(`/api/doctors?clinicId=${sessionUser.clinicId}`)
        .then(res => res.ok ? res.json() : { doctors: [] })
        .then(data => {
          if (data.doctors && data.doctors.length > 0) {
            setOnboardingComplete(true)
          }
        })
        .catch(() => {})
    }
  }, [status, session, onboardingComplete, setClinicId, setOnboardingComplete])

  // Auto-seed demo data in demo mode (only once)
  useEffect(() => {
    if (!isDemoMode || demoSeededRef.current || !onboardingComplete) return
    demoSeededRef.current = true
    fetch('/api/demo/seed', { method: 'POST' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.clinicId) {
          setClinicId(data.clinicId)
        }
      })
      .catch(() => {
        // Non-blocking — modules can still trigger seed individually
      })
  }, [isDemoMode, onboardingComplete, setClinicId])

  // Auth redirect — only redirect once, never loop
  useEffect(() => {
    if (!mounted) return
    if (status === 'loading') return
    if (redirectAttemptedRef.current) return

    // User is authenticated if: they have a NextAuth session OR they are in demo mode
    const isRealAuth = status === 'authenticated' && session?.user
    const isAuthenticated = isRealAuth || isDemoMode

    if (!isAuthenticated) {
      redirectAttemptedRef.current = true
      router.replace('/login')
    }
  }, [mounted, status, session, isDemoMode, router])

  // Show loading while mounting or session is being fetched
  if (!mounted || status === 'loading') {
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

  // Check auth — only consider real NextAuth session or demo mode
  const isRealAuth = status === 'authenticated' && session?.user
  const isAuthenticated = isRealAuth || isDemoMode

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F1EFE8]">
        <Loader2 className="h-8 w-8 animate-spin text-[#534AB7]" />
      </div>
    )
  }

  // Show onboarding if not complete (only for real users with session)
  if (!onboardingComplete && isRealAuth) {
    return <OnboardingFlow />
  }

  // Demo mode without onboarding — show dashboard anyway
  if (!onboardingComplete && isDemoMode) {
    // Auto-complete onboarding for demo
    setOnboardingComplete(true)
  }

  const isFullHeight = FULL_HEIGHT_MODULES.includes(activeModule)

  // Show dashboard
  return (
    <div className="flex h-screen overflow-hidden bg-[#F1EFE8]">
      {/* Desktop sidebar */}
      {!isMobile && <SinapSidebar />}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Trial banner */}
        <TrialBanner />

        {/* Header */}
        <SinapHeader />

        {/* Content area */}
        {isFullHeight ? (
          /* Full-height modules: no scroll on parent, height passes through */
          <div className="flex-1 overflow-hidden">
            <main className="h-full p-4 lg:p-6 pb-20 lg:pb-6">
              <ModuleContent module={activeModule} />
            </main>
          </div>
        ) : (
          /* Other modules: scrollable content area */
          <div className="flex-1 overflow-y-auto sinap-scroll">
            <main className="p-4 lg:p-6 pb-20 lg:pb-6">
              <ModuleContent module={activeModule} />
            </main>
          </div>
        )}
      </div>

      {/* Mobile bottom navigation */}
      {isMobile && <MobileBottomNav />}
    </div>
  )
}
