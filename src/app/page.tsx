'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { SinapLogo } from '@/components/sinap/sinap-logo'
import { Button } from '@/components/ui/button'
import {
  MessageCircle,
  Instagram,
  Facebook,
  CalendarDays,
  Users,
  CreditCard,
  ArrowRight,
  ChevronDown,
  Check,
  Shield,
  Lock,
  Bot,
  CalendarCheck,
  Bell,
  UserCheck,
  DollarSign,
  Eye,
  Phone,
  Mail,
  Stethoscope,
  BarChart3,
  Workflow,
  Globe,
  KeyRound,
  FileText,
  Activity,
  Megaphone,
  Wallet,
  Code2,
  Building2,
  User,
  ClipboardList,
  History,
  Tags,
  UserPlus,
  ArrowUpRight,
  AlertCircle,
  Settings,
  FileCheck,
  Database,
} from 'lucide-react'

/* ================================================================== */
/*  ANIMATION VARIANTS                                                  */
/* ================================================================== */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
}

/* ================================================================== */
/*  NETWORK BACKGROUND — Subtle neural animation for hero              */
/* ================================================================== */
function NetworkBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <radialGradient id="heroGlow1" cx="30%" cy="40%" r="25%">
          <stop offset="0%" stopColor="#534AB7" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#534AB7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="heroGlow2" cx="70%" cy="60%" r="20%">
          <stop offset="0%" stopColor="#1D9E75" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#1D9E75" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4FD1C5" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#4FD1C5" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1200" height="800" fill="transparent" />
      <rect width="1200" height="800" fill="url(#heroGlow1)" />
      <rect width="1200" height="800" fill="url(#heroGlow2)" />

      {/* Connections */}
      {[
        [120, 140, 340, 180], [340, 180, 560, 120], [560, 120, 780, 200],
        [780, 200, 980, 160], [200, 320, 440, 380], [440, 380, 680, 340],
        [680, 340, 900, 380], [160, 520, 380, 560], [380, 560, 600, 520],
        [600, 520, 840, 560], [840, 560, 1040, 500], [300, 180, 440, 380],
        [560, 120, 680, 340], [780, 200, 900, 380], [380, 560, 600, 520],
      ].map(([x1, y1, x2, y2], i) => (
        <line
          key={`line-${i}`}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#4FD1C5"
          strokeWidth="0.5"
          opacity="0.06"
        >
          <animate
            attributeName="opacity"
            values="0.04;0.08;0.04"
            dur={`${4 + (i % 3)}s`}
            repeatCount="indefinite"
            begin={`${i * 0.5}s`}
          />
        </line>
      ))}

      {/* Nodes */}
      {[
        { x: 120, y: 140, r: 2 }, { x: 340, y: 180, r: 2.5 }, { x: 560, y: 120, r: 3 },
        { x: 780, y: 200, r: 2 }, { x: 980, y: 160, r: 2.5 }, { x: 200, y: 320, r: 1.5 },
        { x: 440, y: 380, r: 2 }, { x: 680, y: 340, r: 2.5 }, { x: 900, y: 380, r: 2 },
        { x: 160, y: 520, r: 2 }, { x: 380, y: 560, r: 1.5 }, { x: 600, y: 520, r: 2.5 },
        { x: 840, y: 560, r: 2 }, { x: 1040, y: 500, r: 1.5 },
      ].map((node, i) => (
        <g key={`node-${i}`}>
          <circle cx={node.x} cy={node.y} r={node.r * 4} fill="url(#nodeGlow)" opacity="0.06" />
          <circle cx={node.x} cy={node.y} r={node.r} fill="#4FD1C5" opacity="0.12">
            <animate
              attributeName="opacity"
              values="0.08;0.18;0.08"
              dur={`${3 + (i % 4)}s`}
              repeatCount="indefinite"
              begin={`${i * 0.3}s`}
            />
          </circle>
        </g>
      ))}
    </svg>
  )
}

