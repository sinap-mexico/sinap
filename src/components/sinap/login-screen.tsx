'use client'

import { useState, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { useSinapStore } from '@/lib/sinap-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Mail, Lock, User, ArrowRight, ArrowLeft, Loader2,
  Eye, EyeOff, Building2, KeyRound, Brain, Shield, BarChart3,
  Monitor, ShieldCheck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SinapLogo } from '@/components/sinap/sinap-logo'

/* ------------------------------------------------------------------ */
/*  Subtle network constellation background — VERY faint              */
/* ------------------------------------------------------------------ */
function NetworkBackground() {
  const nodes = [
    { x: 12, y: 15, r: 2, o: 0.35 },
    { x: 30, y: 8, r: 1.5, o: 0.25 },
    { x: 55, y: 12, r: 2.5, o: 0.3 },
    { x: 78, y: 10, r: 1.5, o: 0.2 },
    { x: 90, y: 20, r: 2, o: 0.25 },
    { x: 8, y: 45, r: 1.5, o: 0.2 },
    { x: 25, y: 40, r: 2.5, o: 0.3 },
    { x: 50, y: 38, r: 2, o: 0.25 },
    { x: 72, y: 42, r: 1.5, o: 0.15 },
    { x: 88, y: 50, r: 2.5, o: 0.3 },
    { x: 15, y: 70, r: 2, o: 0.25 },
    { x: 40, y: 68, r: 1.5, o: 0.2 },
    { x: 62, y: 72, r: 2.5, o: 0.3 },
    { x: 85, y: 65, r: 1.5, o: 0.2 },
    { x: 35, y: 88, r: 2, o: 0.25 },
    { x: 60, y: 90, r: 1.5, o: 0.15 },
    { x: 80, y: 85, r: 2, o: 0.25 },
  ]

  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8], [8, 9],
    [5, 10], [6, 11], [7, 12], [8, 13],
    [10, 11], [11, 12], [12, 13],
    [10, 14], [11, 15], [13, 16],
    [14, 15], [15, 16],
  ]

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        {/* Radial gradient: lighter center for text readability */}
        <radialGradient id="bgGradient" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#0F2942" />
          <stop offset="100%" stopColor="#0A1929" />
        </radialGradient>
        {/* Subtle glow behind text area */}
        <radialGradient id="textGlow" cx="50%" cy="45%" r="35%">
          <stop offset="0%" stopColor="#1D9E75" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#1D9E75" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4FD1C5" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#4FD1C5" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background gradient */}
      <rect width="100" height="100" fill="url(#bgGradient)" />

      {/* Subtle glow behind content */}
      <rect width="100" height="100" fill="url(#textGlow)" />

      {/* Faint circular grid lines emanating from center */}
      <circle cx="50" cy="45" r="18" stroke="#4FD1C5" strokeWidth="0.1" opacity="0.08" />
      <circle cx="50" cy="45" r="32" stroke="#4FD1C5" strokeWidth="0.08" opacity="0.05" />
      <circle cx="50" cy="45" r="46" stroke="#4FD1C5" strokeWidth="0.06" opacity="0.03" />

      {/* Connection lines — very faint */}
      {connections.map(([a, b], i) => (
        <line
          key={`line-${i}`}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="#4FD1C5"
          strokeWidth="0.08"
          opacity="0.07"
        />
      ))}

      {/* Teal nodes with subtle glow */}
      {nodes.map((node, i) => (
        <g key={`node-${i}`}>
          <circle cx={node.x} cy={node.y} r={node.r * 3} fill="url(#dotGlow)" opacity="0.08" />
          <circle cx={node.x} cy={node.y} r={node.r} fill="#4FD1C5" opacity={node.o} />
        </g>
      ))}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Feature item for horizontal row                                    */
