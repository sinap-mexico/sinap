// Mock data for Sinap - Clínica San Ángel

export const clinic = {
  name: 'Clínica San Ángel',
  mode: 'clinic' as const,
  rfc: 'CSA230515ABC',
  phone: '+52 55 1234 5678',
  address: 'Av. Insurgentes Sur 1234, Col. San Ángel, CDMX, 01000',
  doctor: {
    name: 'Dr. Alejandro Ruiz',
    specialty: 'Dermatología',
    email: 'aruiz@clinicasanangel.mx',
  },
}

export const patients = [
  { id: 'p1', name: 'María García López', phone: '+52 55 2345 6789', email: 'maria.garcia@email.mx', lastVisit: '2026-05-28', segment: 'active' },
  { id: 'p2', name: 'Carlos Mendoza Rivera', phone: '+52 55 3456 7890', email: 'carlos.m@email.mx', lastVisit: '2026-05-25', segment: 'active' },
  { id: 'p3', name: 'Ana Sofía Hernández', phone: '+52 55 4567 8901', email: 'ana.hdez@email.mx', lastVisit: '2026-05-20', segment: 'inactive' },
  { id: 'p4', name: 'Roberto Jiménez Salazar', phone: '+52 55 5678 9012', email: 'rob.jimenez@email.mx', lastVisit: '2026-05-29', segment: 'vip' },
  { id: 'p5', name: 'Laura Patricia Morales', phone: '+52 55 6789 0123', email: 'laura.m@email.mx', lastVisit: '2026-05-15', segment: 'churned' },
  { id: 'p6', name: 'Fernando Díaz Vega', phone: '+52 55 7890 1234', email: 'fer.diaz@email.mx', lastVisit: '2026-05-30', segment: 'new' },
  { id: 'p7', name: 'Isabel Reyes Castillo', phone: '+52 55 8901 2345', email: 'isabel.r@email.mx', lastVisit: '2026-05-22', segment: 'active' },
  { id: 'p8', name: 'Miguel Ángel Torres', phone: '+52 55 9012 3456', email: 'miguel.t@email.mx', lastVisit: '2026-04-10', segment: 'churned' },
]

export const appointments = [
  { id: 'a1', patientId: 'p1', patientName: 'María García López', time: '09:00', duration: 30, status: 'confirmed', type: 'Consulta seguimiento' },
  { id: 'a2', patientId: 'p4', patientName: 'Roberto Jiménez Salazar', time: '10:00', duration: 45, status: 'confirmed', type: 'Revisión dermatológica' },
  { id: 'a3', patientId: 'p6', patientName: 'Fernando Díaz Vega', time: '11:00', duration: 30, status: 'pending', type: 'Primera consulta' },
  { id: 'a4', patientId: 'p2', patientName: 'Carlos Mendoza Rivera', time: '12:00', duration: 30, status: 'confirmed', type: 'Consulta seguimiento' },
  { id: 'a5', patientId: 'p7', patientName: 'Isabel Reyes Castillo', time: '13:30', duration: 30, status: 'pending', type: 'Revisión de lunar' },
  { id: 'a6', patientId: 'p3', patientName: 'Ana Sofía Hernández', time: '15:00', duration: 45, status: 'scheduled', type: 'Tratamiento láser' },
  { id: 'a7', patientId: 'p1', patientName: 'María García López', time: '16:00', duration: 30, status: 'scheduled', type: 'Aplicación tratamiento' },
  { id: 'a8', patientId: 'p4', patientName: 'Roberto Jiménez Salazar', time: '17:00', duration: 30, status: 'scheduled', type: 'Consulta estética' },
  { id: 'a9', patientId: 'p5', patientName: 'Laura Patricia Morales', time: '09:30', duration: 30, status: 'cancelled', type: 'Primera consulta' },
  { id: 'a10', patientId: 'p2', patientName: 'Carlos Mendoza Rivera', time: '11:30', duration: 30, status: 'no_show', type: 'Seguimiento' },
]

