'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { useSession } from '@/components/providers/session-provider'
import { useSinapStore } from '@/lib/sinap-store'
import { SinapLogo } from '@/components/sinap/sinap-logo'
import { Button } from '@/components/ui/button'
import { Crown, Zap, Clock, ArrowLeft, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'

export default function TrialExpiredPage() {
  const { data: session } = useSession()
  const { clinicName, resetStore } = useSinapStore()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    resetStore()
    document.cookie = 'sinap-demo=; path=/; max-age=0'
    await signOut({ redirect: false })
    window.location.href = '/login'
  }

  const handleGoBack = () => {
    // Allow them to see demo mode at least
    document.cookie = 'sinap-demo=true; path=/; max-age=86400; SameSite=Lax'
    useSinapStore.getState().setIsDemoMode(true)
    useSinapStore.getState().setOnboardingComplete(true)
    window.location.href = '/dashboard'
  }

  const plans = [
    {
      name: 'Starter',
      price: '$499',
      period: '/mes',
      description: 'Para consultorios independientes',
      features: ['1 doctor', '200 conversaciones/mes', 'Notas SOAP con IA', 'Facturación CFDI', 'Agenda inteligente'],
      popular: false,
    },
    {
      name: 'Pro',
      price: '$999',
      period: '/mes',
      description: 'Para clínicas en crecimiento',
      features: ['Hasta 3 doctores', 'Conversaciones ilimitadas', 'IA en modo automático', 'WhatsApp Business', 'Reportes avanzados'],
      popular: true,
    },
    {
      name: 'Premium',
      price: '$1,999',
      period: '/mes',
      description: 'Para clínicas grandes',
      features: ['Doctores ilimitados', 'Todo incluido', 'API personalizada', 'Soporte prioritario', 'Multi-sucursal'],
      popular: false,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F2D26] via-[#0A1929] to-[#1a1040] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <SinapLogo size={32} variant="dark" showText />
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white hover:bg-white/10 text-xs"
            onClick={handleGoBack}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Modo demo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white hover:bg-white/10 text-xs"
            onClick={handleLogout}
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Cerrar sesión
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto"
        >
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-6">
            <Crown className="w-8 h-8 text-amber-400" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Tu prueba gratuita ha terminado
          </h1>
          <p className="text-white/60 text-lg mb-2">
            {clinicName || 'Tu clínica'} estuvo activa durante 7 días gratis.
          </p>
          <p className="text-white/40 text-sm mb-10">
            Tus datos están seguros. Suscríbete para recuperar acceso completo a Sinap.
          </p>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
            {plans.map((plan) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + plans.indexOf(plan) * 0.1, duration: 0.4 }}
                className={`relative rounded-xl p-5 text-left transition-all duration-200 ${
                  plan.popular
                    ? 'bg-gradient-to-b from-[#534AB7]/30 to-[#534AB7]/10 border-2 border-[#534AB7]/50 ring-1 ring-[#534AB7]/20'
                    : 'bg-white/5 border border-white/10 hover:border-white/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#534AB7] text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Popular
                  </div>
                )}
                <h3 className="text-white font-semibold text-sm mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-0.5 mb-2">
                  <span className="text-2xl font-bold text-white">{plan.price}</span>
                  <span className="text-white/40 text-xs">{plan.period}</span>
                </div>
                <p className="text-white/40 text-xs mb-3">{plan.description}</p>
                <ul className="space-y-1.5 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-white/60 text-xs">
                      <Zap className="w-3 h-3 text-[#1D9E75] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full text-xs font-semibold rounded-lg ${
                    plan.popular
                      ? 'bg-[#534AB7] hover:bg-[#4A42A5] text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                  onClick={() => window.open('https://sinap.mx/precios', '_blank')}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Elegir {plan.name}
                </Button>
              </motion.div>
            ))}
          </div>

          <p className="text-white/30 text-xs">
            ¿Necesitas más información?{' '}
            <a href="https://sinap.mx" target="_blank" rel="noopener noreferrer" className="text-[#1D9E75] hover:underline">
              Visita sinap.mx
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
