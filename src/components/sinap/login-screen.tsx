'use client'

import { useState } from 'react'
import { useSinapStore } from '@/lib/sinap-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react'

export function LoginScreen() {
  const { setIsLoggedIn, setOnboardingComplete } = useSinapStore()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = () => {
    if (!email || !password) {
      setError('Completa todos los campos')
      return
    }
    setError('')
    setIsLoggedIn(true)
  }

  const handleRegister = () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Completa todos los campos')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    setError('')
    setIsLoggedIn(true)
  }

  const handleDemoLogin = () => {
    setIsLoggedIn(true)
    setOnboardingComplete(true)
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

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Neural network logo */}
          <svg width="80" height="80" viewBox="0 0 36 36" fill="none" className="mb-8">
            <circle cx="18" cy="18" r="5" fill="#534AB7" />
            <circle cx="18" cy="5" r="3.5" fill="#1D9E75" />
            <circle cx="30" cy="14" r="3.5" fill="#1D9E75" />
            <circle cx="30" cy="26" r="3.5" fill="#1D9E75" />
            <circle cx="18" cy="31" r="3.5" fill="#1D9E75" />
            <circle cx="6" cy="26" r="3.5" fill="#1D9E75" />
            <circle cx="6" cy="14" r="3.5" fill="#1D9E75" />
            <line x1="18" y1="13" x2="18" y2="8.5" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
            <line x1="22.5" y1="15.5" x2="26.5" y2="14" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
            <line x1="22.5" y1="20.5" x2="26.5" y2="26" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
            <line x1="18" y1="23" x2="18" y2="27.5" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
            <line x1="13.5" y1="20.5" x2="9.5" y2="26" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
            <line x1="13.5" y1="15.5" x2="9.5" y2="14" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
            <circle cx="18" cy="1" r="1.5" fill="#5DCAA5" opacity="0.6" />
            <circle cx="34" cy="11" r="1.5" fill="#5DCAA5" opacity="0.6" />
            <circle cx="34" cy="29" r="1.5" fill="#5DCAA5" opacity="0.6" />
            <circle cx="2" cy="29" r="1.5" fill="#5DCAA5" opacity="0.6" />
            <circle cx="2" cy="11" r="1.5" fill="#5DCAA5" opacity="0.6" />
            <line x1="18" y1="1.5" x2="18" y2="3.5" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.4" />
            <line x1="33" y1="12.5" x2="30.5" y2="13.5" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.4" />
            <line x1="33" y1="27.5" x2="30.5" y2="26.5" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.4" />
            <line x1="3" y1="27.5" x2="5.5" y2="26.5" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.4" />
            <line x1="3" y1="12.5" x2="5.5" y2="13.5" stroke="#5DCAA5" strokeWidth="0.8" opacity="0.4" />
          </svg>

          <h1 className="text-4xl font-medium tracking-[-0.03em] text-white mb-4">Sinap</h1>
          <p className="text-lg text-[#5DCAA5] mb-2">La sinapsis de tu negocio de salud</p>
          <p className="text-sm text-white/50 max-w-sm">
            Plataforma multi-agente con inteligencia artificial para clinicas y consultorios en Mexico.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center bg-[#F1EFE8] p-6 sm:p-8">
        <Card className="w-full max-w-md border-0 shadow-lg bg-white">
          <CardContent className="p-8">
            {/* Mobile logo */}
            <div className="lg:hidden flex flex-col items-center mb-8">
              <svg width="48" height="48" viewBox="0 0 36 36" fill="none" className="mb-3">
                <circle cx="18" cy="18" r="5" fill="#534AB7" />
                <circle cx="18" cy="5" r="3.5" fill="#1D9E75" />
                <circle cx="30" cy="14" r="3.5" fill="#1D9E75" />
                <circle cx="30" cy="26" r="3.5" fill="#1D9E75" />
                <circle cx="18" cy="31" r="3.5" fill="#1D9E75" />
                <circle cx="6" cy="26" r="3.5" fill="#1D9E75" />
                <circle cx="6" cy="14" r="3.5" fill="#1D9E75" />
                <line x1="18" y1="13" x2="18" y2="8.5" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
                <line x1="22.5" y1="15.5" x2="26.5" y2="14" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
                <line x1="22.5" y1="20.5" x2="26.5" y2="26" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
                <line x1="18" y1="23" x2="18" y2="27.5" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
                <line x1="13.5" y1="20.5" x2="9.5" y2="26" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
                <line x1="13.5" y1="15.5" x2="9.5" y2="14" stroke="#5DCAA5" strokeWidth="1.2" opacity="0.7" />
              </svg>
              <span className="text-2xl font-medium tracking-[-0.03em] text-[#0F2D26]">Sinap</span>
            </div>

            <h2 className="text-xl font-medium tracking-[-0.03em] text-[#2C2C2A] mb-1">
              {isRegister ? 'Crear cuenta' : 'Iniciar sesion'}
            </h2>
            <p className="text-sm text-[#888780] mb-6">
              {isRegister ? 'Registra tu consultorio en Sinap' : 'Accede a tu plataforma Sinap'}
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {isRegister && (
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Nombre completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888780]" />
                    <Input
                      placeholder="Dr. Nombre Apellido"
                      className="pl-10 h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Correo electronico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888780]" />
                  <Input
                    type="email"
                    placeholder="tu@correo.com"
                    className="pl-10 h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-[#888780]">Contrasena</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888780]" />
                  <Input
                    type="password"
                    placeholder="********"
                    className="pl-10 h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isRegister) handleLogin()
                    }}
                  />
                </div>
              </div>

              {isRegister && (
                <div className="space-y-2">
                  <Label className="text-xs text-[#888780]">Confirmar contrasena</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888780]" />
                    <Input
                      type="password"
                      placeholder="********"
                      className="pl-10 h-10 text-sm bg-[#F1EFE8] border-[#E1F5EE]"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRegister()
                      }}
                    />
                  </div>
                </div>
              )}

              <Button
                className="w-full h-10 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white text-sm font-medium"
                onClick={isRegister ? handleRegister : handleLogin}
              >
                {isRegister ? 'Crear cuenta' : 'Iniciar sesion'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E1F5EE]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-[#888780]">o</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-10 border-[#1D9E75] text-[#1D9E75] hover:bg-[#1D9E75]/10 text-sm font-medium"
                onClick={() => setIsRegister(!isRegister)}
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

              <Button
                variant="ghost"
                className="w-full h-9 text-[#888780] hover:text-[#534AB7] text-xs"
                onClick={handleDemoLogin}
              >
                Entrar en modo demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
