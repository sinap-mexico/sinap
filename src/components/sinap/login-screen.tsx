'use client'

import { useState, useCallback, useEffect } from 'react'
// Note: We do NOT use signIn() from next-auth/react for the actual login.
// signIn() with redirect:false uses fetch() internally, which doesn't reliably
// set HttpOnly cookies from 302 redirect responses. Instead, we use native
// HTML form submission which guarantees proper cookie handling.
import { useSinapStore } from '@/lib/sinap-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Mail, Lock, User, ArrowRight, ArrowLeft, Loader2,
  Eye, EyeOff, Building2, KeyRound, Brain, Shield, BarChart3,
  Monitor, ShieldCheck, CheckCircle2
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
        <radialGradient id="bgGradient" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#0F2942" />
          <stop offset="100%" stopColor="#0A1929" />
        </radialGradient>
        <radialGradient id="textGlow" cx="50%" cy="45%" r="35%">
          <stop offset="0%" stopColor="#1D9E75" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#1D9E75" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4FD1C5" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#4FD1C5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#bgGradient)" />
      <rect width="100" height="100" fill="url(#textGlow)" />
      <circle cx="50" cy="45" r="18" stroke="#4FD1C5" strokeWidth="0.1" opacity="0.08" />
      <circle cx="50" cy="45" r="32" stroke="#4FD1C5" strokeWidth="0.08" opacity="0.05" />
      <circle cx="50" cy="45" r="46" stroke="#4FD1C5" strokeWidth="0.06" opacity="0.03" />
      {connections.map(([a, b], i) => (
        <line key={`line-${i}`} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke="#4FD1C5" strokeWidth="0.08" opacity="0.07" />
      ))}
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