export const invoices = [
  { id: 'inv1', uuid: 'A3F2-8B1C-4D5E-9F0A', patientName: 'María García López', concept: 'Consulta dermatológica', total: 1500, status: 'timbrada' as const, date: '2026-05-28', paymentMethod: 'Transferencia' },
  { id: 'inv2', uuid: 'B4C3-9D2E-5F6A-0B1C', patientName: 'Roberto Jiménez Salazar', concept: 'Revisión dermatológica + biopsia', total: 3500, status: 'timbrada' as const, date: '2026-05-27', paymentMethod: 'Efectivo' },
  { id: 'inv3', uuid: 'C5D4-0E3F-6A7B-1C2D', patientName: 'Carlos Mendoza Rivera', concept: 'Tratamiento láser sesión 3', total: 2800, status: 'pendiente' as const, date: '2026-05-26', paymentMethod: 'Tarjeta' },
  { id: 'inv4', uuid: 'D6E5-1F4A-7B8C-2D3E', patientName: 'Ana Sofía Hernández', concept: 'Consulta inicial', total: 1200, status: 'timbrada' as const, date: '2026-05-25', paymentMethod: 'Transferencia' },
  { id: 'inv5', uuid: 'E7F6-2A5B-8C9D-3E4F', patientName: 'Fernando Díaz Vega', concept: 'Primera consulta', total: 1200, status: 'error' as const, date: '2026-05-24', paymentMethod: 'Efectivo' },
  { id: 'inv6', uuid: 'F8A7-3B6C-9D0E-4F5A', patientName: 'Isabel Reyes Castillo', concept: 'Aplicación crioterapia', total: 1800, status: 'pendiente' as const, date: '2026-05-23', paymentMethod: 'Tarjeta' },
  { id: 'inv7', uuid: 'A9B8-4C7D-0E1F-5A6B', patientName: 'María García López', concept: 'Seguimiento tratamiento', total: 900, status: 'timbrada' as const, date: '2026-05-22', paymentMethod: 'Transferencia' },
  { id: 'inv8', uuid: 'B0C9-5D8E-1F2A-6B7C', patientName: 'Roberto Jiménez Salazar', concept: 'Procedimiento estético', total: 5200, status: 'timbrada' as const, date: '2026-05-21', paymentMethod: 'Tarjeta' },
  { id: 'inv9', uuid: 'C1D0-6E9F-2A3B-7C8D', patientName: 'Laura Patricia Morales', concept: 'Valoración inicial', total: 1200, status: 'pendiente' as const, date: '2026-05-20', paymentMethod: 'Efectivo' },
  { id: 'inv10', uuid: 'D2E1-7F0A-3B4C-8D9E', patientName: 'Miguel Ángel Torres', concept: 'Consulta + estudio', total: 2400, status: 'error' as const, date: '2026-05-19', paymentMethod: 'Transferencia' },
]

export type ConversationMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  text: string
  time: string
  agent?: string
  isAI?: boolean
}

export type Conversation = {
  id: string
  patientId: string
  patientName: string
  channel: 'whatsapp' | 'instagram' | 'facebook'
  lastMessage: string
  lastTime: string
  unread: number
  intent?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  messages: ConversationMessage[]
}