/* ================================================================== */
/*  1. NAVIGATION — Fixed top, transparent on hero, white on scroll    */
/* ================================================================== */
function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const router = useRouter()

  const navLinks = [
    { label: 'Producto', href: '#ecosistema' },
    { label: 'Cómo funciona', href: '#como-funciona' },
    { label: 'Soluciones', href: '#para-quien' },
    { label: 'Seguridad', href: '#seguridad' },
    { label: 'Preguntas frecuentes', href: '#faq' },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <SinapLogo
            size={30}
            showText
            variant={scrolled ? 'light' : 'dark'}
          />
        </Link>

        {/* Center links — hidden on mobile */}
        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                scrolled
                  ? 'text-gray-600 hover:text-[#534AB7]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className={`hidden sm:inline-flex text-sm font-medium transition-colors ${
              scrolled
                ? 'text-gray-600 hover:text-[#534AB7]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Iniciar sesión
          </Link>
          <Button
            onClick={() => router.push('/login')}
            className="bg-[#534AB7] hover:bg-[#4A42A5] text-white text-sm font-medium rounded-lg h-9 px-4 shadow-lg shadow-[#534AB7]/15 hover:shadow-[#534AB7]/25 transition-all duration-200"
          >
            Solicitar una demo
          </Button>
        </div>
      </div>
    </nav>
  )
}

/* ================================================================== */
/*  2. HERO — Dark background (#0A1929)                                */
/* ================================================================== */
function HeroSection() {
  const router = useRouter()

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      <div className="absolute inset-0 bg-[#0A1929]" />
      <NetworkBackground />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#534AB7]/8 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#1D9E75]/6 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-24 md:py-32 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Eyebrow */}
          <motion.div variants={staggerItem}>
            <span className="inline-flex items-center gap-1.5 text-[#4FD1C5] text-sm font-medium bg-[#4FD1C5]/10 rounded-full px-4 py-1.5 mb-8">
              Sistema operativo multiagente para negocios de salud
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={staggerItem}
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold text-white leading-[1.08] tracking-tight"
          >
            Inteligencia{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4FD1C5] to-[#1D9E75]">
              que conecta.
            </span>
          </motion.h1>

          {/* Body */}
          <motion.p
            variants={staggerItem}
            className="mt-6 text-lg sm:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto"
          >
            Centraliza tus conversaciones de WhatsApp, Instagram y Facebook. Organiza cada paciente en un solo CRM y activa agentes especializados que atienden, agendan, confirman citas, dan seguimiento y coordinan tu operación.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={staggerItem} className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => router.push('/login')}
              size="lg"
              className="bg-[#534AB7] hover:bg-[#4A42A5] text-white font-medium rounded-xl h-12 px-7 shadow-xl shadow-[#534AB7]/20 hover:shadow-[#534AB7]/30 transition-all duration-200 text-[15px]"
            >
              Solicitar una demo
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-[15px] font-medium transition-colors group"
            >
              Ver cómo funciona
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </motion.div>

          {/* Microcopy */}
          <motion.p
            variants={staggerItem}
            className="mt-8 text-sm text-white/40 max-w-lg mx-auto"
          >
            Diseñado para profesionales independientes y clínicas que quieren crecer sin perder el trato humano.
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}

/* ================================================================== */
/*  3. CANALES STRIP — Light section (#F1EFE8)                         */
/* ================================================================== */
const channels = [
  { icon: MessageCircle, label: 'WhatsApp Business' },
  { icon: Instagram, label: 'Instagram' },
  { icon: Facebook, label: 'Facebook Messenger' },
  { icon: CalendarDays, label: 'Agenda' },
  { icon: Users, label: 'CRM' },
  { icon: CreditCard, label: 'Cobros' },
  { icon: ArrowUpRight, label: 'Seguimiento' },
]