export function LoginScreen({ authError, resetSuccess: resetSuccessProp }: { authError?: string | null; resetSuccess?: boolean }) {
  const { setOnboardingComplete, setIsDemoMode, setClinicId, clearForRealLogin } = useSinapStore()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [error, setError] = useState(() => {
    // Show NextAuth error from URL parameter on initial load
    if (authError === 'CredentialsSignin') return 'Correo o contraseña incorrectos'
    if (authError === 'OAuthCallback') return 'No se pudo conectar con Google. Intenta de nuevo.'
    if (authError === 'OAuthAccountNotLinked') return 'Esta cuenta de Google ya está vinculada a otro usuario.'
    if (authError === 'AccessDenied') return 'Acceso denegado. Contacta al administrador.'
    if (authError) return 'Error de autenticación. Intenta de nuevo.'
    return ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [shakeError, setShakeError] = useState(() => !!authError)
  const [rememberMe, setRememberMe] = useState(true)

  // Forgot password dialog state
  const [showForgotDialog, setShowForgotDialog] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotError, setForgotError] = useState('')

  // Reset password success toast
  const [showResetToast, setShowResetToast] = useState(false)

  // Show reset success toast on mount if resetSuccessProp is true
  useEffect(() => {
    if (resetSuccessProp) {
      setShowResetToast(true)
      const timer = setTimeout(() => setShowResetToast(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [resetSuccessProp])

  const handleForgotPassword = useCallback(async () => {
    if (!forgotEmail) {
      setForgotError('Ingresa tu correo electrónico')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(forgotEmail)) {
      setForgotError('Ingresa un correo electrónico válido')
      return
    }
    setForgotError('')
    setForgotLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        setForgotError(data.error || 'Error al enviar el correo')
        return
      }
      setForgotSuccess(true)
    } catch {
      setForgotError('Error de conexión. Intenta de nuevo.')
    } finally {
      setForgotLoading(false)
    }
  }, [forgotEmail])

  const openForgotDialog = useCallback(() => {
    setForgotEmail(email) // Pre-fill with current email if present
    setForgotSuccess(false)
    setForgotError('')
    setShowForgotDialog(true)
  }, [email])

  const emailValid = email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : true
  const passwordValid = password ? password.length >= 8 : true
  const passwordsMatch = confirmPassword ? password === confirmPassword : true

  const triggerShake = useCallback(() => {
    setShakeError(true)
    setTimeout(() => setShakeError(false), 500)
  }, [])

  // Native form submission to NextAuth — bypasses fetch() which doesn't reliably
  // set HttpOnly cookies from 302 redirect responses in all browsers.
  // Using a real HTML form ensures the browser processes Set-Cookie headers correctly.
  const submitLoginForm = useCallback(async (email: string, password: string, callbackUrl: string) => {
    try {
      // Get CSRF token from NextAuth
      const csrfRes = await fetch('/api/auth/csrf')
      const { csrfToken } = await csrfRes.json()

      // Create a hidden form and submit it natively
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = '/api/auth/callback/credentials'
      form.style.display = 'none'

      const fields: Record<string, string> = {
        email,
        password,
        csrfToken,
        callbackUrl,
      }

      for (const [name, value] of Object.entries(fields)) {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = name
        input.value = value
        form.appendChild(input)
      }

      document.body.appendChild(form)
      form.submit()
      // After form.submit(), the browser navigates to callbackUrl (success)
      // or /login?error=CredentialsSignin (failure)
      // No JS code runs after this point — the page unloads
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      triggerShake()
      setIsLoading(false)
    }
  }, [triggerShake])

  const handleGoogleSignIn = useCallback(() => {
    setIsLoading(true)
    // Clear demo data before Google sign-in
    document.cookie = 'sinap-demo=; path=/; max-age=0'
    clearForRealLogin()
    // Use NextAuth's built-in Google OAuth flow
    // signIn() redirects to Google, then back to callbackUrl
    import('next-auth/react').then(({ signIn }) => {
      signIn('google', { callbackUrl: '/dashboard' })
    }).catch(() => {
      setError('Error al conectar con Google. Intenta de nuevo.')
      setIsLoading(false)
    })
  }, [clearForRealLogin])

  const navigateToDemo = useCallback(() => {
    setOnboardingComplete(true)
    setIsDemoMode(true)
    // Demo mode uses a cookie, so full reload is needed for middleware to see it
    window.location.href = '/dashboard'
  }, [setOnboardingComplete, setIsDemoMode])

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
    // Clear demo data BEFORE form submission (page unloads after submit)
    document.cookie = 'sinap-demo=; path=/; max-age=0'
    clearForRealLogin()
    setOnboardingComplete(true)
    // Use native form submission — ensures HttpOnly cookies are set properly
    // by the browser's native form handler (fetch() doesn't reliably do this)
    await submitLoginForm(email, password, '/dashboard')
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
        setIsLoading(false)
        return
      }
      // Account created successfully — auto-login via native form submission
      // This bypasses fetch() which doesn't reliably set HttpOnly cookies from 302 responses
      // Clear demo data BEFORE form submission (page unloads after submit)
      document.cookie = 'sinap-demo=; path=/; max-age=0'
      clearForRealLogin()
      // Store clinicId from register response so onboarding can use it
      if (data.clinicId) {
        setClinicId(data.clinicId)
      }
      await submitLoginForm(email, password, '/dashboard')
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
      // Seed demo data (idempotent — only seeds if not present)
      const seedRes = await fetch('/api/demo/seed', { method: 'POST' })
      const seedData = await seedRes.json()

      if (seedData.clinicId) {
        setClinicId(seedData.clinicId)
      }
    } catch (err) {
      // Seed failure is non-blocking — demo mode still works
      console.warn('Demo seed failed (non-blocking):', err)
    }

    // Set demo mode cookie so middleware allows dashboard access
    document.cookie = 'sinap-demo=true; path=/; max-age=86400; SameSite=Lax'
    // Bypass NextAuth entirely for demo mode — avoids redirect loops
    navigateToDemo()
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* ============================================================ */}
      {/* LEFT PANEL — Dark brand panel                                */}
      {/* ============================================================ */}
      <div className="hidden lg:flex lg:w-[55%] flex-col items-center justify-center p-16 relative overflow-hidden">
        <NetworkBackground />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <SinapLogo size={80} showText variant="dark" />
          </motion.div>

          <div className="h-6" />

          <motion.p
            className="text-[15px] text-white/80 leading-relaxed max-w-sm mb-12"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            La plataforma multi-agente para clínicas y consultorios que quieren operar con más inteligencia.
          </motion.p>

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
          <SinapLogo size={36} variant="light" showText showTagline />
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
              {isRegister ? '7 días gratis — sin tarjeta de crédito' : 'Accede a tu plataforma Sinap'}
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
                  onClick={openForgotDialog}
                  className="text-[13px] text-[#534AB7] hover:text-[#534AB7]/80 transition-colors inline-flex items-center gap-1 font-medium"
                >
                  <KeyRound className="h-3 w-3" />
                  Olvidé mi contraseña
                </button>
              </motion.div>
            )}

            {/* Google OAuth button — primary action */}
            <motion.div variants={staggerItem} className="pt-1">
              <Button
                className="w-full h-12 bg-white border border-[#E8E6DF] hover:bg-[#F8F7F4] text-[#2C2C2A] text-[15px] font-medium rounded-lg transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-3">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continuar con Google
                  </span>
                )}
              </Button>
            </motion.div>

            {/* Divider */}
            <motion.div variants={staggerItem} className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E8E6DF]" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-[12px] text-[#888780]/60">o con tu correo</span>
              </div>
            </motion.div>

            {/* Email login button */}
            <motion.div variants={staggerItem}>
              <Button
                className="w-full h-12 bg-[#534AB7] hover:bg-[#4A42A5] text-white text-[15px] font-medium rounded-lg transition-all duration-200 active:scale-[0.98] shadow-lg shadow-[#534AB7]/20 hover:shadow-[#534AB7]/30"
                onClick={isRegister ? handleRegister : handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    {isRegister ? 'Comenzar prueba gratis' : 'Iniciar sesión'}
                    <ArrowRight className="h-[18px] w-[18px]" />
                  </span>
                )}
              </Button>
            </motion.div>

            {/* Toggle register/login + Demo */}
            <motion.div variants={staggerItem} className="space-y-2.5 pt-1">
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
                    Probar 7 días gratis
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

        {/* Reset password success toast */}
        <AnimatePresence>
          {showResetToast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-6 left-0 right-0 flex justify-center z-50"
            >
              <div className="flex items-center gap-2 px-5 py-3 rounded-lg bg-[#1D9E75]/10 border border-[#1D9E75]/20 text-[#1D9E75] text-sm font-medium shadow-lg">
                <CheckCircle2 className="h-4 w-4" />
                Contraseña actualizada exitosamente. Ya puedes iniciar sesión.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forgot Password Dialog */}
        <Dialog open={showForgotDialog} onOpenChange={setShowForgotDialog}>
          <DialogContent className="sm:max-w-[420px] rounded-xl p-0 overflow-hidden">
            <div className="p-6">
              {!forgotSuccess ? (
                <>
                  <DialogHeader className="mb-4">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#534AB7]/10">
                      <KeyRound className="h-5 w-5 text-[#534AB7]" />
                    </div>
                    <DialogTitle className="text-center text-lg font-medium tracking-[-0.02em] text-[#2C2C2A]">
                      Restablecer contraseña
                    </DialogTitle>
                    <DialogDescription className="text-center text-sm text-[#888780]">
                      Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
                    </DialogDescription>
                  </DialogHeader>

                  {forgotError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-0.5 shrink-0" />
                      {forgotError}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-normal text-[#2C2C2A]/70">Correo electrónico</Label>
                      <div className="relative group">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#1D9E75]/60 group-focus-within:text-[#1D9E75] transition-colors" />
                        <Input
                          type="email"
                          placeholder="tu@correo.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleForgotPassword()
                          }}
                          className="pl-11 h-11 text-sm bg-white border-[1.5px] border-[#E8E6DF] rounded-lg focus:border-[#534AB7] focus:ring-[#534AB7]/10 hover:border-[#888780]/40 focus:ring-2 focus:ring-offset-0"
                          autoFocus
                        />
                      </div>
                    </div>

                    <Button
                      className="w-full h-11 bg-[#534AB7] hover:bg-[#4A42A5] text-white text-[14px] font-medium rounded-lg transition-all duration-200 active:scale-[0.98] shadow-lg shadow-[#534AB7]/20"
                      onClick={handleForgotPassword}
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-2">
                          Enviar enlace de restablecimiento
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <DialogHeader className="mb-4">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1D9E75]/10">
                      <CheckCircle2 className="h-5 w-5 text-[#1D9E75]" />
                    </div>
                    <DialogTitle className="text-center text-lg font-medium tracking-[-0.02em] text-[#2C2C2A]">
                      Correo enviado
                    </DialogTitle>
                    <DialogDescription className="text-center text-sm text-[#888780]">
                      Si existe una cuenta con ese correo, recibirás un email con instrucciones para restablecer tu contraseña.
                    </DialogDescription>
                  </DialogHeader>

                  <Button
                    variant="outline"
                    className="w-full h-11 border-[#E8E6DF] text-[#888780] hover:bg-[#F1EFE8] hover:text-[#2C2C2A] text-sm font-normal rounded-lg"
                    onClick={() => setShowForgotDialog(false)}
                  >
                    Entendido
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