export const conversations: Conversation[] = [
  {
    id: 'conv1',
    patientId: 'p1',
    patientName: 'María García López',
    channel: 'whatsapp',
    lastMessage: '¿Me puede confirmar mi cita de mañana?',
    lastTime: '09:15',
    unread: 2,
    intent: 'Confirmación de cita',
    sentiment: 'neutral',
    messages: [
      { id: 'm1', direction: 'inbound', text: 'Buenos días, quería confirmar mi cita de mañana a las 9', time: '09:10' },
      { id: 'm2', direction: 'outbound', text: 'Buenos días María. Su cita está confirmada para mañana a las 9:00 AM. ¿Necesita algo más?', time: '09:11', agent: 'Sinap Desk', isAI: true },
      { id: 'm3', direction: 'inbound', text: '¿Me puede confirmar mi cita de mañana?', time: '09:15' },
    ],
  },
  {
    id: 'conv2',
    patientId: 'p4',
    patientName: 'Roberto Jiménez Salazar',
    channel: 'whatsapp',
    lastMessage: 'Gracias doctor, ahí estaré puntual',
    lastTime: '08:45',
    unread: 0,
    intent: 'Agendamiento',
    sentiment: 'positive',
    messages: [
      { id: 'm4', direction: 'outbound', text: 'Estimado Roberto, le recordamos su cita el día de hoy a las 10:00 AM.', time: '08:00', agent: 'Sinap Flow', isAI: true },
      { id: 'm5', direction: 'inbound', text: 'Gracias doctor, ahí estaré puntual', time: '08:45' },
    ],
  },
  {
    id: 'conv3',
    patientId: 'p6',
    patientName: 'Fernando Díaz Vega',
    channel: 'whatsapp',
    lastMessage: '¿Cuál es el costo de la primera consulta?',
    lastTime: '08:30',
    unread: 1,
    intent: 'Cotización',
    sentiment: 'neutral',
    messages: [
      { id: 'm6', direction: 'inbound', text: 'Hola, vi su página en Instagram. ¿Cuál es el costo de la primera consulta?', time: '08:25' },
      { id: 'm7', direction: 'outbound', text: 'Hola Fernando. La primera consulta tiene un costo de $1,200 MXN. Incluye valoración completa y plan de tratamiento. ¿Le gustaría agendar?', time: '08:26', agent: 'Sinap Desk', isAI: true },
      { id: 'm8', direction: 'inbound', text: '¿Cuál es el costo de la primera consulta?', time: '08:30' },
    ],
  },
  {
    id: 'conv4',
    patientId: 'p5',
    patientName: 'Laura Patricia Morales',
    channel: 'instagram',
    lastMessage: 'No he podido ir, tengo mucho trabajo',
    lastTime: 'Ayer',
    unread: 3,
    intent: 'Reactivación',
    sentiment: 'negative',
    messages: [
      { id: 'm9', direction: 'outbound', text: 'Hola Laura. Notamos que no ha visitado la clínica últimamente. ¿Le gustaría reagendar su cita? Tenemos horarios disponibles esta semana.', time: '10:00', agent: 'Sinap Grow', isAI: true },
      { id: 'm10', direction: 'inbound', text: 'No he podido ir, tengo mucho trabajo', time: '14:20' },
      { id: 'm11', direction: 'outbound', text: 'Entendemos perfectamente, Laura. Podemos ofrecerle un horario sabatino si le queda más cómodo. ¿Le interesa?', time: '14:21', agent: 'Sinap Grow', isAI: true },
    ],
  },
  {
    id: 'conv5',
    patientId: 'p7',
    patientName: 'Isabel Reyes Castillo',
    channel: 'whatsapp',
    lastMessage: '¿A qué hora me toca hoy?',
    lastTime: '07:50',
    unread: 1,
    intent: 'Información de cita',
    sentiment: 'neutral',
    messages: [
      { id: 'm12', direction: 'inbound', text: 'Buenos días, ¿a qué hora me toca hoy?', time: '07:50' },
      { id: 'm13', direction: 'outbound', text: 'Buenos días Isabel. Su cita es hoy a las 13:30. Revisión de lunar.', time: '07:51', agent: 'Sinap Desk', isAI: true },
    ],
  },
  {
    id: 'conv6',
    patientId: 'p3',
    patientName: 'Ana Sofía Hernández',
    channel: 'facebook',
    lastMessage: '¿El tratamiento láser duele mucho?',
    lastTime: 'Ayer',
    unread: 2,
    intent: 'Duda sobre tratamiento',
    sentiment: 'neutral',
    messages: [
      { id: 'm14', direction: 'inbound', text: 'Hola doctor, ¿el tratamiento láser duele mucho?', time: '16:00' },
      { id: 'm15', direction: 'outbound', text: 'Hola Ana. El tratamiento láser puede causar una ligera molestia, pero aplicamos anestesia tópica para minimizar cualquier incomodidad. La mayoría de pacientes lo toleran muy bien.', time: '16:01', agent: 'Sinap Desk', isAI: true },
      { id: 'm16', direction: 'inbound', text: '¿El tratamiento láser duele mucho?', time: '16:15' },
    ],
  },
  {
    id: 'conv7',
    patientId: 'p2',
    patientName: 'Carlos Mendoza Rivera',
    channel: 'whatsapp',
    lastMessage: 'Perfecto, nos vemos mañana',
    lastTime: 'Ayer',
    unread: 0,
    intent: 'Confirmación',
    sentiment: 'positive',
    messages: [
      { id: 'm17', direction: 'outbound', text: 'Carlos, su cita de mañana a las 12:00 está confirmada. Consulta de seguimiento. ¿Todo bien?', time: '18:00', agent: 'Sinap Flow', isAI: true },
      { id: 'm18', direction: 'inbound', text: 'Perfecto, nos vemos mañana', time: '18:30' },
    ],
  },
  {
    id: 'conv8',
    patientId: 'p8',
    patientName: 'Miguel Ángel Torres',
    channel: 'whatsapp',
    lastMessage: 'Quiero agendar una cita urgente',
    lastTime: '08:00',
    unread: 1,
    intent: 'Agendamiento urgente',
    sentiment: 'negative',
    messages: [
      { id: 'm19', direction: 'inbound', text: 'Quiero agendar una cita urgente', time: '08:00' },
    ],
  },
]

