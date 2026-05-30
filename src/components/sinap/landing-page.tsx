'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { SinapLogo } from '@/components/sinap/sinap-logo'
import { Button } from '@/components/ui/button'
import {
  MessageSquare, Activity, Receipt, TrendingUp, BarChart3, Building2,
  LayoutDashboard, Brain, Shield, Zap, ArrowRight, Check, ChevronDown,
  Star, Users, Clock, FileText, Calendar, Phone, Mail, MapPin,
  Sparkles, Bot, Stethoscope, HeartPulse, BadgeCheck, Globe,
  Menu, X, Play
} from 'lucide-react'
import Link from 'next/link'

/* ------------------------------------------------------------------ */
/*  Reusable animation helpers                                        */
/* ------------------------------------------------------------------ */
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function ScaleIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Navigation                                                        */
/* ------------------------------------------------------------------ */
function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // On dark hero (not scrolled): white text + white logo. On scroll: dark text + dark logo
  const navTextColor = scrolled ? 'text-[#2C2C2A]/70' : 'text-white'
  const navHoverColor = scrolled ? 'hover:text-[#534AB7]' : 'hover:text-white/80'

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-[#E1F5EE]/60' : 'bg-transparent'
      }`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <SinapLogo size={32} showText showTagline variant={scrolled ? 'light' : 'dark'} />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#que-es" className={`text-sm ${navTextColor} ${navHoverColor} transition-colors`}>Qué es Sinap</a>
          <a href="#modulos" className={`text-sm ${navTextColor} ${navHoverColor} transition-colors`}>Módulos</a>
          <a href="#por-que" className={`text-sm ${navTextColor} ${navHoverColor} transition-colors`}>Por qué Sinap</a>
          <a href="#casos" className={`text-sm ${navTextColor} ${navHoverColor} transition-colors`}>Casos de uso</a>
          <a href="#precios" className={`text-sm ${navTextColor} ${navHoverColor} transition-colors`}>Precios</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className={`text-sm ${navTextColor} ${navHoverColor}`}>
              Iniciar sesión
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" className={`text-sm gap-1.5 ${navTextColor} ${navHoverColor}`}>
              <Play className="h-3.5 w-3.5" />
              Ver demo
            </Button>
          </Link>
          <Link href="/login">
            <Button className={`text-sm h-9 px-5 rounded-lg shadow-md shadow-[#534AB7]/20 transition-all ${
              scrolled
                ? 'bg-[#534AB7] hover:bg-[#4A42A5] text-white'
                : 'bg-white/90 hover:bg-white text-[#534AB7]'
            }`}>
              Comenzar gratis
            </Button>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button className={`md:hidden p-2 ${scrolled ? 'text-[#2C2C2A]' : 'text-white'}`} onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-[#E1F5EE] overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-3">
              <a href="#que-es" onClick={() => setMobileOpen(false)} className="text-sm py-2 text-[#2C2C2A]/70">Qué es Sinap</a>
              <a href="#modulos" onClick={() => setMobileOpen(false)} className="text-sm py-2 text-[#2C2C2A]/70">Módulos</a>
              <a href="#por-que" onClick={() => setMobileOpen(false)} className="text-sm py-2 text-[#2C2C2A]/70">Por qué Sinap</a>
              <a href="#casos" onClick={() => setMobileOpen(false)} className="text-sm py-2 text-[#2C2C2A]/70">Casos de uso</a>
              <a href="#precios" onClick={() => setMobileOpen(false)} className="text-sm py-2 text-[#2C2C2A]/70">Precios</a>
              <Link href="/login">
                <Button variant="outline" className="w-full border-[#534AB7]/30 text-[#534AB7] hover:bg-[#534AB7]/8 text-sm h-10 rounded-lg mt-2">
                  <Play className="h-4 w-4 mr-1.5" />
                  Ver demo
                </Button>
              </Link>
              <Link href="/login">
                <Button className="w-full bg-[#534AB7] text-white text-sm h-10 rounded-lg">Comenzar gratis</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero Section                                                      */
/* ------------------------------------------------------------------ */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-[#0A1929] overflow-hidden pt-16">
      {/* Background network */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" fill="none">
        <defs>
          <radialGradient id="heroGrad" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#0F2942" />
            <stop offset="100%" stopColor="#0A1929" />
          </radialGradient>
          <radialGradient id="heroGlow" cx="50%" cy="45%" r="30%">
            <stop offset="0%" stopColor="#1D9E75" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#1D9E75" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#heroGrad)" />
        <rect width="100" height="100" fill="url(#heroGlow)" />
        {/* Subtle grid dots */}
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 8 }).map((_, col) => (
            <circle
              key={`dot-${row}-${col}`}
              cx={15 + col * 10}
              cy={15 + row * 10}
              r="0.3"
              fill="#4FD1C5"
              opacity="0.08"
            />
          ))
        )}
      </svg>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/8 border border-white/10 mb-8"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#1D9E75]" />
          <span className="text-xs text-white/70 font-medium">Plataforma #1 en IA para salud en México</span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white tracking-[-0.04em] leading-[1.1] mb-6"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          Inteligencia artificial que{' '}
          <span className="text-[#1D9E75]">conecta</span>{' '}
          cada punto de tu consultorio
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
        >
          La primera plataforma multi-agente diseñada para clínicas y profesionales de salud en México.
          Recepción, notas clínicas, facturación CFDI 4.0 y crecimiento — todo orquestado por IA.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <Link href="/login">
            <Button className="h-13 px-8 bg-[#534AB7] hover:bg-[#4A42A5] text-white text-base font-medium rounded-xl shadow-xl shadow-[#534AB7]/25 hover:shadow-[#534AB7]/35 transition-all">
              Comenzar gratis
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
          <Link href="/login">
            <Button className="h-13 px-8 bg-white/90 hover:bg-white text-[#534AB7] border border-white/50 text-base font-medium rounded-xl shadow-lg shadow-white/10 transition-all">
              <Play className="h-4 w-4 mr-2" />
              Ver demo
            </Button>
          </Link>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-white/40 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#4FD1C5]/50" />
            Datos protegidos NOM-004
          </div>
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#4FD1C5]/50" />
            CFDI 4.0 automático
          </div>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#4FD1C5]/50" />
            100% México
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ChevronDown className="h-6 w-6 text-white/20" />
      </motion.div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Problema Section                                                  */
/* ------------------------------------------------------------------ */
function ProblemaSection() {
  const painPoints = [
    {
      icon: MessageSquare,
      title: 'Mensajes sin contestar',
      desc: 'Cada mensaje de WhatsApp sin responder es un paciente que se va a otro lado. Tus horarios se llenan de idas y venidas.',
    },
    {
      icon: FileText,
      title: 'Notas clínicas manuales',
      desc: 'Horas escribiendo notas SOAP después de cada consulta. Tiempo que deberías estar con tus pacientes o descansando.',
    },
    {
      icon: Receipt,
      title: 'Facturación lenta y con errores',
      desc: 'Generar CFDI 4.0 manualmente es lento y propenso a errores. Al final del mes, cuadrar es una pesadilla.',
    },
    {
      icon: TrendingUp,
      title: 'Cero visibilidad del negocio',
      desc: 'No sabes cuántos pacientes regresan, cuánto cobras en promedio, ni cuáles son tus horarios más productivos.',
    },
  ]

  return (
    <section className="py-24 bg-[#F1EFE8]">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <p className="text-sm font-medium text-[#534AB7] mb-3 tracking-wide uppercase">El problema</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#2C2C2A] mb-4">
            Tu consultorio merece más que hojas de cálculo y WhatsApps sin contestar
          </h2>
          <p className="text-[#888780] max-w-2xl mx-auto text-lg">
            La mayoría de las clínicas en México operan con herramientas desconectadas, procesos manuales y cero inteligencia. Esto te cuesta pacientes, tiempo y dinero.
          </p>
        </FadeIn>

        <div className="grid sm:grid-cols-2 gap-6">
          {painPoints.map((point, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="bg-white rounded-2xl p-7 border border-[#E1F5EE] hover:border-[#534AB7]/20 transition-all duration-300 hover:shadow-lg hover:shadow-[#534AB7]/5 group">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-red-50 group-hover:bg-[#534AB7]/8 transition-colors shrink-0">
                    <point.icon className="w-5 h-5 text-red-400 group-hover:text-[#534AB7] transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-[#2C2C2A] mb-1.5">{point.title}</h3>
                    <p className="text-sm text-[#888780] leading-relaxed">{point.desc}</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Qué es Sinap Section                                              */
/* ------------------------------------------------------------------ */
function QueEsSection() {
  return (
    <section id="que-es" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <FadeIn>
            <p className="text-sm font-medium text-[#1D9E75] mb-3 tracking-wide uppercase">Qué es Sinap</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#2C2C2A] mb-6 leading-tight">
              Siete agentes de IA. Una plataforma. Tu consultorio en piloto automático.
            </h2>
            <p className="text-[#888780] text-lg leading-relaxed mb-6">
              Sinap no es otro software de gestión. Es un ecosistema donde cada módulo funciona como un agente especializado —recepcionista, clínico, contador, mercadólogo, analista— coordinado por un orquestador central que aprende cómo trabajas y va tomando más responsabilidad conforme confías en él.
            </p>
            <p className="text-[#888780] leading-relaxed mb-8">
              Diseñado desde cero para la realidad de México: CFDI 4.0 con Facturama, WhatsApp Business como canal principal, cumplimiento NOM-004, y precios en pesos. Funciona igual para un dermatólogo solo que para una clínica con 10 especialistas.
            </p>

            <div className="flex flex-col gap-3">
              {[
                'Orquestador multi-agente que coordina todos los módulos',
                'Modelo de confianza progresiva: tú decides cuánto hace la IA',
                'Meta ecosistema: WhatsApp, Instagram DM, Facebook Messenger',
                'Hecho en México, para México',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#1D9E75]/10 mt-0.5 shrink-0">
                    <Check className="w-3 h-3 text-[#1D9E75]" />
                  </div>
                  <span className="text-sm text-[#2C2C2A]/80">{item}</span>
                </div>
              ))}
            </div>
          </FadeIn>

          <ScaleIn delay={0.2}>
            <div className="relative">
              {/* Visual: agent constellation */}
              <div className="bg-[#0A1929] rounded-2xl p-8 aspect-square flex items-center justify-center relative overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" fill="none">
                  <defs>
                    <radialGradient id="vizGlow" cx="50%" cy="50%" r="40%">
                      <stop offset="0%" stopColor="#1D9E75" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#1D9E75" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <rect width="400" height="400" fill="url(#vizGlow)" />

                  {/* Connection lines from center to modules */}
                  {[
                    [200, 200, 200, 60],   // top
                    [200, 200, 320, 120],  // top-right
                    [200, 200, 340, 240],  // right
                    [200, 200, 300, 340],  // bottom-right
                    [200, 200, 100, 340],  // bottom-left
                    [200, 200, 60, 240],   // left
                    [200, 200, 80, 120],   // top-left
                  ].map(([x1, y1, x2, y2], i) => (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4FD1C5" strokeWidth="0.8" opacity="0.2" />
                  ))}

                  {/* Center node (orchestrator) */}
                  <circle cx="200" cy="200" r="28" fill="#534AB7" opacity="0.15" />
                  <circle cx="200" cy="200" r="16" fill="#534AB7" opacity="0.9" />
                  <text x="200" y="205" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">OS</text>

                  {/* Module nodes */}
                  {[
                    { x: 200, y: 60, label: 'Desk', color: '#1D9E75' },
                    { x: 320, y: 120, label: 'Flow', color: '#1D9E75' },
                    { x: 340, y: 240, label: 'Bill', color: '#1D9E75' },
                    { x: 300, y: 340, label: 'Grow', color: '#1D9E75' },
                    { x: 100, y: 340, label: 'Sight', color: '#1D9E75' },
                    { x: 60, y: 240, label: 'Hub', color: '#1D9E75' },
                    { x: 80, y: 120, label: 'Agenda', color: '#1D9E75' },
                  ].map((node, i) => (
                    <g key={i}>
                      <circle cx={node.x} cy={node.y} r="20" fill={node.color} opacity="0.12" />
                      <circle cx={node.x} cy={node.y} r="12" fill={node.color} opacity="0.8" />
                      <text x={node.x} y={node.y + 4} textAnchor="middle" fill="white" fontSize="8" fontWeight="500">{node.label}</text>
                    </g>
                  ))}
                </svg>
              </div>
              {/* Floating labels */}
              <div className="absolute -bottom-3 -right-3 bg-[#534AB7] text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
                Multi-agente orquestado
              </div>
            </div>
          </ScaleIn>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Módulos Section                                                   */
/* ------------------------------------------------------------------ */
const modules = [
  {
    icon: LayoutDashboard,
    name: 'Sinap OS',
    tagline: 'El cerebro',
    desc: 'Panel central con KPIs en tiempo real, estado de los agentes y flujo de eventos. Tu comando de control para toda la operación.',
    color: '#534AB7',
  },
  {
    icon: MessageSquare,
    name: 'Sinap Desk',
    tagline: 'Recepción inteligente',
    desc: 'Agente de IA que contesta WhatsApp, agenda citas y atiende pacientes 24/7. Nunca más un mensaje sin respuesta.',
    color: '#1D9E75',
  },
  {
    icon: Activity,
    name: 'Sinap Flow',
    tagline: 'Flujo clínico',
    desc: 'Pre-consulta automatizada, notas SOAP generadas por IA y firmas digitales. Tu expediente clínico se escribe solo.',
    color: '#E53E3E',
  },
  {
    icon: Receipt,
    name: 'Sinap Bill',
    tagline: 'Facturación automática',
    desc: 'CFDI 4.0 automático con Facturama. Genera, envía y da seguimiento a facturas sin tocar un botón.',
    color: '#D69E2E',
  },
  {
    icon: TrendingUp,
    name: 'Sinap Grow',
    tagline: 'Crecimiento',
    desc: 'Segmentación de pacientes, campañas de reactivación y embudos de conversión. Tu consultorio crece solo.',
    color: '#534AB7',
  },
  {
    icon: BarChart3,
    name: 'Sinap Sight',
    tagline: 'Inteligencia analítica',
    desc: 'Dashboards predictivos, alertas proactivas y reportes semanales automáticos. Decisiones con datos, no con intuición.',
    color: '#1D9E75',
  },
  {
    icon: Building2,
    name: 'Sinap Hub',
    tagline: 'Operaciones',
    desc: 'Flujo de caja, gestión de personal, inventario inteligente y optimización de agenda multi-doctor. Solo para clínicas.',
    color: '#3182CE',
  },
]

function ModulosSection() {
  const [active, setActive] = useState(0)

  return (
    <section id="modulos" className="py-24 bg-[#F1EFE8]">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <p className="text-sm font-medium text-[#534AB7] mb-3 tracking-wide uppercase">Módulos</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#2C2C2A] mb-4">
            Siete especialistas digitales trabajando por ti
          </h2>
          <p className="text-[#888780] max-w-2xl mx-auto text-lg">
            Cada módulo es un agente especializado. El orquestador los coordina. Tú decides cuánto control das a cada uno.
          </p>
        </FadeIn>

        {/* Module tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {modules.map((mod, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active === i
                  ? 'bg-[#534AB7] text-white shadow-md shadow-[#534AB7]/20'
                  : 'bg-white text-[#2C2C2A]/60 hover:bg-white/80 border border-[#E1F5EE]'
              }`}
            >
              <mod.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{mod.name}</span>
            </button>
          ))}
        </div>

        {/* Active module detail */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl border border-[#E1F5EE] overflow-hidden shadow-sm"
          >
            <div className="grid lg:grid-cols-5 gap-0">
              {/* Info */}
              <div className="lg:col-span-3 p-8 lg:p-10">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-xl"
                    style={{ backgroundColor: `${modules[active].color}15` }}
                  >
                    {(() => {
                      const Icon = modules[active].icon
                      return <Icon className="w-5 h-5" style={{ color: modules[active].color }} />
                    })()}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#2C2C2A]">{modules[active].name}</h3>
                    <p className="text-xs text-[#888780]">{modules[active].tagline}</p>
                  </div>
                </div>
                <p className="text-[#2C2C2A]/70 leading-relaxed mt-4 text-base">{modules[active].desc}</p>

                <div className="mt-6 flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-[#888780]">
                    <BadgeCheck className="w-3.5 h-3.5 text-[#1D9E75]" />
                    Configurable: ON / ASSIST / OFF
                  </div>
                </div>
              </div>

              {/* Visual placeholder */}
              <div className="lg:col-span-2 bg-[#0A1929] p-8 flex items-center justify-center relative overflow-hidden min-h-[280px]">
                <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
                  <defs>
                    <radialGradient id={`modGrad-${active}`} cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={modules[active].color} stopOpacity="0.15" />
                      <stop offset="100%" stopColor={modules[active].color} stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <rect width="200" height="200" fill={`url(#modGrad-${active})`} />
                  <circle cx="100" cy="100" r="40" stroke={modules[active].color} strokeWidth="0.5" opacity="0.2" />
                  <circle cx="100" cy="100" r="25" fill={modules[active].color} opacity="0.1" />
                  <circle cx="100" cy="100" r="12" fill={modules[active].color} opacity="0.7" />
                  {/* Orbiting dots */}
                  {[0, 1, 2, 3, 4, 5].map((j) => {
                    const angle = (j * 60 * Math.PI) / 180
                    const cx = 100 + Math.cos(angle) * 40
                    const cy = 100 + Math.sin(angle) * 40
                    return <circle key={j} cx={cx} cy={cy} r="3" fill={modules[active].color} opacity="0.5" />
                  })}
                </svg>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-white/8 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-[#1D9E75] animate-pulse" />
                      <span className="text-xs text-white/60">Agente activo</span>
                    </div>
                    <p className="text-[11px] text-white/40">Procesando en tiempo real...</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Por qué Sinap Section                                             */
/* ------------------------------------------------------------------ */
function PorQueSection() {
  const advantages = [
    {
      icon: Brain,
      title: 'IA multi-agente, no un simple chatbot',
      desc: 'Siete agentes especializados coordinados por un orquestador. Cada uno entiende su dominio: recepción, clínica, facturación, marketing. No es una IA genérica — es IA que habla tu idioma profesional.',
    },
    {
      icon: Zap,
      title: 'Confianza progresiva',
      desc: 'No tienes que entregarle todo a la IA desde el día uno. Cada módulo tiene tres estados: OFF (tú lo haces), ASSIST (la IA sugiere, tú apruebas), ON (la IA actúa sola). Vas escalando a tu ritmo.',
    },
    {
      icon: Receipt,
      title: 'CFDI 4.0 sin fricción',
      desc: 'Integración nativa con Facturama. La IA detecta cuando una consulta termina, genera la factura con los datos correctos, la timbra y la envía al paciente. Sin tocar un botón.',
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp como primer canal',
      desc: 'En México, tus pacientes están en WhatsApp. Sinap lo conecta como canal principal — también Instagram DM y Facebook Messenger. Todo centralizado en un inbox inteligente.',
    },
    {
      icon: Shield,
      title: 'Cumplimiento mexicano desde el código',
      desc: 'NOM-004 para expedientes clínicos, Ley Federal de Protección de Datos Personales, regulaciones de facturación del SAT. No es un add-on — está construido en el ADN de la plataforma.',
    },
    {
      icon: HeartPulse,
      title: 'Especialista solo o clínica completa',
      desc: 'El mismo motor funciona para un dermatólogo independiente o una clínica con 15 especialistas. Solo cambia la configuración, no la experiencia. Sinap Hub se activa cuando hay equipo que coordinar.',
    },
  ]

  return (
    <section id="por-que" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <p className="text-sm font-medium text-[#1D9E75] mb-3 tracking-wide uppercase">Ventajas</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#2C2C2A] mb-4">
            Por qué Sinap, y no otro software
          </h2>
          <p className="text-[#888780] max-w-2xl mx-auto text-lg">
            No somos un CRM genérico adaptado a salud. Somos una plataforma de IA construida desde cero para la operación clínica en México.
          </p>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {advantages.map((adv, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div className="group bg-[#F1EFE8] hover:bg-white rounded-2xl p-6 border border-transparent hover:border-[#E1F5EE] hover:shadow-lg hover:shadow-[#534AB7]/5 transition-all duration-300 h-full">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#534AB7]/8 group-hover:bg-[#534AB7]/12 transition-colors mb-4">
                  <adv.icon className="w-5 h-5 text-[#534AB7]" />
                </div>
                <h3 className="text-base font-medium text-[#2C2C2A] mb-2">{adv.title}</h3>
                <p className="text-sm text-[#888780] leading-relaxed">{adv.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Casos de uso Section                                              */
/* ------------------------------------------------------------------ */
function CasosSection() {
  const cases = [
    {
      profile: 'Dra. Mariana Herrera',
      specialty: 'Dermatología — Práctica independiente',
      avatar: 'MH',
      quote: 'Antes perdía 2 horas al día contestando WhatsAppes y escribiendo notas. Ahora Sinap Desk atiende por mí, Flow genera mis notas SOAP y yo me enfoco en mis pacientes. Mis ingresos subieron 30% en 3 meses.',
      metrics: [
        { label: 'Tiempo ahorrado', value: '2h/día' },
        { label: 'Aumento en ingresos', value: '+30%' },
        { label: 'Pacientes activos', value: '180+' },
      ],
      modules: ['Desk', 'Flow', 'Bill'],
    },
    {
      profile: 'Clínica San Ángel',
      specialty: 'Clínica multidisciplinaria — 8 especialistas',
      avatar: 'CS',
      quote: 'Coordinar 8 doctores, citas, facturación y pacientes era un caos. Sinap Hub optimiza la agenda, Desk centraliza todos los canales y Sight nos da visibilidad real del negocio. Por fin tenemos control.',
      metrics: [
        { label: 'Doctores coordinados', value: '8' },
        { label: 'Citas gestionadas/mes', value: '600+' },
        { label: 'Tasa de re-agendamiento', value: '-45%' },
      ],
      modules: ['Hub', 'Desk', 'Sight', 'Bill'],
    },
    {
      profile: 'Dr. Carlos Vega',
      specialty: 'Medicina general — Consultorio privado',
      avatar: 'CV',
      quote: 'Yo no soy bueno con la tecnología, pero Sinap es tan intuitivo que en una semana ya tenía todo configurado. Las facturas CFDI se generan solas y mis pacientes reciben recordatorios automáticos. Impresionante.',
      metrics: [
        { label: 'Setup time', value: '1 semana' },
        { label: 'Facturas CFDI/mes', value: '120+' },
        { label: 'No-shows reducidos', value: '-60%' },
      ],
      modules: ['Bill', 'Desk', 'Flow'],
    },
  ]

  return (
    <section id="casos" className="py-24 bg-[#0A1929]">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <p className="text-sm font-medium text-[#1D9E75] mb-3 tracking-wide uppercase">Casos de uso</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-white mb-4">
            Historias reales de quienes ya operan con inteligencia
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto text-lg">
            Desde especialistas independientes hasta clínicas con múltiples doctores. Sinap se adapta a tu realidad.
          </p>
        </FadeIn>

        <div className="grid lg:grid-cols-3 gap-6">
          {cases.map((c, i) => (
            <FadeIn key={i} delay={i * 0.15}>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full flex flex-col">
                {/* Quote */}
                <div className="mb-6 flex-1">
                  <p className="text-white/80 text-sm leading-relaxed italic">&ldquo;{c.quote}&rdquo;</p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {c.metrics.map((m, j) => (
                    <div key={j} className="text-center">
                      <p className="text-lg font-semibold text-[#1D9E75]">{m.value}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Profile */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <div className="w-10 h-10 rounded-full bg-[#534AB7]/20 flex items-center justify-center text-[#534AB7] text-sm font-semibold">
                    {c.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{c.profile}</p>
                    <p className="text-xs text-white/40">{c.specialty}</p>
                  </div>
                </div>

                {/* Active modules */}
                <div className="flex gap-1.5 mt-4">
                  {c.modules.map((mod, j) => (
                    <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1D9E75]/10 text-[#1D9E75]/70 border border-[#1D9E75]/20">
                      {mod}
                    </span>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Pricing Section                                                   */
/* ------------------------------------------------------------------ */
function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      price: '$1,499',
      period: '/mes',
      desc: 'Para el especialista independiente que quiere automatizar lo esencial.',
      features: [
        'Sinap Desk — Recepción inteligente',
        'Sinap Flow — Notas SOAP con IA',
        'Sinap Bill — CFDI 4.0 automático',
        '1 número de WhatsApp conectado',
        'Agenda inteligente',
        'Soporte por chat',
      ],
      cta: 'Comenzar gratis',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '$3,999',
      period: '/mes',
      desc: 'Para el profesional que quiere crecer con inteligencia y control total.',
      features: [
        'Todo en Starter, más:',
        'Sinap Grow — CRM y campañas',
        'Sinap Sight — Analytics predictivos',
        '3 números de WhatsApp conectados',
        'Pre-consulta automatizada',
        'Reportes semanales automáticos',
        'Soporte prioritario',
      ],
      cta: 'Comenzar prueba',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      desc: 'Para clínicas con múltiples especialistas que necesitan operación coordinada.',
      features: [
        'Todo en Pro, más:',
        'Sinap Hub — Operaciones completas',
        'WhatsApp ilimitados',
        'Optimización de agenda multi-doctor',
        'Inventario inteligente',
        'Gestión de personal',
        'API y webhooks propios',
        'Onboarding dedicado',
      ],
      cta: 'Contactar ventas',
      highlight: false,
    },
  ]

  return (
    <section id="precios" className="py-24 bg-[#F1EFE8]">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <p className="text-sm font-medium text-[#534AB7] mb-3 tracking-wide uppercase">Precios</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#2C2C2A] mb-4">
            Un plan para cada etapa de tu práctica
          </h2>
          <p className="text-[#888780] max-w-2xl mx-auto text-lg">
            Sin contratos forzosos. Sin pagos anticipados. Comienza gratis y escala cuando estés listo.
          </p>
        </FadeIn>

        <div className="grid lg:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className={`rounded-2xl p-7 h-full flex flex-col transition-all ${
                plan.highlight
                  ? 'bg-[#534AB7] text-white shadow-xl shadow-[#534AB7]/20 scale-[1.02] border-0'
                  : 'bg-white border border-[#E1F5EE] hover:shadow-lg hover:shadow-[#534AB7]/5'
              }`}>
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold mb-1 ${plan.highlight ? 'text-white' : 'text-[#2C2C2A]'}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-semibold ${plan.highlight ? 'text-white' : 'text-[#2C2C2A]'}`}>
                      {plan.price}
                    </span>
                    <span className={`text-sm ${plan.highlight ? 'text-white/60' : 'text-[#888780]'}`}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={`text-sm mt-2 ${plan.highlight ? 'text-white/60' : 'text-[#888780]'}`}>
                    {plan.desc}
                  </p>
                </div>

                <div className="flex-1 space-y-3 mb-6">
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlight ? 'text-[#5DCAA5]' : 'text-[#1D9E75]'}`} />
                      <span className={`text-sm ${plan.highlight ? 'text-white/80' : 'text-[#2C2C2A]/70'}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <Link href="/login" className="block">
                  <Button
                    className={`w-full h-11 rounded-xl text-sm font-medium transition-all ${
                      plan.highlight
                        ? 'bg-white text-[#534AB7] hover:bg-white/90 shadow-lg'
                        : 'bg-[#534AB7] text-white hover:bg-[#4A42A5] shadow-md shadow-[#534AB7]/15'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn className="text-center mt-8">
          <p className="text-sm text-[#888780]">
            Todos los precios son en MXN + IVA. Factura CFDI 4.0 incluida en todos los planes.
          </p>
        </FadeIn>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  CTA Final Section                                                 */
/* ------------------------------------------------------------------ */
function CTASection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <FadeIn>
          <SinapLogo size={56} variant="light" className="mx-auto mb-8" />
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#2C2C2A] mb-4">
            Tu consultorio puede operar con más inteligencia
          </h2>
          <p className="text-[#888780] text-lg mb-10 max-w-2xl mx-auto">
            Comienza gratis, sin compromiso. En menos de 5 minutos tendrás tu primera cita agendada por IA.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button className="h-13 px-8 bg-[#534AB7] hover:bg-[#4A42A5] text-white text-base font-medium rounded-xl shadow-xl shadow-[#534AB7]/25 transition-all">
                Comenzar gratis
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="h-13 px-8 border-[#1D9E75]/40 text-[#1D9E75] hover:bg-[#1D9E75]/8 text-base font-medium rounded-xl transition-all">
                Hablar con ventas
              </Button>
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Footer                                                            */
/* ------------------------------------------------------------------ */
function LandingFooter() {
  return (
    <footer className="bg-[#0A1929] py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <SinapLogo size={28} variant="dark" showText showTagline className="mb-4" />
            <p className="text-sm text-white/40 leading-relaxed">
              Inteligencia artificial que conecta cada punto de tu consultorio. Hecho en México para profesionales de salud.
            </p>
          </div>

          {/* Plataforma */}
          <div>
            <h4 className="text-sm font-medium text-white/80 mb-4">Plataforma</h4>
            <div className="flex flex-col gap-2.5">
              {['Sinap Desk', 'Sinap Flow', 'Sinap Bill', 'Sinap Grow', 'Sinap Sight', 'Sinap Hub'].map((item) => (
                <a key={item} href="#modulos" className="text-sm text-white/40 hover:text-[#4FD1C5] transition-colors">{item}</a>
              ))}
            </div>
          </div>

          {/* Empresa */}
          <div>
            <h4 className="text-sm font-medium text-white/80 mb-4">Empresa</h4>
            <div className="flex flex-col gap-2.5">
              {['Sobre nosotros', 'Blog', 'Carreras', 'Contacto'].map((item) => (
                <a key={item} href="#" className="text-sm text-white/40 hover:text-[#4FD1C5] transition-colors">{item}</a>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-medium text-white/80 mb-4">Legal</h4>
            <div className="flex flex-col gap-2.5">
              {['Aviso de privacidad', 'Términos de servicio', 'NOM-004', 'Seguridad'].map((item) => (
                <a key={item} href="#" className="text-sm text-white/40 hover:text-[#4FD1C5] transition-colors">{item}</a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">2026 Sinap. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-white/30 hover:text-[#4FD1C5] transition-colors"><Mail className="h-4 w-4" /></a>
            <a href="#" className="text-white/30 hover:text-[#4FD1C5] transition-colors"><Phone className="h-4 w-4" /></a>
            <a href="#" className="text-white/30 hover:text-[#4FD1C5] transition-colors"><MapPin className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/*  Landing Page — Composed                                           */
/* ------------------------------------------------------------------ */
export function SinapLanding() {
  return (
    <div className="bg-[#F1EFE8]">
      <LandingNav />
      <HeroSection />
      <ProblemaSection />
      <QueEsSection />
      <ModulosSection />
      <PorQueSection />
      <CasosSection />
      <PricingSection />
      <CTASection />
      <LandingFooter />
    </div>
  )
}
