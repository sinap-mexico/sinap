// ─────────────────────────────────────────────────────────────
// Sinap OS — Mock API Data Module
// Provides realistic Mexican dermatology clinic data matching
// exactly the shape returned by Prisma queries, so API routes
// can fall back seamlessly when the database is unavailable.
// ─────────────────────────────────────────────────────────────

export const DEMO_CLINIC_ID = 'demo-clinic-mock'

// ─── DATE HELPERS ──────────────────────────────────────────

function iso(hoursAgo = 0): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - hoursAgo * 60)
  return d.toISOString()
}

function todayISO(hour = 0, minute = 0): string {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function daysAgoISO(n: number, hour = 0, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function tomorrowISO(hour = 0, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

// ─── PATIENTS (matching seed data) ────────────────────────

const MOCK_PATIENTS = [
  {
    id: 'mock-patient-1',
    clinicId: DEMO_CLINIC_ID,
    firstName: 'Maria',
    lastName: 'Garcia Lopez',
    fullName: 'Maria Garcia Lopez',
    phone: '+52 55 4123 0101',
    email: 'maria.garcia@email.com',
    birthDate: '1988-03-15T00:00:00.000Z',
    gender: 'F',
    rfc: 'GALM880315MDF',
    address: 'Col. Del Valle, CDMX',
    source: 'referral',
    firstContactDate: daysAgoISO(180),
    lastVisitDate: daysAgoISO(2),
    totalVisits: 12,
    totalSpent: 28500,
    ltv: 34000,
    segment: 'vip',
    sentiment: 'positive',
    preferredChannel: 'whatsapp',
    preferredTime: 'morning',
    doNotContact: false,
    allergies: 'Penicilina',
    medicalHistory: null,
    notes: 'Paciente VIP. Prefiere citas por la manana. Seguimiento de melanoma en antebrazo izquierdo.',
    createdAt: daysAgoISO(180),
    updatedAt: iso(),
  },
  {
    id: 'mock-patient-2',
    clinicId: DEMO_CLINIC_ID,
    firstName: 'Carlos',
    lastName: 'Mendoza Rivera',
    fullName: 'Carlos Mendoza Rivera',
    phone: '+52 55 4123 0202',
    email: 'carlos.mendoza@email.com',
    birthDate: '1975-07-22T00:00:00.000Z',
    gender: 'M',
    rfc: 'MERC750722HDF',
    address: 'Col. Roma Norte, CDMX',
    source: 'whatsapp',
    firstContactDate: daysAgoISO(90),
    lastVisitDate: daysAgoISO(5),
    totalVisits: 6,
    totalSpent: 9800,
    ltv: 14200,
    segment: 'active',
    sentiment: 'positive',
    preferredChannel: 'whatsapp',
    preferredTime: 'afternoon',
    doNotContact: false,
    allergies: null,
    medicalHistory: null,
    notes: 'Tratamiento de acne cronico en curso. Buena respuesta a retinoides.',
    createdAt: daysAgoISO(90),
    updatedAt: iso(),
  },
  {
    id: 'mock-patient-3',
    clinicId: DEMO_CLINIC_ID,
    firstName: 'Ana Sofia',
    lastName: 'Hernandez',
    fullName: 'Ana Sofia Hernandez',
    phone: '+52 55 4123 0303',
    email: 'anasofia.h@email.com',
    birthDate: '1995-11-08T00:00:00.000Z',
    gender: 'F',
    rfc: 'HEAS951108MDF',
    address: 'Col. Condesa, CDMX',
    source: 'instagram',
    firstContactDate: daysAgoISO(120),
    lastVisitDate: daysAgoISO(60),
    totalVisits: 2,
    totalSpent: 3000,
    ltv: 3000,
    segment: 'inactive',
    sentiment: 'neutral',
    preferredChannel: 'instagram',
    preferredTime: 'evening',
    doNotContact: false,
    allergies: 'Sulfonamidas',
    medicalHistory: null,
    notes: 'Vino por consulta estetica. No ha regresado, posible reactivacion.',
    createdAt: daysAgoISO(120),
    updatedAt: iso(),
  },
  {
    id: 'mock-patient-4',
    clinicId: DEMO_CLINIC_ID,
    firstName: 'Roberto',
    lastName: 'Jimenez Salazar',
    fullName: 'Roberto Jimenez Salazar',
    phone: '+52 55 4123 0404',
    email: 'rjimenez@email.com',
    birthDate: '1962-01-30T00:00:00.000Z',
    gender: 'M',
    rfc: 'JISR620130HDF',
    address: 'Lomas de Chapultepec, CDMX',
    source: 'referral',
    firstContactDate: daysAgoISO(365),
    lastVisitDate: daysAgoISO(1),
    totalVisits: 18,
    totalSpent: 52000,
    ltv: 68000,
    segment: 'vip',
    sentiment: 'positive',
    preferredChannel: 'whatsapp',
    preferredTime: 'morning',
    doNotContact: false,
    allergies: 'Lidocaina',
    medicalHistory: null,
    notes: 'Paciente VIP con seguimiento de multiples neoplasias cutaneas. Revision cada 3 meses. Siempre factura.',
    createdAt: daysAgoISO(365),
    updatedAt: iso(),
  },
  {
    id: 'mock-patient-5',
    clinicId: DEMO_CLINIC_ID,
    firstName: 'Laura Patricia',
    lastName: 'Morales',
    fullName: 'Laura Patricia Morales',
    phone: '+52 55 4123 0505',
    email: 'laura.morales@email.com',
    birthDate: '1990-05-14T00:00:00.000Z',
    gender: 'F',
    rfc: 'MOLP900514MDF',
    address: 'Coyoacan, CDMX',
    source: 'facebook',
    firstContactDate: daysAgoISO(150),
    lastVisitDate: daysAgoISO(90),
    totalVisits: 3,
    totalSpent: 4500,
    ltv: 4500,
    segment: 'churned',
    sentiment: 'negative',
    preferredChannel: 'facebook',
    preferredTime: 'afternoon',
    doNotContact: false,
    allergies: null,
    medicalHistory: null,
    notes: 'Se quejo del tiempo de espera. No contesta mensajes de seguimiento.',
    createdAt: daysAgoISO(150),
    updatedAt: iso(),
  },
  {
    id: 'mock-patient-6',
    clinicId: DEMO_CLINIC_ID,
    firstName: 'Fernando',
    lastName: 'Diaz Vega',
    fullName: 'Fernando Diaz Vega',
    phone: '+52 55 4123 0606',
    email: 'fdiazvega@email.com',
    birthDate: '2000-09-20T00:00:00.000Z',
    gender: 'M',
    rfc: 'DIVF000920HDF',
    address: 'Col. Narvarte, CDMX',
    source: 'walk_in',
    firstContactDate: daysAgoISO(3),
    lastVisitDate: daysAgoISO(3),
    totalVisits: 1,
    totalSpent: 1200,
    ltv: 1200,
    segment: 'new',
    sentiment: 'neutral',
    preferredChannel: 'whatsapp',
    preferredTime: 'morning',
    doNotContact: false,
    allergies: null,
    medicalHistory: null,
    notes: 'Primera visita. Consulta general por lesion en brazo. Pendiente seguimiento.',
    createdAt: daysAgoISO(3),
    updatedAt: iso(),
  },
  {
    id: 'mock-patient-7',
    clinicId: DEMO_CLINIC_ID,
    firstName: 'Isabel',
    lastName: 'Reyes Castillo',
    fullName: 'Isabel Reyes Castillo',
    phone: '+52 55 4123 0707',
    email: 'isabel.reyes@email.com',
    birthDate: '1983-12-03T00:00:00.000Z',
    gender: 'F',
    rfc: 'RECI831203MDF',
    address: 'Col. Polanco, CDMX',
    source: 'whatsapp',
    firstContactDate: daysAgoISO(60),
    lastVisitDate: daysAgoISO(7),
    totalVisits: 5,
    totalSpent: 7300,
    ltv: 11500,
    segment: 'active',
    sentiment: 'positive',
    preferredChannel: 'whatsapp',
    preferredTime: 'afternoon',
    doNotContact: false,
    allergies: 'Aines',
    medicalHistory: null,
    notes: 'Tratamiento de dermatitis atopica. Mejoria notable con inmunosupresores topicos.',
    createdAt: daysAgoISO(60),
    updatedAt: iso(),
  },
  {
    id: 'mock-patient-8',
    clinicId: DEMO_CLINIC_ID,
    firstName: 'Miguel Angel',
    lastName: 'Torres',
    fullName: 'Miguel Angel Torres',
    phone: '+52 55 4123 0808',
    email: 'matorres@email.com',
    birthDate: '1978-06-17T00:00:00.000Z',
    gender: 'M',
    rfc: 'TOMA780617HDF',
    address: 'Col. Escandon, CDMX',
    source: 'instagram',
    firstContactDate: daysAgoISO(130),
    lastVisitDate: daysAgoISO(75),
    totalVisits: 2,
    totalSpent: 3800,
    ltv: 3800,
    segment: 'churned',
    sentiment: 'neutral',
    preferredChannel: 'instagram',
    preferredTime: 'evening',
    doNotContact: false,
    allergies: null,
    medicalHistory: null,
    notes: 'Vino por consulta estetica y crioterapia. No continuo tratamiento. Candidato a campana de reactivacion.',
    createdAt: daysAgoISO(130),
    updatedAt: iso(),
  },
]

// ─── DOCTORS ───────────────────────────────────────────────

const MOCK_DOCTORS = [
  {
    id: 'mock-doctor-1',
    clinicId: DEMO_CLINIC_ID,
    name: 'Dr. Alejandro Ruiz',
    email: 'aruiz@clinicasanangel.mx',
    phone: '+52 55 9876 5432',
    specialty: 'Dermatologia',
    license: '12345678',
    color: '#1D9E75',
    isActive: true,
    workDays: '1,2,3,4,5',
    workStart: '09:00',
    workEnd: '18:00',
    slotMinutes: 30,
    createdAt: daysAgoISO(365),
    updatedAt: iso(),
  },
  {
    id: 'mock-doctor-2',
    clinicId: DEMO_CLINIC_ID,
    name: 'Dra. Carmen Vega',
    email: 'cvega@clinicasanangel.mx',
    phone: '+52 55 8765 4321',
    specialty: 'Dermatologia estetica',
    license: '87654321',
    color: '#534AB7',
    isActive: true,
    workDays: '2,3,4,5,6',
    workStart: '10:00',
    workEnd: '19:00',
    slotMinutes: 45,
    createdAt: daysAgoISO(365),
    updatedAt: iso(),
  },
]

// ─── SERVICES ──────────────────────────────────────────────

const MOCK_SERVICES = [
  {
    id: 'mock-svc-consulta-general',
    clinicId: DEMO_CLINIC_ID,
    name: 'Consulta general',
    description: 'Consulta dermatologica general incluyendo revision de piel y diagnostico.',
    duration: 30,
    price: 1200,
    category: 'Consulta',
    isActive: true,
    createdAt: daysAgoISO(365),
    updatedAt: iso(),
  },
  {
    id: 'mock-svc-revision-dermatologica',
    clinicId: DEMO_CLINIC_ID,
    name: 'Revision dermatologica',
    description: 'Revision completa de piel con dermatoscopia y documentacion fotografica.',
    duration: 45,
    price: 1500,
    category: 'Consulta',
    isActive: true,
    createdAt: daysAgoISO(365),
    updatedAt: iso(),
  },
  {
    id: 'mock-svc-tratamiento-laser',
    clinicId: DEMO_CLINIC_ID,
    name: 'Tratamiento laser',
    description: 'Sesion de terapia laser para lesiones cutaneas, manchas o rejuvenecimiento.',
    duration: 45,
    price: 2800,
    category: 'Procedimiento',
    isActive: true,
    createdAt: daysAgoISO(365),
    updatedAt: iso(),
  },
  {
    id: 'mock-svc-crioterapia',
    clinicId: DEMO_CLINIC_ID,
    name: 'Crioterapia',
    description: 'Tratamiento con nitrogeno liquido para lesiones benignas y premalignas.',
    duration: 30,
    price: 1800,
    category: 'Procedimiento',
    isActive: true,
    createdAt: daysAgoISO(365),
    updatedAt: iso(),
  },
  {
    id: 'mock-svc-biopsia',
    clinicId: DEMO_CLINIC_ID,
    name: 'Biopsia',
    description: 'Biopsia cutanea con estudio histopatologico e inmunohistoquimica si aplica.',
    duration: 60,
    price: 3500,
    category: 'Procedimiento',
    isActive: true,
    createdAt: daysAgoISO(365),
    updatedAt: iso(),
  },
  {
    id: 'mock-svc-consulta-estetica',
    clinicId: DEMO_CLINIC_ID,
    name: 'Consulta estetica',
    description: 'Valoracion estetica facial y corporal con plan de tratamiento personalizado.',
    duration: 30,
    price: 2000,
    category: 'Estetica',
    isActive: true,
    createdAt: daysAgoISO(365),
    updatedAt: iso(),
  },
]

// ─── CONVERSATIONS (at least 6, with messages) ─────────────

const MOCK_CONVERSATIONS = [
  // 1. Maria Garcia Lopez — scheduling follow-up for melanoma
  {
    id: 'mock-conv-1',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-1',
    channel: 'whatsapp',
    status: 'active',
    currentAgent: 'reception',
    routedToHuman: false,
    intent: 'schedule',
    sentiment: 'positive',
    isMock: true,
    lastMessageAt: daysAgoISO(2, 9, 21),
    createdAt: daysAgoISO(2, 9, 15),
    updatedAt: daysAgoISO(2, 9, 21),
    patient: { fullName: 'Maria Garcia Lopez', phone: '+52 55 4123 0101' },
    messages: [
      {
        id: 'mock-msg-1-1',
        direction: 'inbound',
        channel: 'whatsapp',
        senderType: 'patient',
        content: 'Hola, necesito agendar mi cita de seguimiento para la revision del melanoma',
        agentName: null,
        aiGenerated: false,
        createdAt: daysAgoISO(2, 9, 15),
      },
      {
        id: 'mock-msg-1-2',
        direction: 'outbound',
        channel: 'whatsapp',
        senderType: 'agent',
        content: 'Hola Maria! Claro, con gusto te ayudo a agendar tu cita de seguimiento. El Dr. Ruiz tiene disponibilidad este viernes a las 10:00 AM. Te queda bien?',
        agentName: 'reception',
        aiGenerated: true,
        createdAt: daysAgoISO(2, 9, 16),
      },
      {
        id: 'mock-msg-1-3',
        direction: 'inbound',
        channel: 'whatsapp',
        senderType: 'patient',
        content: 'Si, perfecto! Confirmo para el viernes a las 10',
        agentName: null,
        aiGenerated: false,
        createdAt: daysAgoISO(2, 9, 20),
      },
      {
        id: 'mock-msg-1-4',
        direction: 'outbound',
        channel: 'whatsapp',
        senderType: 'agent',
        content: 'Excelente! Tu cita queda confirmada para este viernes a las 10:00 AM con el Dr. Ruiz. Te enviamos un recordatorio 24 horas antes. Recuerda traer tus estudios de laboratorio. Nos vemos pronto!',
        agentName: 'reception',
        aiGenerated: true,
        createdAt: daysAgoISO(2, 9, 21),
      },
    ],
  },

  // 2. Ana Sofia Hernandez — inquiry about aesthetic consultation
  {
    id: 'mock-conv-2',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-3',
    channel: 'instagram',
    status: 'active',
    currentAgent: 'reception',
    routedToHuman: false,
    intent: 'inquiry',
    sentiment: 'neutral',
    isMock: true,
    lastMessageAt: daysAgoISO(1, 14, 45),
    createdAt: daysAgoISO(1, 14, 30),
    updatedAt: daysAgoISO(1, 14, 45),
    patient: { fullName: 'Ana Sofia Hernandez', phone: '+52 55 4123 0303' },
    messages: [
      {
        id: 'mock-msg-2-1',
        direction: 'inbound',
        channel: 'instagram',
        senderType: 'patient',
        content: 'Hola, cuanto cuesta una consulta estetica? Tengo manchas en la cara que me gustaria tratar',
        agentName: null,
        aiGenerated: false,
        createdAt: daysAgoISO(1, 14, 30),
      },
      {
        id: 'mock-msg-2-2',
        direction: 'outbound',
        channel: 'instagram',
        senderType: 'agent',
        content: 'Hola Ana! La consulta estetica tiene un costo de $2,000 MXN. En ella la Dra. Vega evaluara las manchas y te recomendara el mejor tratamiento. Quieres agendar una cita?',
        agentName: 'reception',
        aiGenerated: true,
        createdAt: daysAgoISO(1, 14, 31),
      },
      {
        id: 'mock-msg-2-3',
        direction: 'inbound',
        channel: 'instagram',
        senderType: 'patient',
        content: 'Dejame pensarlo y les aviso, gracias!',
        agentName: null,
        aiGenerated: false,
        createdAt: daysAgoISO(1, 14, 45),
      },
    ],
  },

  // 3. Laura Patricia Morales — complaint, routed to human
  {
    id: 'mock-conv-3',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-5',
    channel: 'messenger',
    status: 'closed',
    currentAgent: 'reception',
    routedToHuman: true,
    intent: 'complaint',
    sentiment: 'negative',
    isMock: true,
    lastMessageAt: daysAgoISO(3, 11, 50),
    createdAt: daysAgoISO(3, 11, 40),
    updatedAt: daysAgoISO(3, 11, 50),
    patient: { fullName: 'Laura Patricia Morales', phone: '+52 55 4123 0505' },
    messages: [
      {
        id: 'mock-msg-3-1',
        direction: 'inbound',
        channel: 'messenger',
        senderType: 'patient',
        content: 'Estoy muy inconforme. Llevo 40 minutos esperando y nadie me atiende.',
        agentName: null,
        aiGenerated: false,
        createdAt: daysAgoISO(3, 11, 40),
      },
      {
        id: 'mock-msg-3-2',
        direction: 'outbound',
        channel: 'messenger',
        senderType: 'agent',
        content: 'Laura, lamento mucho la espera. Voy a transferirte con nuestro equipo para atenderte de inmediato.',
        agentName: 'reception',
        aiGenerated: true,
        createdAt: daysAgoISO(3, 11, 41),
      },
      {
        id: 'mock-msg-3-3',
        direction: 'outbound',
        channel: 'messenger',
        senderType: 'system',
        content: 'Conversacion transferida a atencion humana.',
        agentName: null,
        aiGenerated: false,
        createdAt: daysAgoISO(3, 11, 42),
      },
      {
        id: 'mock-msg-3-4',
        direction: 'outbound',
        channel: 'messenger',
        senderType: 'staff',
        content: 'Hola Laura, disculpa la demora. Vamos a atenderte ahorita mismo. El doctor ya esta libre.',
        agentName: null,
        aiGenerated: false,
        createdAt: daysAgoISO(3, 11, 50),
      },
    ],
  },

  // 4. Fernando Diaz Vega — rescheduling today
  {
    id: 'mock-conv-4',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-6',
    channel: 'whatsapp',
    status: 'active',
    currentAgent: 'reception',
    routedToHuman: false,
    intent: 'reschedule',
    sentiment: 'neutral',
    isMock: true,
    lastMessageAt: todayISO(8, 15),
    createdAt: todayISO(8, 10),
    updatedAt: todayISO(8, 15),
    patient: { fullName: 'Fernando Diaz Vega', phone: '+52 55 4123 0606' },
    messages: [
      {
        id: 'mock-msg-4-1',
        direction: 'inbound',
        channel: 'whatsapp',
        senderType: 'patient',
        content: 'Buenos dias, mi cita de manana la puedo cambiar para el jueves?',
        agentName: null,
        aiGenerated: false,
        createdAt: todayISO(8, 10),
      },
      {
        id: 'mock-msg-4-2',
        direction: 'outbound',
        channel: 'whatsapp',
        senderType: 'agent',
        content: 'Hola Fernando! Claro, la Dra. Vega tiene disponibilidad el jueves a las 11:00 AM. Confirmo el cambio?',
        agentName: 'reception',
        aiGenerated: true,
        createdAt: todayISO(8, 11),
      },
      {
        id: 'mock-msg-4-3',
        direction: 'inbound',
        channel: 'whatsapp',
        senderType: 'patient',
        content: 'Si, confirmo. Gracias!',
        agentName: null,
        aiGenerated: false,
        createdAt: todayISO(8, 15),
      },
    ],
  },

  // 5. Carlos Mendoza Rivera — scheduling aesthetic consult (closed)
  {
    id: 'mock-conv-5',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-2',
    channel: 'whatsapp',
    status: 'closed',
    currentAgent: 'reception',
    routedToHuman: false,
    intent: 'schedule',
    sentiment: 'positive',
    isMock: true,
    lastMessageAt: daysAgoISO(7, 10, 6),
    createdAt: daysAgoISO(7, 10, 0),
    updatedAt: daysAgoISO(7, 10, 6),
    patient: { fullName: 'Carlos Mendoza Rivera', phone: '+52 55 4123 0202' },
    messages: [
      {
        id: 'mock-msg-5-1',
        direction: 'inbound',
        channel: 'whatsapp',
        senderType: 'patient',
        content: 'Quiero agendar una consulta estetica con la Dra. Vega',
        agentName: null,
        aiGenerated: false,
        createdAt: daysAgoISO(7, 10, 0),
      },
      {
        id: 'mock-msg-5-2',
        direction: 'outbound',
        channel: 'whatsapp',
        senderType: 'agent',
        content: 'Hola Carlos! La Dra. Vega tiene espacio este miercoles a las 1:00 PM para consulta estetica. Te funciona?',
        agentName: 'reception',
        aiGenerated: true,
        createdAt: daysAgoISO(7, 10, 1),
      },
      {
        id: 'mock-msg-5-3',
        direction: 'inbound',
        channel: 'whatsapp',
        senderType: 'patient',
        content: 'Perfecto, ahi estare',
        agentName: null,
        aiGenerated: false,
        createdAt: daysAgoISO(7, 10, 5),
      },
      {
        id: 'mock-msg-5-4',
        direction: 'outbound',
        channel: 'whatsapp',
        senderType: 'agent',
        content: 'Listo! Cita confirmada. Te esperamos!',
        agentName: 'reception',
        aiGenerated: true,
        createdAt: daysAgoISO(7, 10, 6),
      },
    ],
  },

  // 6. Miguel Angel Torres — inquiry about promotions
  {
    id: 'mock-conv-6',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-8',
    channel: 'instagram',
    status: 'active',
    currentAgent: 'marketing',
    routedToHuman: false,
    intent: 'inquiry',
    sentiment: 'neutral',
    isMock: true,
    lastMessageAt: todayISO(16, 31),
    createdAt: todayISO(16, 30),
    updatedAt: todayISO(16, 31),
    patient: { fullName: 'Miguel Angel Torres', phone: '+52 55 4123 0808' },
    messages: [
      {
        id: 'mock-msg-6-1',
        direction: 'inbound',
        channel: 'instagram',
        senderType: 'patient',
        content: 'Tienen promocion para tratamiento de manchas?',
        agentName: null,
        aiGenerated: false,
        createdAt: todayISO(16, 30),
      },
      {
        id: 'mock-msg-6-2',
        direction: 'outbound',
        channel: 'instagram',
        senderType: 'agent',
        content: 'Hola Miguel! Actualmente tenemos un 15% de descuento en paquetes de tratamiento laser para manchas. El paquete incluye 3 sesiones. Te interesa mas informacion?',
        agentName: 'marketing',
        aiGenerated: true,
        createdAt: todayISO(16, 31),
      },
    ],
  },

  // 7. Roberto Jimenez Salazar — billing question, handed off
  {
    id: 'mock-conv-7',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-4',
    channel: 'whatsapp',
    status: 'handed_off',
    currentAgent: 'billing',
    routedToHuman: true,
    intent: 'billing',
    sentiment: 'neutral',
    isMock: true,
    lastMessageAt: daysAgoISO(1, 13, 10),
    createdAt: daysAgoISO(1, 12, 50),
    updatedAt: daysAgoISO(1, 13, 10),
    patient: { fullName: 'Roberto Jimenez Salazar', phone: '+52 55 4123 0404' },
    messages: [
      {
        id: 'mock-msg-7-1',
        direction: 'inbound',
        channel: 'whatsapp',
        senderType: 'patient',
        content: 'Buenas tardes, necesito una factura de mi ultima consulta. Me la pueden enviar?',
        agentName: null,
        aiGenerated: false,
        createdAt: daysAgoISO(1, 12, 50),
      },
      {
        id: 'mock-msg-7-2',
        direction: 'outbound',
        channel: 'whatsapp',
        senderType: 'agent',
        content: 'Hola Roberto! Claro, con gusto te ayudamos con tu factura. Me confirmas tu RFC para generarla? Tenemos registrado JISR620130HDF.',
        agentName: 'billing',
        aiGenerated: true,
        createdAt: daysAgoISO(1, 12, 51),
      },
      {
        id: 'mock-msg-7-3',
        direction: 'inbound',
        channel: 'whatsapp',
        senderType: 'patient',
        content: 'Si, ese es correcto. Pero tambien quiero que incluya el uso de CFDI como G03 deduccion de gastos medicos, no G01. Es posible?',
        agentName: null,
        aiGenerated: false,
        createdAt: daysAgoISO(1, 13, 5),
      },
      {
        id: 'mock-msg-7-4',
        direction: 'outbound',
        channel: 'whatsapp',
        senderType: 'agent',
        content: 'Roberto, voy a transferirte con nuestro equipo de facturacion para que te generen la factura con el uso de CFDI correcto. Un momento por favor.',
        agentName: 'billing',
        aiGenerated: true,
        createdAt: daysAgoISO(1, 13, 6),
      },
      {
        id: 'mock-msg-7-5',
        direction: 'outbound',
        channel: 'whatsapp',
        senderType: 'system',
        content: 'Conversacion transferida al equipo de facturacion.',
        agentName: null,
        aiGenerated: false,
        createdAt: daysAgoISO(1, 13, 7),
      },
      {
        id: 'mock-msg-7-6',
        direction: 'outbound',
        channel: 'whatsapp',
        senderType: 'staff',
        content: 'Hola Roberto, soy Daniela del area de facturacion. Voy a generar tu factura con uso CFDI G03. Te la enviamos en los proximos 15 minutos por este medio.',
        agentName: null,
        aiGenerated: false,
        createdAt: daysAgoISO(1, 13, 10),
      },
    ],
  },

  // 8. Isabel Reyes Castillo — appointment reminder and confirmation
  {
    id: 'mock-conv-8',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-7',
    channel: 'whatsapp',
    status: 'active',
    currentAgent: 'reception',
    routedToHuman: false,
    intent: 'schedule',
    sentiment: 'positive',
    isMock: true,
    lastMessageAt: todayISO(7, 52),
    createdAt: todayISO(7, 50),
    updatedAt: todayISO(7, 52),
    patient: { fullName: 'Isabel Reyes Castillo', phone: '+52 55 4123 0707' },
    messages: [
      {
        id: 'mock-msg-8-1',
        direction: 'inbound',
        channel: 'whatsapp',
        senderType: 'patient',
        content: 'Buenos dias, a que hora me toca hoy?',
        agentName: null,
        aiGenerated: false,
        createdAt: todayISO(7, 50),
      },
      {
        id: 'mock-msg-8-2',
        direction: 'outbound',
        channel: 'whatsapp',
        senderType: 'agent',
        content: 'Buenos dias Isabel! Tu cita es hoy a las 13:30 con la Dra. Vega para revision de dermatitis. Recuerda traer la crema que te receto la ultima vez para evaluarla. Te esperamos!',
        agentName: 'reception',
        aiGenerated: true,
        createdAt: todayISO(7, 51),
      },
      {
        id: 'mock-msg-8-3',
        direction: 'inbound',
        channel: 'whatsapp',
        senderType: 'patient',
        content: 'Perfecto, ahi estare. Gracias!',
        agentName: null,
        aiGenerated: false,
        createdAt: todayISO(7, 52),
      },
    ],
  },
]

// ─── APPOINTMENTS (with today's dates) ─────────────────────

const MOCK_APPOINTMENTS = [
  {
    id: 'mock-apt-1',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-1',
    doctorId: 'mock-doctor-1',
    serviceId: 'mock-svc-revision-dermatologica',
    date: todayISO(0, 0),
    startTime: '10:00',
    endTime: '10:45',
    status: 'confirmed',
    channel: 'whatsapp',
    preConsultCompleted: false,
    preConsultData: null,
    notes: 'Seguimiento melanoma. Traer estudios de laboratorio.',
    cancelReason: null,
    createdAt: daysAgoISO(2),
    updatedAt: iso(),
    patient: { fullName: 'Maria Garcia Lopez', phone: '+52 55 4123 0101' },
    doctor: { name: 'Dr. Alejandro Ruiz', color: '#1D9E75' },
    service: { name: 'Revision dermatologica', duration: 45 },
  },
  {
    id: 'mock-apt-2',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-4',
    doctorId: 'mock-doctor-1',
    serviceId: 'mock-svc-consulta-general',
    date: todayISO(0, 0),
    startTime: '11:00',
    endTime: '11:30',
    status: 'scheduled',
    channel: 'whatsapp',
    preConsultCompleted: false,
    preConsultData: null,
    notes: 'Revision trimestral. Siempre puntual.',
    cancelReason: null,
    createdAt: daysAgoISO(3),
    updatedAt: iso(),
    patient: { fullName: 'Roberto Jimenez Salazar', phone: '+52 55 4123 0404' },
    doctor: { name: 'Dr. Alejandro Ruiz', color: '#1D9E75' },
    service: { name: 'Consulta general', duration: 30 },
  },
  {
    id: 'mock-apt-3',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-6',
    doctorId: 'mock-doctor-2',
    serviceId: 'mock-svc-consulta-general',
    date: todayISO(0, 0),
    startTime: '10:00',
    endTime: '10:30',
    status: 'scheduled',
    channel: 'walk_in',
    preConsultCompleted: true,
    preConsultData: '{"motivo":"Seguimiento post-biopsia","sintomas":"Lesion en brazo derecho","medicamentos":"Ninguno"}',
    notes: 'Segunda consulta post-biopsia.',
    cancelReason: null,
    createdAt: daysAgoISO(3),
    updatedAt: iso(),
    patient: { fullName: 'Fernando Diaz Vega', phone: '+52 55 4123 0606' },
    doctor: { name: 'Dra. Carmen Vega', color: '#534AB7' },
    service: { name: 'Consulta general', duration: 30 },
  },
  {
    id: 'mock-apt-4',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-7',
    doctorId: 'mock-doctor-2',
    serviceId: 'mock-svc-consulta-general',
    date: todayISO(0, 0),
    startTime: '13:30',
    endTime: '14:00',
    status: 'confirmed',
    channel: 'whatsapp',
    preConsultCompleted: false,
    preConsultData: null,
    notes: 'Control de dermatitis atopica. Evaluar respuesta a inmunosupresores topicos.',
    cancelReason: null,
    createdAt: daysAgoISO(1),
    updatedAt: iso(),
    patient: { fullName: 'Isabel Reyes Castillo', phone: '+52 55 4123 0707' },
    doctor: { name: 'Dra. Carmen Vega', color: '#534AB7' },
    service: { name: 'Consulta general', duration: 30 },
  },
  {
    id: 'mock-apt-5',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-2',
    doctorId: 'mock-doctor-1',
    serviceId: 'mock-svc-revision-dermatologica',
    date: daysAgoISO(1),
    startTime: '16:00',
    endTime: '16:45',
    status: 'completed',
    channel: 'whatsapp',
    preConsultCompleted: true,
    preConsultData: null,
    notes: 'Revision de acne. Buen progreso con tratamiento.',
    cancelReason: null,
    createdAt: daysAgoISO(7),
    updatedAt: daysAgoISO(1),
    patient: { fullName: 'Carlos Mendoza Rivera', phone: '+52 55 4123 0202' },
    doctor: { name: 'Dr. Alejandro Ruiz', color: '#1D9E75' },
    service: { name: 'Revision dermatologica', duration: 45 },
  },
  {
    id: 'mock-apt-6',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-1',
    doctorId: 'mock-doctor-1',
    serviceId: 'mock-svc-tratamiento-laser',
    date: daysAgoISO(2),
    startTime: '09:00',
    endTime: '09:45',
    status: 'completed',
    channel: 'whatsapp',
    preConsultCompleted: true,
    preConsultData: null,
    notes: 'Sesion laser #3. Tolerancia adecuada.',
    cancelReason: null,
    createdAt: daysAgoISO(10),
    updatedAt: daysAgoISO(2),
    patient: { fullName: 'Maria Garcia Lopez', phone: '+52 55 4123 0101' },
    doctor: { name: 'Dr. Alejandro Ruiz', color: '#1D9E75' },
    service: { name: 'Tratamiento laser', duration: 45 },
  },
  {
    id: 'mock-apt-7',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-5',
    doctorId: 'mock-doctor-1',
    serviceId: 'mock-svc-consulta-estetica',
    date: daysAgoISO(3),
    startTime: '12:00',
    endTime: '12:30',
    status: 'cancelled',
    channel: 'facebook',
    preConsultCompleted: false,
    preConsultData: null,
    notes: null,
    cancelReason: 'La paciente cancelo por conflicto de horario. No reprogramo.',
    createdAt: daysAgoISO(7),
    updatedAt: daysAgoISO(3),
    patient: { fullName: 'Laura Patricia Morales', phone: '+52 55 4123 0505' },
    doctor: { name: 'Dr. Alejandro Ruiz', color: '#1D9E75' },
    service: { name: 'Consulta estetica', duration: 30 },
  },
  {
    id: 'mock-apt-8',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-3',
    doctorId: 'mock-doctor-2',
    serviceId: 'mock-svc-consulta-estetica',
    date: daysAgoISO(4),
    startTime: '11:00',
    endTime: '11:30',
    status: 'no_show',
    channel: 'instagram',
    preConsultCompleted: false,
    preConsultData: null,
    notes: 'No se presento. Se intento contactar sin exito.',
    cancelReason: null,
    createdAt: daysAgoISO(8),
    updatedAt: daysAgoISO(4),
    patient: { fullName: 'Ana Sofia Hernandez', phone: '+52 55 4123 0303' },
    doctor: { name: 'Dra. Carmen Vega', color: '#534AB7' },
    service: { name: 'Consulta estetica', duration: 30 },
  },
  {
    id: 'mock-apt-9',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-4',
    doctorId: 'mock-doctor-1',
    serviceId: 'mock-svc-biopsia',
    date: daysAgoISO(5),
    startTime: '09:00',
    endTime: '10:00',
    status: 'completed',
    channel: 'whatsapp',
    preConsultCompleted: true,
    preConsultData: null,
    notes: 'Biopsia de lesion sospechosa en espalda. Enviada a patologia.',
    cancelReason: null,
    createdAt: daysAgoISO(10),
    updatedAt: daysAgoISO(5),
    patient: { fullName: 'Roberto Jimenez Salazar', phone: '+52 55 4123 0404' },
    doctor: { name: 'Dr. Alejandro Ruiz', color: '#1D9E75' },
    service: { name: 'Biopsia', duration: 60 },
  },
  {
    id: 'mock-apt-10',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-8',
    doctorId: 'mock-doctor-2',
    serviceId: 'mock-svc-crioterapia',
    date: daysAgoISO(5),
    startTime: '15:00',
    endTime: '15:30',
    status: 'cancelled',
    channel: 'instagram',
    preConsultCompleted: false,
    preConsultData: null,
    notes: null,
    cancelReason: 'El paciente no confirmo asistencia. Se cancelo automaticamente.',
    createdAt: daysAgoISO(10),
    updatedAt: daysAgoISO(5),
    patient: { fullName: 'Miguel Angel Torres', phone: '+52 55 4123 0808' },
    doctor: { name: 'Dra. Carmen Vega', color: '#534AB7' },
    service: { name: 'Crioterapia', duration: 30 },
  },
  {
    id: 'mock-apt-11',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-7',
    doctorId: 'mock-doctor-1',
    serviceId: 'mock-svc-revision-dermatologica',
    date: tomorrowISO(0, 0),
    startTime: '09:30',
    endTime: '10:15',
    status: 'confirmed',
    channel: 'whatsapp',
    preConsultCompleted: false,
    preConsultData: null,
    notes: 'Control de dermatitis. Evaluar respuesta a inmunosupresores.',
    cancelReason: null,
    createdAt: daysAgoISO(1),
    updatedAt: iso(),
    patient: { fullName: 'Isabel Reyes Castillo', phone: '+52 55 4123 0707' },
    doctor: { name: 'Dr. Alejandro Ruiz', color: '#1D9E75' },
    service: { name: 'Revision dermatologica', duration: 45 },
  },
  {
    id: 'mock-apt-12',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-2',
    doctorId: 'mock-doctor-2',
    serviceId: 'mock-svc-consulta-estetica',
    date: daysAgoISO(6),
    startTime: '13:00',
    endTime: '13:30',
    status: 'completed',
    channel: 'whatsapp',
    preConsultCompleted: true,
    preConsultData: null,
    notes: 'Consulta estetica facial. Interes en peeling quimico.',
    cancelReason: null,
    createdAt: daysAgoISO(10),
    updatedAt: daysAgoISO(6),
    patient: { fullName: 'Carlos Mendoza Rivera', phone: '+52 55 4123 0202' },
    doctor: { name: 'Dra. Carmen Vega', color: '#534AB7' },
    service: { name: 'Consulta estetica', duration: 30 },
  },
]

// ─── INVOICES ──────────────────────────────────────────────

const MOCK_INVOICES = [
  {
    id: 'mock-inv-1',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-1',
    appointmentId: 'mock-apt-6',
    cfdiUuid: 'A1B2C3D4-E5F6-7890-ABCD-1234567890AB',
    cfdiVersion: '4.0',
    serie: 'A',
    folio: '001',
    fechaTimbrado: daysAgoISO(2, 9, 55),
    subtotal: 2800,
    iva: 448,
    total: 3248,
    currency: 'MXN',
    formaPago: '03',
    metodoPago: 'PUE',
    tipoComprobante: 'I',
    usoCFDI: 'G01',
    concepto: 'Tratamiento laser',
    status: 'timbrada',
    paymentStatus: 'paid',
    paidAt: daysAgoISO(2, 10, 0),
    facturamaId: 'fac-001',
    pdfUrl: null,
    xmlUrl: null,
    errorMessage: null,
    createdAt: daysAgoISO(2),
    updatedAt: daysAgoISO(2),
    patient: { fullName: 'Maria Garcia Lopez', rfc: 'GALM880315MDF' },
  },
  {
    id: 'mock-inv-2',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-2',
    appointmentId: 'mock-apt-5',
    cfdiUuid: 'B2C3D4E5-F6A7-8901-BCDE-2345678901BC',
    cfdiVersion: '4.0',
    serie: 'A',
    folio: '002',
    fechaTimbrado: daysAgoISO(1, 16, 50),
    subtotal: 1500,
    iva: 240,
    total: 1740,
    currency: 'MXN',
    formaPago: '03',
    metodoPago: 'PUE',
    tipoComprobante: 'I',
    usoCFDI: 'G01',
    concepto: 'Revision dermatologica',
    status: 'timbrada',
    paymentStatus: 'paid',
    paidAt: daysAgoISO(1, 17, 0),
    facturamaId: 'fac-002',
    pdfUrl: null,
    xmlUrl: null,
    errorMessage: null,
    createdAt: daysAgoISO(1),
    updatedAt: daysAgoISO(1),
    patient: { fullName: 'Carlos Mendoza Rivera', rfc: 'MERC750722HDF' },
  },
  {
    id: 'mock-inv-3',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-4',
    appointmentId: 'mock-apt-9',
    cfdiUuid: 'C3D4E5F6-A7B8-9012-CDEF-3456789012CD',
    cfdiVersion: '4.0',
    serie: 'A',
    folio: '003',
    fechaTimbrado: daysAgoISO(5, 10, 0),
    subtotal: 3500,
    iva: 560,
    total: 4060,
    currency: 'MXN',
    formaPago: '04',
    metodoPago: 'PUE',
    tipoComprobante: 'I',
    usoCFDI: 'G01',
    concepto: 'Biopsia',
    status: 'timbrada',
    paymentStatus: 'paid',
    paidAt: daysAgoISO(5, 10, 30),
    facturamaId: 'fac-003',
    pdfUrl: null,
    xmlUrl: null,
    errorMessage: null,
    createdAt: daysAgoISO(5),
    updatedAt: daysAgoISO(5),
    patient: { fullName: 'Roberto Jimenez Salazar', rfc: 'JISR620130HDF' },
  },
  {
    id: 'mock-inv-4',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-7',
    appointmentId: 'mock-apt-4',
    cfdiUuid: null,
    cfdiVersion: '4.0',
    serie: null,
    folio: null,
    fechaTimbrado: null,
    subtotal: 1200,
    iva: 192,
    total: 1392,
    currency: 'MXN',
    formaPago: '03',
    metodoPago: 'PUE',
    tipoComprobante: 'I',
    usoCFDI: 'G01',
    concepto: 'Consulta general',
    status: 'pending',
    paymentStatus: 'unpaid',
    paidAt: null,
    facturamaId: null,
    pdfUrl: null,
    xmlUrl: null,
    errorMessage: null,
    createdAt: daysAgoISO(1),
    updatedAt: iso(),
    patient: { fullName: 'Isabel Reyes Castillo', rfc: 'RECI831203MDF' },
  },
  {
    id: 'mock-inv-5',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-1',
    appointmentId: null,
    cfdiUuid: null,
    cfdiVersion: '4.0',
    serie: null,
    folio: null,
    fechaTimbrado: null,
    subtotal: 2000,
    iva: 320,
    total: 2320,
    currency: 'MXN',
    formaPago: '03',
    metodoPago: 'PUE',
    tipoComprobante: 'I',
    usoCFDI: 'G03',
    concepto: 'Consulta estetica',
    status: 'pending',
    paymentStatus: 'unpaid',
    paidAt: null,
    facturamaId: null,
    pdfUrl: null,
    xmlUrl: null,
    errorMessage: null,
    createdAt: iso(2),
    updatedAt: iso(),
    patient: { fullName: 'Maria Garcia Lopez', rfc: 'GALM880315MDF' },
  },
  {
    id: 'mock-inv-6',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-5',
    appointmentId: 'mock-apt-7',
    cfdiUuid: null,
    cfdiVersion: '4.0',
    serie: null,
    folio: null,
    fechaTimbrado: null,
    subtotal: 600,
    iva: 96,
    total: 696,
    currency: 'MXN',
    formaPago: '03',
    metodoPago: 'PUE',
    tipoComprobante: 'I',
    usoCFDI: 'G01',
    concepto: 'Consulta estetica (cancelada)',
    status: 'cancelled',
    paymentStatus: 'unpaid',
    paidAt: null,
    facturamaId: null,
    pdfUrl: null,
    xmlUrl: null,
    errorMessage: null,
    createdAt: daysAgoISO(3),
    updatedAt: daysAgoISO(3),
    patient: { fullName: 'Laura Patricia Morales', rfc: 'MOLP900514MDF' },
  },
  {
    id: 'mock-inv-7',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-6',
    appointmentId: null,
    cfdiUuid: null,
    cfdiVersion: '4.0',
    serie: null,
    folio: null,
    fechaTimbrado: null,
    subtotal: 5200,
    iva: 832,
    total: 6032,
    currency: 'MXN',
    formaPago: '28',
    metodoPago: 'PUE',
    tipoComprobante: 'I',
    usoCFDI: 'G01',
    concepto: 'Paquete dermatologico integral',
    status: 'error',
    paymentStatus: 'unpaid',
    paidAt: null,
    facturamaId: null,
    pdfUrl: null,
    xmlUrl: null,
    errorMessage: 'Error al timbrar: RFC del receptor no valido segun catalogo SAT.',
    createdAt: daysAgoISO(2),
    updatedAt: daysAgoISO(2),
    patient: { fullName: 'Fernando Diaz Vega', rfc: 'DIVF000920HDF' },
  },
  {
    id: 'mock-inv-8',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-4',
    appointmentId: null,
    cfdiUuid: 'D4E5F6A7-B8C9-0123-DEFA-4567890123DE',
    cfdiVersion: '4.0',
    serie: 'A',
    folio: '004',
    fechaTimbrado: daysAgoISO(8, 10, 0),
    subtotal: 1800,
    iva: 288,
    total: 2088,
    currency: 'MXN',
    formaPago: '03',
    metodoPago: 'PUE',
    tipoComprobante: 'I',
    usoCFDI: 'G01',
    concepto: 'Crioterapia',
    status: 'timbrada',
    paymentStatus: 'paid',
    paidAt: daysAgoISO(8, 10, 30),
    facturamaId: 'fac-004',
    pdfUrl: null,
    xmlUrl: null,
    errorMessage: null,
    createdAt: daysAgoISO(8),
    updatedAt: daysAgoISO(8),
    patient: { fullName: 'Roberto Jimenez Salazar', rfc: 'JISR620130HDF' },
  },
  {
    id: 'mock-inv-9',
    clinicId: DEMO_CLINIC_ID,
    patientId: 'mock-patient-2',
    appointmentId: 'mock-apt-12',
    cfdiUuid: 'E5F6A7B8-C9D0-1234-EFAB-5678901234EF',
    cfdiVersion: '4.0',
    serie: 'A',
    folio: '005',
    fechaTimbrado: daysAgoISO(6, 14, 0),
    subtotal: 2000,
    iva: 320,
    total: 2320,
    currency: 'MXN',
    formaPago: '03',
    metodoPago: 'PUE',
    tipoComprobante: 'I',
    usoCFDI: 'G01',
    concepto: 'Consulta estetica',
    status: 'timbrada',
    paymentStatus: 'paid',
    paidAt: daysAgoISO(6, 14, 30),
    facturamaId: 'fac-005',
    pdfUrl: null,
    xmlUrl: null,
    errorMessage: null,
    createdAt: daysAgoISO(6),
    updatedAt: daysAgoISO(6),
    patient: { fullName: 'Carlos Mendoza Rivera', rfc: 'MERC750722HDF' },
  },
]

// ─── FEATURE FLAGS ─────────────────────────────────────────

const MOCK_FEATURE_FLAGS = [
  { id: 'mock-ff-1', clinicId: DEMO_CLINIC_ID, module: 'desk', feature: 'auto-reply', state: 'assist', config: null, createdAt: daysAgoISO(365), updatedAt: iso() },
  { id: 'mock-ff-2', clinicId: DEMO_CLINIC_ID, module: 'desk', feature: 'appointment', state: 'assist', config: null, createdAt: daysAgoISO(365), updatedAt: iso() },
  { id: 'mock-ff-2b', clinicId: DEMO_CLINIC_ID, module: 'desk', feature: 'reminders', state: 'on', config: null, createdAt: daysAgoISO(365), updatedAt: iso() },
  { id: 'mock-ff-3', clinicId: DEMO_CLINIC_ID, module: 'flow', feature: 'soap', state: 'assist', config: null, createdAt: daysAgoISO(365), updatedAt: iso() },
  { id: 'mock-ff-4', clinicId: DEMO_CLINIC_ID, module: 'flow', feature: 'preconsulta', state: 'on', config: null, createdAt: daysAgoISO(365), updatedAt: iso() },
  { id: 'mock-ff-5', clinicId: DEMO_CLINIC_ID, module: 'bill', feature: 'auto-cfdi', state: 'assist', config: null, createdAt: daysAgoISO(365), updatedAt: iso() },
  { id: 'mock-ff-6', clinicId: DEMO_CLINIC_ID, module: 'bill', feature: 'reminders', state: 'off', config: null, createdAt: daysAgoISO(365), updatedAt: iso() },
  { id: 'mock-ff-7', clinicId: DEMO_CLINIC_ID, module: 'grow', feature: 'reactivation', state: 'assist', config: null, createdAt: daysAgoISO(365), updatedAt: iso() },
  { id: 'mock-ff-8', clinicId: DEMO_CLINIC_ID, module: 'grow', feature: 'segments', state: 'on', config: null, createdAt: daysAgoISO(365), updatedAt: iso() },
  { id: 'mock-ff-9', clinicId: DEMO_CLINIC_ID, module: 'sight', feature: 'alerts', state: 'on', config: null, createdAt: daysAgoISO(365), updatedAt: iso() },
  { id: 'mock-ff-10', clinicId: DEMO_CLINIC_ID, module: 'sight', feature: 'reports', state: 'assist', config: null, createdAt: daysAgoISO(365), updatedAt: iso() },
  { id: 'mock-ff-11', clinicId: DEMO_CLINIC_ID, module: 'hub', feature: 'scheduling', state: 'off', config: null, createdAt: daysAgoISO(365), updatedAt: iso() },
  { id: 'mock-ff-12', clinicId: DEMO_CLINIC_ID, module: 'hub', feature: 'inventory', state: 'off', config: null, createdAt: daysAgoISO(365), updatedAt: iso() },
]

// ─────────────────────────────────────────────────────────────
// PUBLIC EXPORTED FUNCTIONS
// Each returns data matching exactly what the Prisma queries
// in the corresponding API route would return.
// ─────────────────────────────────────────────────────────────

/**
 * Returns mock conversations with included patient and messages,
 * matching the shape from:
 *   db.conversation.findMany({ include: { patient, messages } })
 */
export function getMockConversations(_clinicId: string) {
  // Return a fresh copy sorted by lastMessageAt desc
  return [...MOCK_CONVERSATIONS].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  )
}

/**
 * Returns a mock clinic object matching the shape from:
 *   db.clinic.findUnique({ include: { _count: { select: { doctors, patients } } } })
 * Then mapped as the /api/clinic route does.
 */
export function getMockClinic(_clinicId: string) {
  return {
    id: DEMO_CLINIC_ID,
    name: 'Clinica San Angel',
    slug: 'clinica-san-angel-demo',
    email: 'contacto@clinicasanangel.mx',
    phone: '+52 55 1234 5678',
    mode: 'clinic',
    rfc: 'CSA230515ABC',
    regimenFiscal: '601',
    plan: 'pro',
    address: 'Av. Insurgentes Sur 1234, Col. San Angel',
    city: 'Ciudad de Mexico',
    state: 'CDMX',
    country: 'MX',
    primaryColor: '#1D9E75',
    personaName: 'Asistente del Dr. Ruiz',
    logoUrl: null,
    facturamaSandbox: true,
    facturamaUserId: null,
    facturamaToken: null,
    maxDoctors: 3,
    doctorsCount: MOCK_DOCTORS.filter(d => d.isActive).length,
    patientsCount: MOCK_PATIENTS.length,
    createdAt: daysAgoISO(365),
    updatedAt: iso(),
  }
}

/**
 * Returns mock patients matching:
 *   db.patient.findMany({ orderBy: { createdAt: 'desc' } })
 */
export function getMockPatients(_clinicId: string) {
  return [...MOCK_PATIENTS].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

/**
 * Returns mock appointments with included patient/doctor/service,
 * matching:
 *   db.appointment.findMany({ include: { patient, doctor, service } })
 * Ordered by startTime ascending.
 */
export function getMockAppointments(_clinicId: string) {
  return [...MOCK_APPOINTMENTS].sort((a, b) => {
    if (a.date !== b.date) return new Date(a.date).getTime() - new Date(b.date).getTime()
    return a.startTime.localeCompare(b.startTime)
  })
}

/**
 * Returns mock invoices with included patient, matching:
 *   db.invoice.findMany({ include: { patient: { select: { fullName, rfc } } } })
 * Ordered by createdAt descending.
 */
export function getMockInvoices(_clinicId: string) {
  return [...MOCK_INVOICES].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

/**
 * Returns mock doctors matching:
 *   db.doctor.findMany({ orderBy: { name: 'asc' } })
 */
export function getMockDoctors(_clinicId: string) {
  return [...MOCK_DOCTORS].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Returns mock services matching:
 *   db.service.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
 */
export function getMockServices(_clinicId: string) {
  return MOCK_SERVICES.filter(s => s.isActive).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Returns KPI data matching the shape from /api/dashboard/kpi,
 * which returns aggregate computed values plus chart data.
 */
export function getMockKPIs(_clinicId: string) {
  // Count today's non-cancelled appointments
  const todayStr = todayISO(0, 0).slice(0, 10)
  const citasHoy = MOCK_APPOINTMENTS.filter(
    a => a.date.slice(0, 10) === todayStr && !['cancelled', 'no_show'].includes(a.status)
  ).length

  // Active conversations
  const conversacionesActivas = MOCK_CONVERSATIONS.filter(c => c.status === 'active').length

  // Invoices this month (count)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const facturasMes = MOCK_INVOICES.filter(
    i => new Date(i.createdAt) >= monthStart
  ).length

  // Total facturado this month (excl. cancelled/error)
  const totalFacturado = MOCK_INVOICES.filter(
    i => new Date(i.createdAt) >= monthStart && !['cancelled', 'error'].includes(i.status)
  ).reduce((sum, i) => sum + i.total, 0)

  // New patients this month
  const pacientesNuevos = MOCK_PATIENTS.filter(
    p => p.segment === 'new' && new Date(p.createdAt) >= monthStart
  ).length

  // Occupancy — approximate
  const ocupacion = 78

  // Weekly appointments chart
  const weeklyAppointments = [
    { day: 'Lun', count: 7 },
    { day: 'Mar', count: 9 },
    { day: 'Mie', count: 6 },
    { day: 'Jue', count: 8 },
    { day: 'Vie', count: 10 },
    { day: 'Sab', count: 4 },
  ]

  // Monthly revenue chart — last 6 months
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const currentMonth = now.getMonth()
  const monthlyRevenue = []
  for (let i = 5; i >= 0; i--) {
    const mIdx = (currentMonth - i + 12) % 12
    monthlyRevenue.push({
      month: monthNames[mIdx],
      amount: [45000, 52000, 48000, 61000, 58000, 67000][5 - i],
    })
  }

  // No-show rate
  const noShowRate = 8

  // Current month revenue
  const currentMonthRevenue = monthlyRevenue.length > 0 ? monthlyRevenue[monthlyRevenue.length - 1].amount : 0

  // Doctor appointments today
  const todayAppts = MOCK_APPOINTMENTS.filter(
    a => a.date.slice(0, 10) === todayStr && !['cancelled', 'no_show'].includes(a.status)
  )
  const doctorApptMap = new Map<string, { doctorName: string; todayCount: number }>()
  for (const appt of todayAppts) {
    const existing = doctorApptMap.get(appt.doctorId)
    if (existing) {
      existing.todayCount++
    } else {
      doctorApptMap.set(appt.doctorId, { doctorName: appt.doctor.name, todayCount: 1 })
    }
  }
  const doctorAppointments = Array.from(doctorApptMap, ([doctorId, data]) => ({
    doctorId,
    doctorName: data.doctorName,
    todayCount: data.todayCount,
  }))

  return {
    kpi: {
      citasHoy,
      conversacionesActivas,
      facturasMes,
      totalFacturado: Math.round(totalFacturado),
      pacientesNuevos,
      ocupacion,
    },
    trends: {
      citasHoyDiff: 0,
      conversacionesUnread: 0,
      revenueGrowth: 0,
      revenuePrevMonth: monthNames[(currentMonth - 1 + 12) % 12],
    },
    weeklyAppointments,
    monthlyRevenue,
    noShowRate,
    currentMonthRevenue,
    doctorAppointments,
  }
}

/**
 * Returns mock feature flags matching:
 *   db.featureFlag.findMany({ orderBy: [{ module: 'asc' }, { feature: 'asc' }] })
 */
export function getMockFeatureFlags(_clinicId: string) {
  return [...MOCK_FEATURE_FLAGS].sort((a, b) => {
    const moduleComp = a.module.localeCompare(b.module)
    if (moduleComp !== 0) return moduleComp
    return a.feature.localeCompare(b.feature)
  })
}