export const activityFeed = [
  { id: 'act1', icon: 'CalendarCheck', text: 'Cita agendada — María García López — hace 5min', type: 'appointment' },
  { id: 'act2', icon: 'Receipt', text: 'Factura generada — $1,500 MXN — hace 12min', type: 'invoice' },
  { id: 'act3', icon: 'MessageSquare', text: 'Conversación reactivada — Laura Morales — hace 18min', type: 'conversation' },
  { id: 'act4', icon: 'Stethoscope', text: 'Pre-consulta completada — Fernando Díaz — hace 25min', type: 'clinical' },
  { id: 'act5', icon: 'BarChart3', text: 'Reporte semanal generado — hace 1hr', type: 'analytics' },
  { id: 'act6', icon: 'AlertTriangle', text: 'Factura con error PAC — Fernando Díaz — hace 2hr', type: 'alert' },
  { id: 'act7', icon: 'CheckCircle', text: 'Nota SOAP aprobada — Roberto Jiménez — hace 2hr', type: 'clinical' },
  { id: 'act8', icon: 'Bell', text: 'Recordatorio enviado — 3 pacientes — hace 3hr', type: 'conversation' },
]

export const agentStatuses = [
  { id: 'os', name: 'Sinap OS', icon: 'LayoutDashboard', status: 'active' as const, messages: 47, color: '#534AB7' },
  { id: 'desk', name: 'Sinap Desk', icon: 'MessageSquare', status: 'processing' as const, messages: 23, color: '#1D9E75' },
  { id: 'flow', name: 'Sinap Flow', icon: 'Activity', status: 'active' as const, messages: 12, color: '#1D9E75' },
  { id: 'bill', name: 'Sinap Bill', icon: 'Receipt', status: 'idle' as const, messages: 8, color: '#1D9E75' },
  { id: 'grow', name: 'Sinap Grow', icon: 'TrendingUp', status: 'idle' as const, messages: 5, color: '#1D9E75' },
  { id: 'sight', name: 'Sinap Sight', icon: 'BarChart3', status: 'processing' as const, messages: 3, color: '#1D9E75' },
  { id: 'hub', name: 'Sinap Hub', icon: 'Building2', status: 'idle' as const, messages: 2, color: '#1D9E75' },
]

