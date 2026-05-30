'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSinapStore } from '@/lib/sinap-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Lock, User, ArrowRight, ArrowLeft, Loader2, Eye, EyeOff, Building2, KeyRound } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SinapLogo } from '@/components/sinap/sinap-logo'

const formVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

const shakeAnimation = {
  x: [0, -8, 8, -6, 6, -3, 3, 0],
  transition: { duration: 0.4 },
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

  // Real-time validation
  const emailValid = email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : true
  const passwordValid = password ? password.length >= 8 : true
  const passwordsMatch = confirmPassword ? password === confirmPassword : true

  const triggerShake = () => {
    setShakeError(true)
    setTimeout(() => setShakeError(false), 500)
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Completa todos los campos')
      triggerShake()
      return
    }
    if (!emailValid) {
      setError('Ingresa un correo electronico valido')
      triggerShake()
      return
    }
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Correo o contrasena incorrectos')
        triggerShake()
      }
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
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
      setError('Ingresa un correo electronico valido')
      triggerShake()
      return
    }
    if (!passwordValid) {
      setError('La contrasena debe tener al menos 8 caracteres')
      triggerShake()
      return
    }
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden')
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
          name,
          email,
          password,
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

      await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
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
    <div className="flex h-screen w-full">
      {/* Left side - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F2D26] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" viewBox="0 0 800 800" fill="none">
            <circle cx="400" cy="400" r="200" stroke="#5DCAA5" strokeWidth="0.5" opacity="0.3" />
            <circle cx="400" cy="400" r="300" stroke="#5DCAA5" strokeWidth="0.5" opacity="0.2" />
            <circle cx="400" cy="400" r="400" stroke="#5DCAA5" strokeWidth="0.5" opacity="0.1" />
            <circle cx="200" cy="200" r="4" fill="#1D9E75" opacity="0.3" />
            <circle cx="600" cy="200" r="4" fill="#1D9E75" opacity="0.3" />
            <circle cx="200" cy="600" r="4" fill="#1D9E75" opacity="0.3" />
            <circle cx="600" cy="600" r="4" fill="#1D9E75" opacity="0.3" />
            <line x1="200" y1="200" x2="400" y2="400" stroke="#5DCAA5" strokeWidth="0.5" opacity="0.15" />
            <line x1="600" y1="200" x2="400" y2="400" stroke="#5DCAA5" strokeWidth="0.5" opacity="0.15" />
            <line x1="200" y1="600" x2="400" y2="400" stroke="#5DCAA5" strokeWidth="0.5" opacity="0.15" />
            <line x1="600" y1="600" x2="400" y2="400" stroke="#5DCAA5" strokeWidth="0.5" opacity="0.15" />
          </svg>
        </div>

        <motion.div
          className="relative z-10 flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Logo with floating animation */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <SinapLogo size={80} animate={false} variant="dark" />
          </motion.div>

          <motion.h1
            className="text-4xl font-medium tracking-[-0.03em] text-white mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Sinap
          </motion.h1>
          <motion.p
            className="text-lg text-[#5DCAA5] mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Inteligencia que conecta
          </motion.p>
          <motion.p
            className="text-sm text-white/50 max-w-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Plataforma multi-agente con inteligencia artificial para clinicas y consultorios en Mexico.
          </motion.p>
        </motion.div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center bg-[#F1EFE8] p-6 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-8">
              {/* Mobile logo */}
              <motion.div
                className="lg:hidden flex flex-col items-center mb-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <SinapLogo size={48} variant="light" showText />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h2 className="text-xl font-medium tracking-[-0.03em] text-[#2C2C2A] mb-1">
                  {isRegister ? 'Crear cuenta' : 'Iniciar sesion'}
                </h2>
                <p className="text-sm text-[#888780] mb-6">
                  {isRegister ? 'Registra tu consultorio en Sinap' : 'Accede a tu plataforma Sinap'}
                </p>
              </motion.div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, x: 0 }}
                    animate={{ opacity: 1, height: 'auto', ...(shakeError ? shakeAnimation : {}) }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
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
                      <div className="space-y-2">
                        <Label className="text-xs text-[#888780]">Nombre completo</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888780]" />
                          <Input
                            placeholder="Dr. Nombre Apellido"
                            className="pl-10 h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20 transition-colors"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-[#888780]">Nombre de la clinica</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888780]" />
                          <Input
                            placeholder="Clinica San Angel"
                            className="pl-10 h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE] focus:border-[#534AB7] focus:ring-[#534AB7]/20 transition-colors"
                            value={clinicName}
                            onChange={(e) => setClinicName(e.target.value)}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <Label className="text-xs text-[#888780]">Correo electronico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888780]" />
                    <Input
                      type="email"
                      placeholder="tu@correo.com"
                      className={`pl-10 h-10 text-sm bg-[#F1EFE8] focus:ring-[#534AB7]/20 transition-colors ${
                        !emailValid ? 'border-red-300 focus:border-red-400' : 'border-[#E1F5EE] focus:border-[#534AB7]'
                      }`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {email && !emailValid && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-red-500">Invalido</span>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-2"
                >
                  <Label className="text-xs text-[#888780]">Contrasena</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888780]" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="********"
                      className={`pl-10 pr-10 h-10 text-sm bg-[#F1EFE8] focus:ring-[#534AB7]/20 transition-colors ${
                        !passwordValid ? 'border-red-300 focus:border-red-400' : 'border-[#E1F5EE] focus:border-[#534AB7]'
                      }`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isRegister) handleLogin()
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888780] hover:text-[#2C2C2A] transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && !passwordValid && (
                    <p className="text-[10px] text-red-500 mt-1">Minimo 8 caracteres</p>
                  )}
                </motion.div>

                <AnimatePresence mode="wait">
                  {isRegister && (
                    <motion.div
                      key="confirm-password"
                      variants={formVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.25 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Label className="text-xs text-[#888780]">Confirmar contrasena</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888780]" />
                        <Input
                          type="password"
                          placeholder="********"
                          className={`pl-10 h-10 text-sm bg-[#F1EFE8] focus:ring-[#534AB7]/20 transition-colors ${
                            !passwordsMatch ? 'border-red-300 focus:border-red-400' : 'border-[#E1F5EE] focus:border-[#534AB7]'
                          }`}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRegister()
                          }}
                        />
                        {confirmPassword && !passwordsMatch && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-red-500">No coincide</span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    className="w-full h-10 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white text-sm font-medium transition-all active:scale-[0.98]"
                    onClick={isRegister ? handleRegister : handleLogin}
                    disabled={isLoading}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {isRegister ? 'Crear cuenta' : 'Iniciar sesion'}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </motion.div>

                {/* Forgot password link */}
                {!isRegister && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="text-center"
                  >
                    <button className="text-xs text-[#888780] hover:text-[#534AB7] transition-colors inline-flex items-center gap-1">
                      <KeyRound className="h-3 w-3" />
                      Olvide mi contrasena
                    </button>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="relative my-6"
                >
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E1F5EE]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white text-[#888780]">o</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    variant="outline"
                    className="w-full h-10 border-[#1D9E75] text-[#1D9E75] hover:bg-[#1D9E75]/10 text-sm font-medium transition-all active:scale-[0.98]"
                    onClick={() => {
                      setIsRegister(!isRegister)
                      setError('')
                    }}
                    disabled={isLoading}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isRegister ? (
                      <>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Ya tengo cuenta
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4 mr-2" />
                        Crear cuenta nueva
                      </>
                    )}
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                >
                  <Button
                    variant="ghost"
                    className="w-full h-9 text-[#888780] hover:text-[#534AB7] text-xs transition-colors"
                    onClick={handleDemoLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Entrar en modo demo'}
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
