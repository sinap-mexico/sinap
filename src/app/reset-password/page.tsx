'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2,
  XCircle, ShieldCheck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SinapLogo } from '@/components/sinap/sinap-logo'

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [isValidating, setIsValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [maskedEmail, setMaskedEmail] = useState('')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const passwordValid = password ? password.length >= 8 : true
  const passwordsMatch = confirmPassword ? password === confirmPassword : true

  // Verify token on load
  useEffect(() => {
    if (!token) {
      setIsValidating(false)
      setTokenValid(false)
      return
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`)
        const data = await res.json()

        if (data.valid) {
          setTokenValid(true)
          setMaskedEmail(data.email || '')
        } else {
          setTokenValid(false)
        }
      } catch {
        setTokenValid(false)
      } finally {
        setIsValidating(false)
      }
    }

    verifyToken()
  }, [token])

  const handleResetPassword = useCallback(async () => {
    if (!password || !confirmPassword) {
      setError('Completa todos los campos')
      return
    }
    if (!passwordValid) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (!passwordsMatch) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (!token) {
      setError('Token inválido')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al restablecer la contraseña')
        return
      }

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?reset=success')
      }, 3000)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }, [password, confirmPassword, passwordValid, passwordsMatch, token, router])

  // Validating state
  if (isValidating) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-[#534AB7]" />
          <p className="text-sm text-[#888780]">Verificando enlace...</p>
        </motion.div>
      </div>
    )
  }

  // Invalid/expired token state
  if (!tokenValid) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        {/* Left panel (desktop) */}
        <div className="hidden lg:flex lg:w-[55%] flex-col items-center justify-center p-16 relative overflow-hidden bg-[#0A1929]">
          <div className="relative z-10 flex flex-col items-center text-center max-w-md">
            <SinapLogo size={80} showText variant="dark" />
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 sm:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[380px] text-center"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-[1.65rem] font-medium tracking-[-0.03em] text-[#2C2C2A] mb-2">
              Enlace inválido
            </h2>
            <p className="text-sm text-[#888780] mb-8 leading-relaxed">
              Este enlace de restablecimiento es inválido o ha expirado. Por favor, solicita uno nuevo.
            </p>
            <Button
              className="w-full h-12 bg-[#534AB7] hover:bg-[#4A42A5] text-white text-[15px] font-medium rounded-lg shadow-lg shadow-[#534AB7]/20"
              onClick={() => router.push('/login')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al inicio de sesión
            </Button>
          </motion.div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        {/* Left panel (desktop) */}
        <div className="hidden lg:flex lg:w-[55%] flex-col items-center justify-center p-16 relative overflow-hidden bg-[#0A1929]">
          <div className="relative z-10 flex flex-col items-center text-center max-w-md">
            <SinapLogo size={80} showText variant="dark" />
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 sm:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[380px] text-center"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#1D9E75]/10">
              <CheckCircle2 className="h-8 w-8 text-[#1D9E75]" />
            </div>
            <h2 className="text-[1.65rem] font-medium tracking-[-0.03em] text-[#2C2C2A] mb-2">
              ¡Contraseña actualizada!
            </h2>
            <p className="text-sm text-[#888780] mb-8 leading-relaxed">
              Tu contraseña ha sido cambiada exitosamente. Serás redirigido al inicio de sesión...
            </p>
            <Button
              className="w-full h-12 bg-[#534AB7] hover:bg-[#4A42A5] text-white text-[15px] font-medium rounded-lg shadow-lg shadow-[#534AB7]/20"
              onClick={() => router.push('/login?reset=success')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ir al inicio de sesión
            </Button>
          </motion.div>
        </div>
      </div>
    )
  }

  // Reset password form
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left panel (desktop) — same dark style as login */}
      <div className="hidden lg:flex lg:w-[55%] flex-col items-center justify-center p-16 relative overflow-hidden bg-[#0A1929]">
        <div className="absolute inset-0">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" fill="none">
            <defs>
              <radialGradient id="bgGradient" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#0F2942" />
                <stop offset="100%" stopColor="#0A1929" />
              </radialGradient>
              <radialGradient id="textGlow" cx="50%" cy="45%" r="35%">
                <stop offset="0%" stopColor="#1D9E75" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#1D9E75" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="100" height="100" fill="url(#bgGradient)" />
            <rect width="100" height="100" fill="url(#textGlow)" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <SinapLogo size={80} showText variant="dark" />
          </motion.div>

          <motion.p
            className="text-[15px] text-white/80 leading-relaxed max-w-sm mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Crea una nueva contraseña segura para proteger tu cuenta.
          </motion.p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 sm:px-8 py-8 relative overflow-y-auto">
        {/* Mobile logo */}
        <motion.div
          className="lg:hidden flex flex-col items-center mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <SinapLogo size={36} variant="light" showText />
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
              Nueva contraseña
            </h2>
            <p className="text-sm text-[#888780] mt-1.5">
              Crea una contraseña nueva para <span className="text-[#534AB7] font-medium">{maskedEmail}</span>
            </p>
          </motion.div>

          {/* Error message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
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
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
            }}
          >
            {/* New password */}
            <motion.div variants={staggerItem}>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-normal text-[#2C2C2A]/70">Nueva contraseña</Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#1D9E75]/60 group-focus-within:text-[#1D9E75] transition-colors" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleResetPassword()
                    }}
                    className={`pl-11 h-12 text-sm bg-white border-[1.5px] rounded-lg transition-all duration-200 placeholder:text-[#888780]/50 ${
                      password && !passwordValid
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                        : 'border-[#E8E6DF] focus:border-[#534AB7] focus:ring-[#534AB7]/10 hover:border-[#888780]/40'
                    } focus:ring-2 focus:ring-offset-0`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#888780]/60 hover:text-[#1D9E75] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
                {password && !passwordValid && (
                  <p className="text-[11px] text-red-500 pl-1">Mínimo 8 caracteres</p>
                )}
              </div>
            </motion.div>

            {/* Confirm password */}
            <motion.div variants={staggerItem}>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-normal text-[#2C2C2A]/70">Confirmar contraseña</Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#1D9E75]/60 group-focus-within:text-[#1D9E75] transition-colors" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirma tu nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleResetPassword()
                    }}
                    className={`pl-11 h-12 text-sm bg-white border-[1.5px] rounded-lg transition-all duration-200 placeholder:text-[#888780]/50 ${
                      confirmPassword && !passwordsMatch
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                        : 'border-[#E8E6DF] focus:border-[#534AB7] focus:ring-[#534AB7]/10 hover:border-[#888780]/40'
                    } focus:ring-2 focus:ring-offset-0`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#888780]/60 hover:text-[#1D9E75] transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-[11px] text-red-500 pl-1">Las contraseñas no coinciden</p>
                )}
              </div>
            </motion.div>

            {/* Submit button */}
            <motion.div variants={staggerItem} className="pt-2">
              <Button
                className="w-full h-12 bg-[#534AB7] hover:bg-[#4A42A5] text-white text-[15px] font-medium rounded-lg transition-all duration-200 active:scale-[0.98] shadow-lg shadow-[#534AB7]/20 hover:shadow-[#534AB7]/30"
                onClick={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Restablecer contraseña
                    <CheckCircle2 className="h-[18px] w-[18px]" />
                  </span>
                )}
              </Button>
            </motion.div>

            {/* Back to login */}
            <motion.div variants={staggerItem} className="pt-1">
              <Button
                variant="outline"
                className="w-full h-11 border-[#E8E6DF] text-[#888780] hover:bg-[#F1EFE8] hover:text-[#2C2C2A] text-sm font-normal rounded-lg transition-all duration-200 active:scale-[0.98]"
                onClick={() => router.push('/login')}
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al inicio de sesión
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#534AB7] border-t-transparent" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