export const soapNote = {
  id: 'soap1',
  patientName: 'Roberto Jiménez Salazar',
  date: '2026-05-30',
  subjective: 'Paciente masculino de 45 años que acude a revisión de lesión en dorso de mano derecha. Refiere que la lesión ha crecido en los últimos 2 meses. Niega dolor, pero reporta prurito ocasional. No antecedentes de lesiones similares. Sin tratamiento previo.',
  objective: 'A la exploración física: lesión papulosa de 6mm de diámetro en dorso de mano derecha, bordes bien definidos, color café oscuro, superficie ligeramente verrugosa. No signos de sangrado. Piel circundante sin alteraciones. Resto de la exploración sin hallazgos patológicos.',
  assessment: 'Lesión pigmentada en dorso de mano derecha, probable nevo melanocítico compuesto. No se observan signos clínicos de malignidad (criterios ABCDE dentro de parámetros normales). Se sugiere biopsia excisional para confirmación histopatológica.',
  plan: '1. Biopsia excisional de lesión en dorso de mano derecha programada para próxima sesión.\n2. Estudio histopatológico con inmunohistoquímica si es necesario.\n3. Seguimiento en 15 días post-biopsia para revisión de resultados y cura.\n4. Indicar al paciente signos de alarma (cambio de color, tamaño, sangrado).',
}

export const patientSegments = {
  new: 14,
  active: 67,
  inactive: 23,
  churned: 8,
  vip: 12,
}

export const campaigns = [
  { id: 'camp1', name: 'Reactivación Mayo', segment: 'inactive', patients: 23, sent: 23, responses: 8, status: 'active' as const },
  { id: 'camp2', name: 'Recordatorio Tratamiento Láser', segment: 'active', patients: 15, sent: 15, responses: 12, status: 'completed' as const },
  { id: 'camp3', name: 'Bienvenida Nuevos Pacientes', segment: 'new', patients: 14, sent: 14, responses: 9, status: 'active' as const },
  { id: 'camp4', name: 'VIP - Promoción Estética', segment: 'vip', patients: 12, sent: 0, responses: 0, status: 'pending' as const },
]

export const funnelData = [
  { stage: 'Lead', count: 120, color: '#888780' },
  { stage: 'Primera cita', count: 68, color: '#5DCAA5' },
  { stage: 'Recurrente', count: 42, color: '#1D9E75' },
  { stage: 'VIP', count: 12, color: '#534AB7' },
]

export const weeklyAppointments = [
  { day: 'Lun', count: 7 },
  { day: 'Mar', count: 9 },
  { day: 'Mié', count: 6 },
  { day: 'Jue', count: 8 },
  { day: 'Vie', count: 10 },
  { day: 'Sáb', count: 4 },
]

export const monthlyRevenue = [
  { month: 'Ene', amount: 45000 },
  { month: 'Feb', amount: 52000 },
  { month: 'Mar', amount: 48000 },
  { month: 'Abr', amount: 61000 },
  { month: 'May', amount: 58000 },
  { month: 'Jun', amount: 67000 },
]

export const staffMembers = [
  { id: 's1', name: 'Dr. Alejandro Ruiz', specialty: 'Dermatología', todayAppointments: 8, avatar: 'AR' },
  { id: 's2', name: 'Dra. Carmen Vega', specialty: 'Dermatología estética', todayAppointments: 6, avatar: 'CV' },
  { id: 's3', name: 'Lic. Patricia Luna', specialty: 'Recepción', todayAppointments: 0, avatar: 'PL' },
]

