'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, ArrowLeft, KeyRound, Loader2, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { SinapLogo } from '@/components/sinap/sinap-logo'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState('')

  const emailValid = email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : true

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !emailValid) {
      setError('Ingresa un correo electrónico válido')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al procesar la solicitud')
        return
      }

      // Always show success (prevents email enumeration)
      setIsSent(true)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left brand panel (desktop only) */}
      <div className="hidden lg:flex lg:w-[55%] flex-col items-center justify-center p-16 relative overflow-hidden bg-gradient-to-br from-[#0F2942] to-[#0A1929]">
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
            className="text-[15px] text-white/80 leading-relaxed max-w-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Recupera el acceso a tu plataforma en segundos. Tu información sigue segura.
          </motion.p>
        </div>
      </div>

      {/* Right form panel */}
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-[380px]"
        >
          {isSent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="mx-auto w-14 h-14 rounded-full bg-[#E1F5EE] flex items-center justify-center mb-5">
                <CheckCircle2 className="w-7 h-7 text-[#1D9E75]" />
              </div>
              <h2 className="text-[1.65rem] font-medium tracking-[-0.03em] text-[#2C2C2A] leading-tight mb-3">
                Correo enviado
              </h2>
              <p className="text-sm text-[#888780] leading-relaxed mb-6">
                Si existe una cuenta con <strong className="text-[#2C2C2A]">{email}</strong>,
                recibirás un enlace para restablecer tu contraseña. Revisa también tu carpeta de spam.
              </p>
              <p className="text-xs text-[#888780]/70 mb-6">
                El enlace expira en 1 hora por seguridad.
              </p>
              <Link href="/login">
                <Button
                  variant="outline"
                  className="w-full h-11 border-[#534AB7] text-[#534AB7] hover:bg-[#534AB7]/8 text-sm font-medium rounded-lg"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a iniciar sesión
                </Button>
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="mb-7">
                <h2 className="text-[1.65rem] font-medium tracking-[-0.03em] text-[#2C2C2A] leading-tight">
                  Restablecer contraseña
                </h2>
                <p className="text-sm text-[#888780] mt-1.5">
                  Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200/80 text-red-700 text-sm flex items-start gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-normal text-[#2C2C2A]/70">Correo electrónico</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#1D9E75]/60 group-focus-within:text-[#1D9E75] transition-colors" />
                    <Input
                      type="email"
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                      className={`pl-11 h-12 text-sm bg-white border-[1.5px] rounded-lg transition-all duration-200 placeholder:text-[#888780]/50 ${
                        email && !emailValid
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                          : 'border-[#E8E6DF] focus:border-[#534AB7] focus:ring-[#534AB7]/10 hover:border-[#888780]/40'
                      } focus:ring-2 focus:ring-offset-0`}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-[#534AB7] hover:bg-[#4A42A5] text-white text-[15px] font-medium rounded-lg transition-all duration-200 active:scale-[0.98] shadow-lg shadow-[#534AB7]/20 hover:shadow-[#534AB7]/30"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      <KeyRound className="h-[18px] w-[18px]" />
                      Enviar enlace de restablecimiento
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  href="/login"
                  className="text-[13px] text-[#534AB7] hover:text-[#534AB7]/80 transition-colors inline-flex items-center gap-1 font-medium"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Volver a iniciar sesión
                </Link>
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          className="absolute bottom-6 left-0 right-0 flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <div className="flex items-center gap-1.5 text-[11px] text-[#888780]/50">
            <KeyRound className="h-3 w-3 text-[#1D9E75]/40" />
            Tus datos están protegidos con los más altos estándares de seguridad
          </div>
        </motion.div>
      </div>
    </div>
  )
}