function ChannelsStrip() {
  return (
    <section className="py-20 md:py-24 bg-[#F1EFE8]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#2C2C2A] tracking-tight">
            Una conversación puede empezar en cualquier lugar.
          </h2>
          <p className="mt-3 text-lg text-gray-500">
            Sinap conecta todo lo que ocurre después.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="mt-12 flex flex-wrap justify-center gap-4 sm:gap-6"
        >
          {channels.map((ch) => (
            <motion.div
              key={ch.label}
              variants={staggerItem}
              className="flex items-center gap-2.5 bg-white rounded-full px-5 py-2.5 shadow-sm border border-gray-100 hover:border-[#4FD1C5]/30 hover:shadow-md transition-all duration-200"
            >
              <ch.icon className="w-4 h-4 text-[#4FD1C5]" />
              <span className="text-sm font-medium text-[#2C2C2A]">{ch.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ================================================================== */
/*  4. EL PROBLEMA — White background                                  */
/* ================================================================== */
const problemPoints = [
  'Un paciente pregunta por Instagram.',
  'Otro solicita precios por WhatsApp.',
  'Una cita queda sin confirmar.',
  'Un seguimiento se olvida.',
  'Un cobro permanece pendiente.',
  'Tu equipo cambia constantemente entre aplicaciones, notas y conversaciones aisladas.',
]

function ProblemSection() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#2C2C2A] tracking-tight">
            Tu clínica no pierde pacientes por falta de interés.
          </h2>
          <p className="mt-3 text-lg text-gray-500">
            Los pierde entre un mensaje y el siguiente.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="mt-10 space-y-3"
        >
          {problemPoints.map((point) => (
            <motion.p
              key={point}
              variants={staggerItem}
              className="text-base text-gray-400 pl-4 border-l-2 border-transparent"
            >
              {point}
            </motion.p>
          ))}
        </motion.div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="mt-8 text-base text-gray-500 leading-relaxed"
        >
          Cuando cada proceso vive por separado, la clínica depende de que alguien recuerde qué hacer después.
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="mt-8 pl-5 border-l-3 border-[#4FD1C5] py-1"
        >
          <p className="text-base font-medium text-[#2C2C2A]">
            Sinap convierte conversaciones dispersas en una operación conectada.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ================================================================== */
/*  5. CÓMO FUNCIONA — Light background (#F1EFE8), id="como-funciona" */
/* ================================================================== */
const howItWorksSteps = [
  {
    num: '01',
    title: 'El paciente escribe',
    desc: 'Recibe mensajes desde tus canales digitales en una sola bandeja.',
  },
  {
    num: '02',
    title: 'Sinap comprende la intención',
    desc: 'Identifica si el paciente quiere información, agendar, reagendar, confirmar una cita o solicitar atención humana.',
  },
  {
    num: '03',
    title: 'El agente adecuado interviene',
    desc: 'Cada solicitud se asigna al agente especializado que puede resolverla.',
  },
  {
    num: '04',
    title: 'La acción se ejecuta',
    desc: 'La información se registra, la cita se agenda, el recordatorio se programa o el seguimiento se activa.',
  },
  {
    num: '05',
    title: 'Tu equipo conserva el control',
    desc: 'Cuando un caso requiere atención personal, Sinap lo escala con todo el contexto disponible.',
  },
]

function HowItWorksSection() {
  return (
    <section className="py-20 md:py-28 bg-[#F1EFE8]" id="como-funciona">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#2C2C2A] tracking-tight">
            Una señal entra. Sinap pone el sistema en movimiento.
          </h2>
        </motion.div>

        <div className="mt-14 relative">
          {/* Vertical gradient line — neural metaphor */}
          <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gradient-to-b from-[#534AB7]/30 via-[#4FD1C5]/30 to-[#1D9E75]/30 hidden sm:block" />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={stagger}
            className="space-y-8"
          >
            {howItWorksSteps.map((step) => (
              <motion.div
                key={step.num}
                variants={staggerItem}
                className="flex gap-5 sm:gap-6 items-start"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-[#0A1929] text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-[#0A1929]/20 relative z-10">
                  {step.num}
                </div>
                <div className="pt-0.5">
                  <h3 className="text-base font-semibold text-[#2C2C2A]">{step.title}</h3>
                  <p className="mt-1 text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="mt-12 pl-5 border-l-3 border-[#4FD1C5] py-1"
        >
          <p className="text-base font-medium text-[#2C2C2A]">
            No es un chatbot aislado. Es una clínica trabajando como un sistema.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ================================================================== */
/*  6. SIMULACIÓN INTERACTIVA — White background                       */
/* ================================================================== */
const simulationChecks = [
  'Contacto registrado',
  'Intención identificada',
  'Horarios consultados',
  'Cita creada',
  'Recordatorio programado',
]

const simulationStatuses = [
  { label: 'CRM', value: 'Nuevo paciente registrado' },
  { label: 'Calendario', value: 'Cita agendada — Jue 12, 10:00' },
  { label: 'Etiqueta', value: 'Valoración inicial' },
  { label: 'Recordatorio', value: '24h antes' },
  { label: 'Equipo', value: 'Notificación enviada' },
]

function SimulationSection() {
  const [step, setStep] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  const startSimulation = useCallback(() => {
    if (hasStarted) return
    setHasStarted(true)
    setStep(0)
  }, [hasStarted])

  // Auto-play on scroll into view
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          startSimulation()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasStarted, startSimulation])

  // Advance steps
  useEffect(() => {
    if (!hasStarted) return

    const timers: ReturnType<typeof setTimeout>[] = []

    // Step 1: Patient message (0ms)
    timers.push(setTimeout(() => setStep(1), 600))
    // Step 2: Agent message (1800ms)
    timers.push(setTimeout(() => setStep(2), 1800))
    // Step 3-7: Checks appear one by one (3000ms onwards)
    simulationChecks.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(3 + i), 3000 + i * 800))
    })

    return () => timers.forEach(clearTimeout)
  }, [hasStarted])

  const handleReplay = () => {
    setStep(0)
    setHasStarted(false)
    setTimeout(() => startSimulation(), 100)
  }

  return (
    <section className="py-20 md:py-28 bg-white" ref={sectionRef}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          className="text-center mb-14"
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#2C2C2A] tracking-tight">
            Un mensaje puede convertirse en una experiencia completa.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Left — Chat simulation */}
          <div className="bg-[#0A1929] rounded-2xl p-6 sm:p-8 min-h-[400px] flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2.5 h-2.5 rounded-full bg-[#1D9E75]" />
              <span className="text-sm text-white/50 font-medium">Conversación en vivo</span>
            </div>

            <div className="flex-1 space-y-4">
              {/* Patient message */}
              <AnimatePresence>
                {step >= 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                      <p className="text-sm text-white/90">
                        &ldquo;Hola, quisiera agendar una valoración. ¿Tienen disponibilidad esta semana?&rdquo;
                      </p>
                      <p className="text-[11px] text-white/30 mt-1.5">Paciente · WhatsApp</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Agent message */}
              <AnimatePresence>
                {step >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex justify-end"
                  >
                    <div className="bg-[#534AB7] rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]">
                      <p className="text-sm text-white">
                        &ldquo;Claro. ¿Buscas valoración inicial o seguimiento?&rdquo;
                      </p>
                      <p className="text-[11px] text-white/40 mt-1.5">Sinap Agent · Recepción</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* System checks */}
              <AnimatePresence>
                {step >= 3 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 space-y-2.5 pt-4 border-t border-white/5"
                  >
                    <p className="text-[11px] text-[#4FD1C5]/60 font-medium uppercase tracking-wider mb-3">Procesando</p>
                    {simulationChecks.map((check, i) => (
                      <motion.div
                        key={check}
                        initial={{ opacity: 0, x: -8 }}
                        animate={step >= 3 + i ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                        transition={{ duration: 0.35, delay: 0 }}
                        className="flex items-center gap-2.5"
                      >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-300 ${
                          step >= 3 + i ? 'bg-[#1D9E75]/20' : 'bg-white/5'
                        }`}>
                          <Check className={`w-2.5 h-2.5 transition-colors duration-300 ${
                            step >= 3 + i ? 'text-[#1D9E75]' : 'text-transparent'
                          }`} />
                        </div>
                        <span className={`text-sm transition-colors duration-300 ${
                          step >= 3 + i ? 'text-white/80' : 'text-white/20'
                        }`}>
                          {check}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Replay button */}
            {step >= 7 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4 pt-3 border-t border-white/5 flex justify-end"
              >
                <button
                  onClick={handleReplay}
                  className="text-[12px] text-[#4FD1C5]/60 hover:text-[#4FD1C5] transition-colors"
                >
                  Repetir simulación
                </button>
              </motion.div>
            )}
          </div>

          {/* Right — Live status updates */}
          <div className="bg-[#F1EFE8] rounded-2xl p-6 sm:p-8 min-h-[400px]">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-4 h-4 text-[#534AB7]/60" />
              <span className="text-sm text-gray-500 font-medium">Estado en tiempo real</span>
            </div>

            <div className="space-y-4">
              {simulationStatuses.map((status, i) => (
                <motion.div
                  key={status.label}
                  initial={{ opacity: 0, x: 12 }}
                  animate={step >= 3 + i ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
                  transition={{ duration: 0.4 }}
                  className={`bg-white rounded-xl px-4 py-3.5 border transition-all duration-300 ${
                    step >= 3 + i
                      ? 'border-[#1D9E75]/20 shadow-sm'
                      : 'border-transparent opacity-0'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">{status.label}</p>
                      <p className="text-sm font-medium text-[#2C2C2A] mt-0.5">{status.value}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300 ${
                      step >= 3 + i ? 'bg-[#1D9E75]/15' : 'bg-gray-100'
                    }`}>
                      <Check className={`w-3 h-3 transition-colors duration-300 ${
                        step >= 3 + i ? 'text-[#1D9E75]' : 'text-gray-300'
                      }`} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Highlighted quote */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="mt-10 max-w-2xl mx-auto pl-5 border-l-3 border-[#4FD1C5] py-1"
        >
          <p className="text-base font-medium text-[#2C2C2A]">
            Una conversación deja de ser un mensaje aislado y se convierte en un proceso completo.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ================================================================== */
/*  7. CRM UNIFICADO — Light background                                */
/* ================================================================== */
const crmBenefits = [
  'Historial completo de conversaciones',
  'Contactos organizados automáticamente',
  'Etiquetas y etapas personalizables',
  'Seguimiento de prospectos y pacientes activos',
  'Asignación a miembros del equipo',
  'Escalamiento inmediato a atención humana',
  'Registro de cada interacción',
]

function CRMSection() {
  return (
    <section className="py-20 md:py-28 bg-[#F1EFE8]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#2C2C2A] tracking-tight">
            Un paciente. Una sola historia. Todos los canales conectados.
          </h2>
          <p className="mt-4 text-base text-gray-500 leading-relaxed">
            Consulta conversaciones, datos de contacto, citas, etiquetas, seguimientos y estado del paciente sin cambiar constantemente entre aplicaciones.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="mt-10 space-y-3"
        >
          {crmBenefits.map((benefit) => (
            <motion.div
              key={benefit}
              variants={staggerItem}
              className="flex items-center gap-3"
            >
              <div className="w-5 h-5 rounded-full bg-[#1D9E75]/15 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-[#1D9E75]" />
              </div>
              <span className="text-sm text-gray-600">{benefit}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="mt-10 pl-5 border-l-3 border-[#4FD1C5] py-1"
        >
          <p className="text-base font-medium text-[#2C2C2A]">
            El canal puede cambiar. El contexto permanece.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ================================================================== */
/*  8. AGENTES ESPECIALIZADOS — White background                       */
/* ================================================================== */
const agents = [
  {
    icon: Bot,
    title: 'Agente de recepción',
    desc: 'Responde preguntas frecuentes, identifica necesidades y canaliza solicitudes.',
  },
  {
    icon: CalendarCheck,
    title: 'Agente de agenda',
    desc: 'Consulta disponibilidad, reserva citas, reagenda y gestiona cancelaciones.',
  },
  {
    icon: Bell,
    title: 'Agente de confirmación',
    desc: 'Envía recordatorios, solicita confirmaciones y ayuda a reducir espacios perdidos.',
  },
  {
    icon: UserCheck,
    title: 'Agente de seguimiento',
    desc: 'Retoma conversaciones pendientes y acompaña al paciente después de cada interacción.',
  },
  {
    icon: DollarSign,
    title: 'Agente de cobranza',
    desc: 'Comparte cotizaciones, registra pagos y da seguimiento a pendientes administrativos.',
  },
  {
    icon: Eye,
    title: 'Agente supervisor',
    desc: 'Detecta casos sensibles, evita respuestas fuera de alcance y escala a una persona cuando corresponde.',
  },
]

function AgentesSection() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#2C2C2A] tracking-tight">
            No necesitas otro bot.
          </h2>
          <p className="mt-3 text-lg text-gray-500">
            Necesitas un equipo que se coordine.
          </p>
          <p className="mt-4 text-base text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Cada agente cumple una función específica. Sinap OS los conecta para que trabajen con el mismo contexto y bajo las reglas que tú definas.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {agents.map((agent) => (
            <motion.div
              key={agent.title}
              variants={staggerItem}
              className="group p-6 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-[#534AB7]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <agent.icon className="w-5 h-5 text-[#534AB7]" />
              </div>
              <h3 className="text-base font-semibold text-[#2C2C2A] mb-2">{agent.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{agent.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="mt-12 max-w-2xl mx-auto pl-5 border-l-3 border-[#4FD1C5] py-1"
        >
          <p className="text-base font-medium text-[#2C2C2A]">
            Cada agente funciona como una neurona. Sinap conecta la red.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ================================================================== */
/*  9. BENEFICIOS — Dark background (#0A1929)                          */
/* ================================================================== */
const benefits = [
  {
    title: 'Responde sin depender del horario',
    desc: 'Tus pacientes reciben atención inicial incluso cuando tu equipo está ocupado.',
  },
  {
    title: 'Convierte más conversaciones en citas',
    desc: 'Cada oportunidad avanza con seguimiento y contexto.',
  },
  {
    title: 'Reduce tareas administrativas',
    desc: 'Automatiza recordatorios, confirmaciones, reprogramaciones y procesos repetitivos.',
  },
  {
    title: 'Evita que los pacientes se pierdan',
    desc: 'Detecta conversaciones incompletas y activa el siguiente paso.',
  },
  {
    title: 'Centraliza tu operación',
    desc: 'Conecta comunicación, agenda, CRM, cobros y analítica en una sola plataforma.',
  },
  {
    title: 'Mantén el control humano',
    desc: 'Define reglas, revisa conversaciones y toma el control en cualquier momento.',
  },
]

function BenefitsSection() {
  return (
    <section className="py-20 md:py-28 bg-[#0A1929] relative overflow-hidden">
      {/* Subtle gradient orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#534AB7]/6 rounded-full blur-[150px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Menos tareas repetitivas.
          </h2>
          <p className="mt-3 text-lg text-white/50">
            Más tiempo para atender.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {benefits.map((benefit) => (
            <motion.div
              key={benefit.title}
              variants={staggerItem}
              className="p-6 rounded-2xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/12 transition-all duration-300"
            >
              <h3 className="text-base font-semibold text-white mb-2">{benefit.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{benefit.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ================================================================== */
/*  10. BANDEJA UNIFICADA — Light background                           */
/* ================================================================== */
const filterPills = [
  'Nuevos prospectos',
  'Citas pendientes',
  'Requiere atención',
  'Seguimiento',
  'Cobros',
  'Pacientes activos',
]

function BandejaSection() {
  return (
    <section className="py-20 md:py-28 bg-[#F1EFE8]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#2C2C2A] tracking-tight">
            Todo lo importante ocurre en un solo lugar.
          </h2>
          <p className="mt-4 text-base text-gray-500 leading-relaxed">
            Visualiza conversaciones, pacientes y tareas desde una bandeja central. Sinap organiza cada mensaje por canal, responsable, estado e intención.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="mt-10 flex flex-wrap gap-2.5"
        >
          {filterPills.map((pill) => (
            <motion.span
              key={pill}
              variants={staggerItem}
              className="inline-flex items-center gap-1.5 bg-white rounded-full px-4 py-2 text-sm text-gray-600 border border-gray-100 shadow-sm"
            >
              {pill}
            </motion.span>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="mt-10 pl-5 border-l-3 border-[#4FD1C5] py-1"
        >
          <p className="text-base font-medium text-[#2C2C2A]">
            Deja de administrar aplicaciones. Empieza a dirigir tu clínica.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ================================================================== */
/*  11. ECOSISTEMA SINAP — White background                            */
/* ================================================================== */
const modules = [
  {
    icon: Workflow,
    title: 'Sinap OS',
    desc: 'La plataforma que conecta agentes, procesos y módulos.',
    accent: '#534AB7',
  },
  {
    icon: Bot,
    title: 'Sinap Agent',
    desc: 'Atención conversacional, agenda y seguimiento en tus canales digitales.',
    accent: '#1D9E75',
  },
  {
    icon: FileText,
    title: 'Sinap Chart',
    desc: 'Expediente e historial clínico estructurado.',
    accent: '#4FD1C5',
  },
  {
    icon: BarChart3,
    title: 'Sinap Pulse',
    desc: 'Indicadores operativos, métricas y alertas relevantes.',
    accent: '#534AB7',
  },
  {
    icon: Megaphone,
    title: 'Sinap Reach',
    desc: 'Marketing conectado con atribución desde el primer mensaje hasta la conversión.',
    accent: '#1D9E75',
  },
  {
    icon: Wallet,
    title: 'Sinap Pay',
    desc: 'Cotizaciones, cobros y conciliación financiera.',
    accent: '#4FD1C5',
  },
  {
    icon: Code2,
    title: 'Sinap API',
    desc: 'Integración con sistemas externos mediante API y webhooks.',
    accent: '#534AB7',
  },
]

function EcosistemaSection() {
  return (
    <section className="py-20 md:py-28 bg-white" id="ecosistema">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#2C2C2A] tracking-tight">
            Empieza con lo que necesitas.
          </h2>
          <p className="mt-3 text-lg text-gray-500">
            Crece hacia un sistema completo.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {modules.map((mod) => (
            <motion.div
              key={mod.title}
              variants={staggerItem}
              className="group p-6 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: `${mod.accent}10` }}
              >
                <mod.icon className="w-5 h-5" style={{ color: mod.accent }} />
              </div>
              <h3 className="text-base font-semibold text-[#2C2C2A] mb-2">{mod.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{mod.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="mt-10 text-center text-sm text-gray-400"
        >
          Activa únicamente los módulos que tu operación necesita.
        </motion.p>
      </div>
    </section>
  )
}

/* ================================================================== */
/*  12. PARA QUIÉN ES — Light background                               */
/* ================================================================== */
const audiences = [
  {
    icon: User,
    title: 'Profesionales independientes',
    desc: 'Automatiza recepción, agenda y seguimiento sin contratar una estructura administrativa compleja.',
  },
  {
    icon: Building2,
    title: 'Consultorios con equipo de recepción',
    desc: 'Reduce trabajo repetitivo y permite que tu personal se enfoque en casos que requieren atención humana.',
  },
  {
    icon: Stethoscope,
    title: 'Clínicas con varias especialidades',
    desc: 'Organiza canales, pacientes, profesionales, agendas y responsabilidades desde un solo sistema.',
  },
  {
    icon: Globe,
    title: 'Centros con varias sucursales',
    desc: 'Mantén una operación conectada y una visión unificada del negocio.',
  },
]

const specialties = [
  'Medicina', 'Odontología', 'Psicología', 'Nutrición',
  'Fisioterapia', 'Podología', 'Dermatología', 'Medicina estética',
  'Veterinaria', 'Wellness',
]

function ParaQuienSection() {
  return (
    <section className="py-20 md:py-28 bg-[#F1EFE8]" id="para-quien">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#2C2C2A] tracking-tight">
            Diseñado para negocios de salud que quieren crecer con orden.
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="mt-14 grid sm:grid-cols-2 gap-5"
        >
          {audiences.map((aud) => (
            <motion.div
              key={aud.title}
              variants={staggerItem}
              className="group p-6 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1D9E75]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <aud.icon className="w-5 h-5 text-[#1D9E75]" />
              </div>
              <h3 className="text-base font-semibold text-[#2C2C2A] mb-2">{aud.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{aud.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="mt-10 flex flex-wrap justify-center gap-2.5"
        >
          {specialties.map((spec) => (
            <motion.span
              key={spec}
              variants={staggerItem}
              className="inline-flex items-center bg-white rounded-full px-4 py-1.5 text-sm text-gray-600 border border-gray-100"
            >
              {spec}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ================================================================== */
/*  13. CONTROL Y SEGURIDAD — White background                         */
/* ================================================================== */
const securityItems = [
  { icon: Shield, label: 'Permisos por rol' },
  { icon: Lock, label: 'Separación de información entre organizaciones' },
  { icon: ClipboardList, label: 'Registro de acciones' },
  { icon: UserCheck, label: 'Escalamiento a atención humana' },
  { icon: Settings, label: 'Reglas configurables por agente' },
  { icon: KeyRound, label: 'Acceso restringido según el tipo de información' },
  { icon: History, label: 'Historial de cambios' },
  { icon: Database, label: 'Respaldo de datos' },
]

function SeguridadSection() {
  return (
    <section className="py-20 md:py-28 bg-white" id="seguridad">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#2C2C2A] tracking-tight">
            Automatización con límites claros.
          </h2>
          <p className="mt-4 text-base text-gray-500 leading-relaxed">
            Sinap está diseñado para que tu equipo conserve el control sobre cada interacción y cada proceso.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="mt-10 grid sm:grid-cols-2 gap-x-6 gap-y-3"
        >
          {securityItems.map((item) => (
            <motion.div
              key={item.label}
              variants={staggerItem}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0A1929]/5 flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-[#0A1929]/60" />
              </div>
              <span className="text-sm text-gray-600">{item.label}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="mt-10 pl-5 border-l-3 border-[#4FD1C5] py-1"
        >
          <p className="text-base font-medium text-[#2C2C2A]">
            La inteligencia automatiza. Tu equipo decide.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ================================================================== */
/*  14. PREGUNTAS FRECUENTES — Light background                        */
/* ================================================================== */
const faqItems = [
  {
    q: '¿Sinap reemplaza a mi personal de recepción?',
    a: 'No. Sinap automatiza tareas repetitivas, organiza información y ayuda a responder con mayor velocidad. Tu equipo conserva el control y puede intervenir cuando lo necesite.',
  },
  {
    q: '¿Puedo conectar el WhatsApp que ya utiliza mi clínica?',
    a: 'La disponibilidad depende de la configuración actual de tu cuenta de WhatsApp Business. Durante el proceso de implementación revisamos tu caso y te orientamos para conectar el número adecuado.',
  },
  {
    q: '¿Sinap responde preguntas médicas?',
    a: 'Sinap puede responder información autorizada por tu organización y canalizar solicitudes. Los casos que requieren criterio clínico deben escalarse al personal correspondiente.',
  },
  {
    q: '¿Mis pacientes pueden hablar con una persona?',
    a: 'Sí. El equipo puede tomar el control de cualquier conversación cuando sea necesario.',
  },
  {
    q: '¿Funciona para profesionales independientes?',
    a: 'Sí. Puedes comenzar con recepción, agenda y seguimiento, y activar módulos adicionales conforme crezca tu práctica.',
  },
  {
    q: '¿Tengo que instalar algo?',
    a: 'No. Sinap funciona desde una plataforma web. La configuración inicial se realiza con acompañamiento.',
  },
  {
    q: '¿Puedo personalizar los agentes?',
    a: 'Sí. Cada organización puede definir servicios, horarios, reglas, mensajes y criterios de escalamiento.',
  },
]

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-20 md:py-28 bg-[#F1EFE8]" id="faq">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#2C2C2A] tracking-tight text-center">
            Preguntas frecuentes
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="mt-12 space-y-3"
        >
          {faqItems.map((item, i) => (
            <motion.div
              key={item.q}
              variants={staggerItem}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
              >
                <span className="text-sm font-medium text-[#2C2C2A] pr-4">{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-5 pb-4 pt-0">
                      <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ================================================================== */
/*  15. CTA FINAL — Dark background (#0A1929)                          */
/* ================================================================== */
function CTASection() {
  const router = useRouter()

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0A1929]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#534AB7]/8 rounded-full blur-[150px]" />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center"
      >
        <motion.h2
          variants={staggerItem}
          className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-tight"
        >
          Tu clínica ya recibe señales.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4FD1C5] to-[#1D9E75]">
            Haz que trabajen juntas.
          </span>
        </motion.h2>

        <motion.p
          variants={staggerItem}
          className="mt-5 text-base text-white/50 leading-relaxed max-w-xl mx-auto"
        >
          Conecta tus canales, organiza cada paciente y permite que tu operación avance incluso cuando tu equipo está ocupado.
        </motion.p>

        <motion.div variants={staggerItem} className="mt-8">
          <Button
            onClick={() => router.push('/login')}
            size="lg"
            className="bg-[#534AB7] hover:bg-[#4A42A5] text-white font-medium rounded-xl h-12 px-7 shadow-xl shadow-[#534AB7]/25 hover:shadow-[#534AB7]/35 transition-all duration-200 text-[15px]"
          >
            Solicitar una demo
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </motion.div>

        <motion.p
          variants={staggerItem}
          className="mt-5 text-sm text-white/30"
        >
          Descubre cómo Sinap puede adaptarse a tu clínica.
        </motion.p>
      </motion.div>
    </section>
  )
}

/* ================================================================== */
/*  16. FOOTER — Very dark (#070F1D)                                   */
/* ================================================================== */
function Footer() {
  const linksRow1 = [
    { label: 'Producto', href: '#ecosistema' },
    { label: 'Soluciones', href: '#para-quien' },
    { label: 'Seguridad', href: '#seguridad' },
    { label: 'Preguntas frecuentes', href: '#faq' },
    { label: 'Iniciar sesión', href: '/login' },
  ]

  const linksRow2 = [
    { label: 'Aviso de privacidad', href: '#' },
    { label: 'Términos y condiciones', href: '#' },
    { label: 'Contacto', href: '#' },
  ]

  return (
    <footer className="bg-[#070F1D]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-10">
          <SinapLogo size={32} showText variant="dark" />
          <p className="mt-3 text-sm text-white/40">
            Inteligencia que conecta.
          </p>
        </div>

        {/* Links row 1 */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4">
          {linksRow1.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Links row 2 */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-10">
          {linksRow2.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-white/30 hover:text-white/60 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Bottom line */}
        <div className="pt-8 border-t border-white/5 text-center">
          <p className="text-xs text-white/25">
            Construido en Latinoamérica. Diseñado para escalar al mundo.
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ================================================================== */
/*  MAIN PAGE                                                          */
/* ================================================================== */
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <HeroSection />
      <ChannelsStrip />
      <ProblemSection />
      <HowItWorksSection />
      <SimulationSection />
      <CRMSection />
      <AgentesSection />
      <BenefitsSection />
      <BandejaSection />
      <EcosistemaSection />
      <ParaQuienSection />
      <SeguridadSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  )
}