export const inventoryAlerts = [
  { id: 'i1', item: 'Anestesia tópica (crema)', stock: 3, minStock: 10, urgency: 'high' as const },
  { id: 'i2', item: 'Gasas estériles', stock: 8, minStock: 20, urgency: 'high' as const },
  { id: 'i3', item: 'Crioterapia (nitrógeno)', stock: 15, minStock: 20, urgency: 'medium' as const },
  { id: 'i4', item: 'Guantes de látex M', stock: 50, minStock: 100, urgency: 'low' as const },
]

export const kpiData = {
  citasHoy: 8,
  conversacionesActivas: 12,
  facturasMes: 10,
  totalFacturado: 21700,
  pacientesNuevos: 6,
  ocupacion: 78,
}

// Default services for onboarding
export const defaultServicesBySpecialty: Record<string, { name: string; duration: number; price: number; category: string }[]> = {
  'Dermatología': [
    { name: 'Consulta general', duration: 30, price: 1200, category: 'Consulta' },
    { name: 'Revisión dermatológica', duration: 45, price: 1500, category: 'Consulta' },
    { name: 'Tratamiento láser', duration: 45, price: 2800, category: 'Procedimiento' },
    { name: 'Crioterapia', duration: 30, price: 1800, category: 'Procedimiento' },
    { name: 'Biopsia', duration: 60, price: 3500, category: 'Procedimiento' },
    { name: 'Consulta estética', duration: 30, price: 2000, category: 'Estética' },
  ],
  'Odontología': [
    { name: 'Consulta general', duration: 30, price: 800, category: 'Consulta' },
    { name: 'Limpieza dental', duration: 45, price: 1200, category: 'Procedimiento' },
    { name: 'Blanqueamiento', duration: 60, price: 3500, category: 'Estética' },
    { name: 'Extracción', duration: 45, price: 1500, category: 'Procedimiento' },
  ],
  'Medicina General': [
    { name: 'Consulta general', duration: 30, price: 600, category: 'Consulta' },
    { name: 'Consulta seguimiento', duration: 20, price: 400, category: 'Consulta' },
    { name: 'Certificado médico', duration: 15, price: 300, category: 'Documento' },
  ],
  'Psicología': [
    { name: 'Sesión individual', duration: 50, price: 1200, category: 'Terapia' },
    { name: 'Sesión de pareja', duration: 60, price: 1800, category: 'Terapia' },
    { name: 'Evaluación inicial', duration: 60, price: 1500, category: 'Evaluación' },
  ],
  'Nutrición': [
    { name: 'Consulta inicial', duration: 45, price: 800, category: 'Consulta' },
    { name: 'Seguimiento nutricional', duration: 30, price: 500, category: 'Consulta' },
    { name: 'Plan alimenticio', duration: 30, price: 1000, category: 'Plan' },
  ],
  'Oftalmología': [
    { name: 'Consulta general', duration: 30, price: 1000, category: 'Consulta' },
    { name: 'Examen de la vista', duration: 30, price: 600, category: 'Estudio' },
    { name: 'Adaptación de lentes', duration: 30, price: 400, category: 'Procedimiento' },
  ],
  'Cardiología': [
    { name: 'Consulta general', duration: 30, price: 1500, category: 'Consulta' },
    { name: 'Electrocardiograma', duration: 20, price: 800, category: 'Estudio' },
    { name: 'Ecocardiograma', duration: 30, price: 2500, category: 'Estudio' },
  ],
}

export const defaultSchedule = {
  workDays: '1,2,3,4,5',
  workStart: '09:00',
  workEnd: '18:00',
  slotMinutes: 30,
}

export const defaultDoctorProfile = {
  name: 'Dr. Alejandro Ruiz',
  specialty: 'Dermatología',
  license: '12345678',
  email: 'aruiz@clinicasanangel.mx',
  phone: '+52 55 1234 5678',
}