/* ------------------------------------------------------------------ */
function FeatureItem({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center w-7 h-7 rounded-full border border-[#4FD1C5]/30">
        <Icon className="w-3.5 h-3.5 text-[#4FD1C5]" />
      </div>
      <span className="text-[13px] text-white/80 font-normal whitespace-nowrap">{label}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Form input with icon                                               */
/* ------------------------------------------------------------------ */
function FormInput({
  label,
  icon: Icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  onKeyDown,
  hasError,
  errorHint,
  rightElement,
}: {
  label: string
  icon: React.ElementType
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  hasError?: boolean
  errorHint?: string
  rightElement?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-normal text-[#2C2C2A]/70">{label}</Label>
      <div className="relative group">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#1D9E75]/60 group-focus-within:text-[#1D9E75] transition-colors" />
        <Input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className={`pl-11 h-12 text-sm bg-white border-[1.5px] rounded-lg transition-all duration-200 placeholder:text-[#888780]/50 ${
            hasError
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-[#E8E6DF] focus:border-[#534AB7] focus:ring-[#534AB7]/10 hover:border-[#888780]/40'
          } focus:ring-2 focus:ring-offset-0`}
        />
        {errorHint && hasError && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-red-500 font-medium">
            {errorHint}
          </span>
        )}
        {rightElement && !hasError && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Login Screen                                                  */
/* ------------------------------------------------------------------ */
const formVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

const shakeAnimation = {
  x: [0, -8, 8, -6, 6, -3, 3, 0],
  transition: { duration: 0.4 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export function LoginScreen() {
  const { setOnboardingComplete } = useSinapStore()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [shakeError, setShakeError] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const emailValid = email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : true
  const passwordValid = password ? password.length >= 8 : true
  const passwordsMatch = confirmPassword ? password === confirmPassword : true

  const triggerShake = useCallback(() => {
    setShakeError(true)
    setTimeout(() => setShakeError(false), 500)
  }, [])

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Completa todos los campos')
      triggerShake()
      return
    }
    if (!emailValid) {
      setError('Ingresa un correo electrónico válido')
      triggerShake()
      return
    }
    setError('')
    setIsLoading(true)
    try {
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError('Correo o contraseña incorrectos')
        triggerShake()
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      triggerShake()
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Completa todos los campos')
      triggerShake()
      return
    }
    if (!emailValid) {
      setError('Ingresa un correo electrónico válido')
      triggerShake()
      return
    }
    if (!passwordValid) {
      setError('La contraseña debe tener al menos 8 caracteres')
      triggerShake()
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      triggerShake()
      return
    }
    setError('')
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, password,
          clinicName: clinicName || name,
          mode: clinicName ? 'clinic' : 'solo',
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Error al crear la cuenta')
        triggerShake()
        return
      }
      await signIn('credentials', { email, password, redirect: false })
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      triggerShake()
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        email: 'demo@sinap.health',
        password: 'demo1234',
        redirect: false,
      })
      if (result?.error) {
        setError('Error al acceder al demo')
        triggerShake()
      } else {
        setOnboardingComplete(true)
      }
    } catch {
      setError('Error al acceder al demo')
      triggerShake()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* ============================================================ */}
      {/* LEFT PANEL — Dark brand panel                                */}
      {/* ============================================================ */}
      <div className="hidden lg:flex lg:w-[55%] flex-col items-center justify-center p-16 relative overflow-hidden">
        {/* Network background with radial gradient */}
        <NetworkBackground />

        {/* Content layer */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          {/* Logo — white on dark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <SinapLogo size={80} animate={false} variant="dark" />
            </motion.div>
          </motion.div>

          {/* Brand name — pure white, large, tight tracking */}
          <motion.h1
            className="text-[3rem] font-semibold tracking-[-0.04em] text-white mt-7 mb-2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Sinap
          </motion.h1>

          {/* Tagline — brand green */}
          <motion.p
            className="text-lg text-[#1D9E75] font-medium mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            Inteligencia que conecta
          </motion.p>

          {/* Description — white at 80% opacity for readability */}
          <motion.p
            className="text-[15px] text-white/80 leading-relaxed max-w-sm mb-12"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            La plataforma multi-agente para clínicas y consultorios que quieren operar con más inteligencia.
          </motion.p>

          {/* Features — HORIZONTAL row with vertical dividers */}
          <motion.div
            className="flex items-center gap-0"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
          >
            <FeatureItem icon={Brain} label="Inteligencia artificial" />
            <div className="w-px h-6 bg-white/15 mx-5" />
            <FeatureItem icon={Shield} label="Seguridad y cumplimiento" />
            <div className="w-px h-6 bg-white/15 mx-5" />
            <FeatureItem icon={BarChart3} label="Decisiones basadas en datos" />
          </motion.div>

          {/* Security badge */}
          <motion.div
            className="mt-12 flex items-center gap-2 text-white/40 text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#4FD1C5]/50" />
            Segura, confiable y diseñada para la salud
          </motion.div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT PANEL — Login form on white                            */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 sm:px-8 py-8 relative overflow-y-auto">
        {/* Mobile logo */}
        <motion.div
          className="lg:hidden flex flex-col items-center mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <SinapLogo size={44} variant="light" showText showTagline />
        </motion.div>

        {/* Form container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-[380px]"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-7"
          >
            <h2 className="text-[1.65rem] font-medium tracking-[-0.03em] text-[#2C2C2A] leading-tight">
              {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
            </h2>
            <p className="text-sm text-[#888780] mt-1.5">
              {isRegister ? 'Registra tu consultorio en Sinap' : 'Accede a tu plataforma Sinap'}
            </p>
          </motion.div>

          {/* Error message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, x: 0 }}
                animate={{ opacity: 1, height: 'auto', ...(shakeError ? shakeAnimation : {}) }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-sm flex items-start gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form fields */}
          <motion.div
            className="space-y-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            key={isRegister ? 'register' : 'login'}
          >
            {/* Register-only fields */}
            <AnimatePresence mode="wait">
              {isRegister && (
                <motion.div
                  key="register-fields"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="space-y-4 overflow-hidden"
                >
                  <motion.div variants={staggerItem}>
                    <FormInput
                      label="Nombre completo"
                      icon={User}
                      placeholder="Dr. Nombre Apellido"
                      value={name}
                      onChange={setName}
                    />
                  </motion.div>
                  <motion.div variants={staggerItem}>
                    <FormInput
                      label="Nombre de la clínica (opcional)"
                      icon={Building2}
                      placeholder="Clínica San Ángel"
                      value={clinicName}
                      onChange={setClinicName}
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <motion.div variants={staggerItem}>
              <FormInput
                label="Correo electrónico"
                icon={Mail}
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={setEmail}
                hasError={!!(email && !emailValid)}
                errorHint="Inválido"
              />
            </motion.div>

            {/* Password */}
            <motion.div variants={staggerItem}>
              <FormInput
                label="Contraseña"
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={setPassword}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isRegister) handleLogin()
                }}
                hasError={!!(password && !passwordValid)}
                errorHint="Mín. 8"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#888780]/60 hover:text-[#1D9E75] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                }
              />
            </motion.div>

            {/* Confirm password (register) */}
            <AnimatePresence mode="wait">
              {isRegister && (
                <motion.div
                  key="confirm-password"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <FormInput
                    label="Confirmar contraseña"
                    icon={Lock}
                    type="password"
                    placeholder="Confirma tu contraseña"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRegister()
                    }}
                    hasError={!!(confirmPassword && !passwordsMatch)}
                    errorHint="No coincide"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Remember me + Forgot password */}
            {!isRegister && (
              <motion.div variants={staggerItem} className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(v === true)}
                    className="h-4 w-4 rounded border-[#888780]/30 data-[state=checked]:bg-[#1D9E75] data-[state=checked]:border-[#1D9E75] data-[state=checked]:text-white"
                  />
                  <label htmlFor="remember" className="text-[13px] text-[#888780] cursor-pointer select-none">
                    Recordarme en este dispositivo
                  </label>
                </div>
                <button
                  type="button"
                  className="text-[13px] text-[#534AB7] hover:text-[#534AB7]/80 transition-colors inline-flex items-center gap-1 font-medium"
                >
                  <KeyRound className="h-3 w-3" />
                  Olvidé mi contraseña
                </button>
              </motion.div>
            )}

            {/* Primary button */}
            <motion.div variants={staggerItem} className="pt-1">
              <Button
                className="w-full h-12 bg-[#534AB7] hover:bg-[#4A42A5] text-white text-[15px] font-medium rounded-lg transition-all duration-200 active:scale-[0.98] shadow-lg shadow-[#534AB7]/20 hover:shadow-[#534AB7]/30"
                onClick={isRegister ? handleRegister : handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
                    <ArrowRight className="h-[18px] w-[18px]" />
                  </span>
                )}
              </Button>
            </motion.div>

            {/* Divider */}
            <motion.div variants={staggerItem} className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E8E6DF]" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-[12px] text-[#888780]/60">o</span>
              </div>
            </motion.div>

            {/* Secondary buttons */}
            <motion.div variants={staggerItem} className="space-y-2.5">
              <Button
                variant="outline"
                className="w-full h-11 border-[#1D9E75]/40 text-[#1D9E75] hover:bg-[#1D9E75]/8 hover:border-[#1D9E75]/60 text-sm font-medium rounded-lg transition-all duration-200 active:scale-[0.98]"
                onClick={() => { setIsRegister(!isRegister); setError('') }}
                disabled={isLoading}
              >
                {isRegister ? (
                  <span className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Ya tengo cuenta
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Crear cuenta nueva
                  </span>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full h-11 border-[#E8E6DF] text-[#888780] hover:bg-[#F1EFE8] hover:text-[#2C2C2A] text-sm font-normal rounded-lg transition-all duration-200 active:scale-[0.98]"
                onClick={handleDemoLogin}
                disabled={isLoading}
              >
                <span className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Entrar en modo demo
                </span>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Footer security */}
        <motion.div
          className="absolute bottom-6 left-0 right-0 flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <div className="flex items-center gap-1.5 text-[11px] text-[#888780]/50">
            <ShieldCheck className="h-3 w-3 text-[#1D9E75]/40" />
            Tus datos están protegidos con los más altos estándares de seguridad
          </div>
        </motion.div>
      </div>
    </div>
  )
}
