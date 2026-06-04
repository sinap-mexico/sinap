'use client'

import { useSinapStore } from '@/lib/sinap-store'
import { Clock, X, Zap, Crown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function TrialBanner() {
  const { isDemoMode, trialDaysRemaining, isTrialExpired, setTrialDaysRemaining, setIsTrialExpired } = useSinapStore()
  const [dismissed, setDismissed] = useState(false)
  const [fetched, setFetched] = useState(false)

  // Fetch trial status from API on mount (for real accounts only)
  useEffect(() => {
    if (isDemoMode || fetched) return
    setFetched(true)

    fetch('/api/auth/trial')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.trial) return
        setTrialDaysRemaining(data.trial.daysRemaining)
        setIsTrialExpired(data.trial.isTrialExpired)
      })
      .catch(() => {
        // Non-blocking
      })
  }, [isDemoMode, fetched, setTrialDaysRemaining, setIsTrialExpired])

  // Don't show banner for demo mode or if dismissed or trial is not close to expiry
  if (isDemoMode || dismissed) return null

  // Trial expired — show blocking banner
  if (isTrialExpired) {
    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        className="bg-gradient-to-r from-red-600 to-red-700 text-white"
      >
        <div className="px-4 py-3 flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Tu prueba gratuita ha terminado</p>
              <p className="text-xs text-white/80">Suscríbete para seguir usando Sinap con todos tus datos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://sinap.mx/precios"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white text-red-700 text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Activar plan
            </a>
          </div>
        </div>
      </motion.div>
    )
  }

  // Trial active but less than 4 days remaining — show warning banner
  if (trialDaysRemaining <= 3) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
        >
          <div className="px-4 py-2.5 flex items-center justify-between max-w-full">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 animate-pulse" />
              <p className="text-sm font-medium">
                Quedan <span className="font-bold">{trialDaysRemaining} día{trialDaysRemaining !== 1 ? 's' : ''}</span> de tu prueba gratuita
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://sinap.mx/precios"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-md hover:bg-white/30 transition-colors"
              >
                <Zap className="w-3 h-3" />
                Ver planes
              </a>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Trial active with more than 3 days — subtle info banner
  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-[#534AB7]/10 border-b border-[#534AB7]/20"
      >
        <div className="px-4 py-2 flex items-center justify-between max-w-full">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#534AB7]" />
            <p className="text-xs text-[#534AB7] font-medium">
              Prueba gratuita: {trialDaysRemaining} día{trialDaysRemaining !== 1 ? 's' : ''} restante{trialDaysRemaining !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://sinap.mx/precios"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#534AB7] hover:text-[#534AB7]/80 font-semibold transition-colors"
            >
              Ver planes
            </a>
            <button
              onClick={() => setDismissed(true)}
              className="p-0.5 hover:bg-[#534AB7]/10 rounded transition-colors"
            >
              <X className="w-3 h-3 text-[#534AB7]/60" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
