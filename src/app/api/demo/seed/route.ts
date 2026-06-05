import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEMO_CLINIC_ID } from '@/lib/mock-api'
import bcrypt from 'bcryptjs'

// ─── DATE HELPERS ──────────────────────────────────────────

function today(hour = 0, minute = 0): Date {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d
}

function daysAgo(n: number, hour = 0, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d
}

function tomorrow(hour = 0, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(hour, minute, 0, 0)
  return d
}

// POST /api/demo/seed — Seeds demo data if not already present
// When DB is unavailable, returns mock clinicId so demo mode still works
export async function POST() {
  try {
    // If DB is not available, return mock clinicId so demo mode works
    if (!db) {
      return NextResponse.json({
        seeded: false,
        message: 'Demo mode active (no database — using mock data)',
        clinicId: DEMO_CLINIC_ID,
        clinicSlug: 'clinica-san-angel-demo',
      })
    }

    const summary = {
      clinic: 0, doctors: 0, staff: 0, users: 0, services: 0,
      serviceDoctors: 0, patients: 0, appointments: 0, invoices: 0,
      conversations: 0, messages: 0, featureFlags: 0, soapNotes: 0, events: 0,
      notifications: 0,
    }

    // ─── 1. CLINIC ─────────────────────────────────────────
    const clinic = await db.clinic.upsert({
      where: { slug: 'clinica-san-angel-demo' },
      update: {},
      create: {
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
        facturamaSandbox: true,
      },
    })
    summary.clinic = 1

    // ─── 2. DOCTORS ────────────────────────────────────────
    const doctor1 = await db.doctor.upsert({
      where: { id: 'demo-doctor-1' },
      update: {},
      create: {
        id: 'demo-doctor-1',
        clinicId: clinic.id,
        name: 'Dr. Alejandro Ruiz',
        email: 'aruiz@clinicasanangel.mx',
        phone: '+52 55 9876 5432',
        specialty: 'Dermatologia',
        license: '12345678',
        color: '#1D9E75',
        workDays: '1,2,3,4,5',
        workStart: '09:00',
        workEnd: '18:00',
        slotMinutes: 30,
      },
    })

    const doctor2 = await db.doctor.upsert({
      where: { id: 'demo-doctor-2' },
      update: {},
      create: {
        id: 'demo-doctor-2',
        clinicId: clinic.id,
        name: 'Dra. Carmen Vega',
        email: 'cvega@clinicasanangel.mx',
        phone: '+52 55 8765 4321',
        specialty: 'Dermatologia estetica',
        license: '87654321',
        color: '#534AB7',
        workDays: '2,3,4,5,6',
        workStart: '10:00',
        workEnd: '19:00',
        slotMinutes: 45,
      },
    })
    summary.doctors = 2

    // ─── 3. STAFF ──────────────────────────────────────────
    const staffData = [
      { id: 'demo-staff-1', name: 'Patricia Mendoza', email: 'pmendoza@clinicasanangel.mx', phone: '+52 55 5555 0101', role: 'receptionist' },
      { id: 'demo-staff-2', name: 'Rosa Elena Fuentes', email: 'rfuentes@clinicasanangel.mx', phone: '+52 55 5555 0202', role: 'assistant' },
      { id: 'demo-staff-3', name: 'Lic. Daniela Ortega', email: 'dortega@clinicasanangel.mx', phone: '+52 55 5555 0303', role: 'admin' },
    ]

    for (const s of staffData) {
      await db.staff.upsert({
        where: { id: s.id },
        update: {},
        create: { ...s, clinicId: clinic.id },
      })
    }
    summary.staff = staffData.length

    // ─── 4. DEMO USER ──────────────────────────────────────
    const hashedPassword = await bcrypt.hash('demo1234', 12)
    await db.user.upsert({
      where: { email: 'demo@sinap.health' },
      update: {},
      create: {
        email: 'demo@sinap.health',
        name: 'Dr. Alejandro Ruiz',
        password: hashedPassword,
        role: 'owner',
        clinicId: clinic.id,
      },
    })
    summary.users = 1

    // ─── 5. SERVICES ───────────────────────────────────────
    const serviceDefs = [
      { name: 'Consulta general', duration: 30, price: 1200, category: 'Consulta' },
      { name: 'Revision dermatologica', duration: 45, price: 1500, category: 'Consulta' },
      { name: 'Tratamiento laser', duration: 45, price: 2800, category: 'Procedimiento' },
      { name: 'Crioterapia', duration: 30, price: 1800, category: 'Procedimiento' },
      { name: 'Biopsia', duration: 60, price: 3500, category: 'Procedimiento' },
      { name: 'Consulta estetica', duration: 30, price: 2000, category: 'Estetica' },
    ]

    const serviceIds: Record<string, string> = {}
    for (const svc of serviceDefs) {
      const id = `svc-${svc.name.toLowerCase().replace(/\s+/g, '-')}`
      serviceIds[svc.name] = id
      await db.service.upsert({
        where: { id },
        update: {},
        create: { id, clinicId: clinic.id, ...svc },
      })
    }
    summary.services = serviceDefs.length

    // ─── 6. SERVICE-DOCTOR PIVOTS ──────────────────────────
    let sdCount = 0
    for (const svc of serviceDefs) {
      const serviceId = serviceIds[svc.name]
      for (const doctorId of ['demo-doctor-1', 'demo-doctor-2']) {
        try {
          await db.serviceDoctor.create({ data: { serviceId, doctorId } })
          sdCount++
        } catch {
          // Already exists (unique constraint) — skip
        }
      }
    }
    summary.serviceDoctors = sdCount

    // ─── 7. PATIENTS ───────────────────────────────────────
    // Only seed if no patients exist for this clinic
    const existingPatients = await db.patient.count({ where: { clinicId: clinic.id } })

    if (existingPatients === 0) {
      const patientsData = [
        { id: 'demo-patient-1', firstName: 'Maria', lastName: 'Garcia Lopez', fullName: 'Maria Garcia Lopez', phone: '+52 55 4123 0101', email: 'maria.garcia@email.com', birthDate: new Date('1988-03-15'), gender: 'F', segment: 'vip', source: 'referral', totalVisits: 12, totalSpent: 28500, ltv: 34000, lastVisitDate: daysAgo(2), firstContactDate: daysAgo(180), allergies: 'Penicilina', notes: 'Paciente VIP. Prefiere citas por la manana. Seguimiento de melanoma en antebrazo izquierdo.', preferredChannel: 'whatsapp', preferredTime: 'morning', rfc: 'GALM880315MDF', address: 'Col. Del Valle, CDMX', sentiment: 'positive' },
        { id: 'demo-patient-2', firstName: 'Carlos', lastName: 'Mendoza Rivera', fullName: 'Carlos Mendoza Rivera', phone: '+52 55 4123 0202', email: 'carlos.mendoza@email.com', birthDate: new Date('1975-07-22'), gender: 'M', segment: 'active', source: 'whatsapp', totalVisits: 6, totalSpent: 9800, ltv: 14200, lastVisitDate: daysAgo(5), firstContactDate: daysAgo(90), allergies: null, notes: 'Tratamiento de acne cronico en curso. Buena respuesta a retinoides.', preferredChannel: 'whatsapp', preferredTime: 'afternoon', rfc: 'MERC750722HDF', address: 'Col. Roma Norte, CDMX', sentiment: 'positive' },
        { id: 'demo-patient-3', firstName: 'Ana Sofia', lastName: 'Hernandez', fullName: 'Ana Sofia Hernandez', phone: '+52 55 4123 0303', email: 'anasofia.h@email.com', birthDate: new Date('1995-11-08'), gender: 'F', segment: 'inactive', source: 'instagram', totalVisits: 2, totalSpent: 3000, ltv: 3000, lastVisitDate: daysAgo(60), firstContactDate: daysAgo(120), allergies: 'Sulfonamidas', notes: 'Vino por consulta estetica. No ha regresado, posible reactivacion.', preferredChannel: 'instagram', preferredTime: 'evening', rfc: 'HEAS951108MDF', address: 'Col. Condesa, CDMX', sentiment: 'neutral' },
        { id: 'demo-patient-4', firstName: 'Roberto', lastName: 'Jimenez Salazar', fullName: 'Roberto Jimenez Salazar', phone: '+52 55 4123 0404', email: 'rjimenez@email.com', birthDate: new Date('1962-01-30'), gender: 'M', segment: 'vip', source: 'referral', totalVisits: 18, totalSpent: 52000, ltv: 68000, lastVisitDate: daysAgo(1), firstContactDate: daysAgo(365), allergies: 'Lidocaina', notes: 'Paciente VIP con seguimiento de multiples neoplasias cutaneas. Revision cada 3 meses. Siempre factura.', preferredChannel: 'whatsapp', preferredTime: 'morning', rfc: 'JISR620130HDF', address: 'Lomas de Chapultepec, CDMX', sentiment: 'positive' },
        { id: 'demo-patient-5', firstName: 'Laura Patricia', lastName: 'Morales', fullName: 'Laura Patricia Morales', phone: '+52 55 4123 0505', email: 'laura.morales@email.com', birthDate: new Date('1990-05-14'), gender: 'F', segment: 'churned', source: 'facebook', totalVisits: 3, totalSpent: 4500, ltv: 4500, lastVisitDate: daysAgo(90), firstContactDate: daysAgo(150), allergies: null, notes: 'Se quejo del tiempo de espera. No contesta mensajes de seguimiento.', preferredChannel: 'facebook', preferredTime: 'afternoon', rfc: 'MOLP900514MDF', address: 'Coyoacan, CDMX', sentiment: 'negative' },
        { id: 'demo-patient-6', firstName: 'Fernando', lastName: 'Diaz Vega', fullName: 'Fernando Diaz Vega', phone: '+52 55 4123 0606', email: 'fdiazvega@email.com', birthDate: new Date('2000-09-20'), gender: 'M', segment: 'new', source: 'walk_in', totalVisits: 1, totalSpent: 1200, ltv: 1200, lastVisitDate: daysAgo(3), firstContactDate: daysAgo(3), allergies: null, notes: 'Primera visita. Consulta general por lesion en brazo. Pendiente seguimiento.', preferredChannel: 'whatsapp', preferredTime: 'morning', rfc: 'DIVF000920HDF', address: 'Col. Narvarte, CDMX', sentiment: 'neutral' },
        { id: 'demo-patient-7', firstName: 'Isabel', lastName: 'Reyes Castillo', fullName: 'Isabel Reyes Castillo', phone: '+52 55 4123 0707', email: 'isabel.reyes@email.com', birthDate: new Date('1983-12-03'), gender: 'F', segment: 'active', source: 'whatsapp', totalVisits: 5, totalSpent: 7300, ltv: 11500, lastVisitDate: daysAgo(7), firstContactDate: daysAgo(60), allergies: 'Aines', notes: 'Tratamiento de dermatitis atopica. Mejoria notable con inmunosupresores topicos.', preferredChannel: 'whatsapp', preferredTime: 'afternoon', rfc: 'RECI831203MDF', address: 'Col. Polanco, CDMX', sentiment: 'positive' },
        { id: 'demo-patient-8', firstName: 'Miguel Angel', lastName: 'Torres', fullName: 'Miguel Angel Torres', phone: '+52 55 4123 0808', email: 'matorres@email.com', birthDate: new Date('1978-06-17'), gender: 'M', segment: 'churned', source: 'instagram', totalVisits: 2, totalSpent: 3800, ltv: 3800, lastVisitDate: daysAgo(75), firstContactDate: daysAgo(130), allergies: null, notes: 'Vino por consulta estetica y crioterapia. No continuo tratamiento. Candidato a campana de reactivacion.', preferredChannel: 'instagram', preferredTime: 'evening', rfc: 'TOMA780617HDF', address: 'Col. Escandon, CDMX', sentiment: 'neutral' },
      ]

      for (const p of patientsData) {
        await db.patient.upsert({
          where: { id: p.id },
          update: {},
          create: { ...p, clinicId: clinic.id },
        })
      }
      summary.patients = patientsData.length
    } else {
      summary.patients = existingPatients
    }

    // ─── 8. APPOINTMENTS ───────────────────────────────────
    const existingAppointments = await db.appointment.count({ where: { clinicId: clinic.id } })

    if (existingAppointments === 0) {
      const appointmentsData = [
        { id: 'demo-apt-1', patientId: 'demo-patient-1', doctorId: 'demo-doctor-1', serviceId: 'svc-revision-dermatologica', date: today(), startTime: '10:00', endTime: '10:45', status: 'confirmed', channel: 'whatsapp', notes: 'Seguimiento melanoma. Traer estudios de laboratorio.' },
        { id: 'demo-apt-2', patientId: 'demo-patient-4', doctorId: 'demo-doctor-1', serviceId: 'svc-consulta-general', date: today(), startTime: '11:00', endTime: '11:30', status: 'scheduled', channel: 'whatsapp', notes: 'Revision trimestral. Siempre puntual.' },
        { id: 'demo-apt-3', patientId: 'demo-patient-6', doctorId: 'demo-doctor-2', serviceId: 'svc-consulta-general', date: today(), startTime: '10:00', endTime: '10:45', status: 'scheduled', channel: 'walk_in', notes: 'Segunda consulta post-biopsia.' },
        { id: 'demo-apt-4', patientId: 'demo-patient-2', doctorId: 'demo-doctor-1', serviceId: 'svc-revision-dermatologica', date: daysAgo(1), startTime: '16:00', endTime: '16:45', status: 'completed', channel: 'whatsapp', notes: 'Revision de acne. Buen progreso con tratamiento.' },
        { id: 'demo-apt-5', patientId: 'demo-patient-7', doctorId: 'demo-doctor-2', serviceId: 'svc-consulta-general', date: daysAgo(1), startTime: '14:00', endTime: '14:45', status: 'completed', channel: 'whatsapp', notes: 'Dermatitis atopica - ajuste de tratamiento topico.' },
        { id: 'demo-apt-6', patientId: 'demo-patient-1', doctorId: 'demo-doctor-1', serviceId: 'svc-tratamiento-laser', date: daysAgo(2), startTime: '09:00', endTime: '09:45', status: 'completed', channel: 'whatsapp', notes: 'Sesion laser #3. Tolerancia adecuada.' },
        { id: 'demo-apt-7', patientId: 'demo-patient-5', doctorId: 'demo-doctor-1', serviceId: 'svc-consulta-estetica', date: daysAgo(3), startTime: '12:00', endTime: '12:30', status: 'cancelled', channel: 'facebook', cancelReason: 'La paciente cancelo por conflicto de horario. No reprogramo.' },
        { id: 'demo-apt-8', patientId: 'demo-patient-3', doctorId: 'demo-doctor-2', serviceId: 'svc-consulta-estetica', date: daysAgo(4), startTime: '11:00', endTime: '11:45', status: 'no_show', channel: 'instagram', notes: 'No se presento. Se intento contactar sin exito.' },
        { id: 'demo-apt-9', patientId: 'demo-patient-4', doctorId: 'demo-doctor-1', serviceId: 'svc-biopsia', date: daysAgo(5), startTime: '09:00', endTime: '10:00', status: 'completed', channel: 'whatsapp', notes: 'Biopsia de lesion sospechosa en espalda. Enviada a patologia.' },
        { id: 'demo-apt-10', patientId: 'demo-patient-8', doctorId: 'demo-doctor-2', serviceId: 'svc-crioterapia', date: daysAgo(5), startTime: '15:00', endTime: '15:45', status: 'cancelled', channel: 'instagram', cancelReason: 'El paciente no confirmo asistencia. Se cancelo automaticamente.' },
        { id: 'demo-apt-11', patientId: 'demo-patient-7', doctorId: 'demo-doctor-1', serviceId: 'svc-revision-dermatologica', date: tomorrow(), startTime: '09:30', endTime: '10:15', status: 'confirmed', channel: 'whatsapp', notes: 'Control de dermatitis. Evaluar respuesta a inmunosupresores.' },
        { id: 'demo-apt-12', patientId: 'demo-patient-2', doctorId: 'demo-doctor-2', serviceId: 'svc-consulta-estetica', date: daysAgo(6), startTime: '13:00', endTime: '13:45', status: 'completed', channel: 'whatsapp', notes: 'Consulta estetica facial. Interesada en peeling quimico.' },
      ]

      for (const apt of appointmentsData) {
        await db.appointment.upsert({
          where: { id: apt.id },
          update: {},
          create: { ...apt, clinicId: clinic.id },
        })
      }
      summary.appointments = appointmentsData.length
    } else {
      summary.appointments = existingAppointments
    }

    // ─── 9. INVOICES ───────────────────────────────────────
    const existingInvoices = await db.invoice.count({ where: { clinicId: clinic.id } })

    if (existingInvoices === 0) {
      const invoicesData = [
        { id: 'demo-inv-1', patientId: 'demo-patient-1', appointmentId: 'demo-apt-6', subtotal: 2800, iva: 448, total: 3248, formaPago: '03', metodoPago: 'PUE', usoCFDI: 'G01', tipoComprobante: 'I', concepto: 'Tratamiento laser', status: 'timbrada', paymentStatus: 'paid', paidAt: daysAgo(2), cfdiUuid: 'A1B2C3D4-E5F6-7890-ABCD-1234567890AB', serie: 'A', folio: '001', fechaTimbrado: daysAgo(2) },
        { id: 'demo-inv-2', patientId: 'demo-patient-2', appointmentId: 'demo-apt-4', subtotal: 1500, iva: 240, total: 1740, formaPago: '03', metodoPago: 'PUE', usoCFDI: 'G01', tipoComprobante: 'I', concepto: 'Revision dermatologica', status: 'timbrada', paymentStatus: 'paid', paidAt: daysAgo(1), cfdiUuid: 'B2C3D4E5-F6A7-8901-BCDE-2345678901BC', serie: 'A', folio: '002', fechaTimbrado: daysAgo(1) },
        { id: 'demo-inv-3', patientId: 'demo-patient-4', appointmentId: 'demo-apt-9', subtotal: 3500, iva: 560, total: 4060, formaPago: '04', metodoPago: 'PUE', usoCFDI: 'G01', tipoComprobante: 'I', concepto: 'Biopsia', status: 'timbrada', paymentStatus: 'paid', paidAt: daysAgo(5), cfdiUuid: 'C3D4E5F6-A7B8-9012-CDEF-3456789012CD', serie: 'A', folio: '003', fechaTimbrado: daysAgo(5) },
        { id: 'demo-inv-4', patientId: 'demo-patient-7', appointmentId: 'demo-apt-5', subtotal: 1200, iva: 192, total: 1392, formaPago: '03', metodoPago: 'PUE', usoCFDI: 'G01', tipoComprobante: 'I', concepto: 'Consulta general', status: 'pending', paymentStatus: 'unpaid' },
        { id: 'demo-inv-5', patientId: 'demo-patient-1', appointmentId: null, subtotal: 2000, iva: 320, total: 2320, formaPago: '03', metodoPago: 'PUE', usoCFDI: 'G03', tipoComprobante: 'I', concepto: 'Consulta estetica', status: 'pending', paymentStatus: 'unpaid' },
        { id: 'demo-inv-6', patientId: 'demo-patient-5', appointmentId: 'demo-apt-7', subtotal: 600, iva: 96, total: 696, formaPago: '03', metodoPago: 'PUE', usoCFDI: 'G01', tipoComprobante: 'I', concepto: 'Consulta estetica (cancelada)', status: 'cancelled', paymentStatus: 'unpaid' },
        { id: 'demo-inv-7', patientId: 'demo-patient-6', appointmentId: null, subtotal: 5200, iva: 832, total: 6032, formaPago: '28', metodoPago: 'PUE', usoCFDI: 'G01', tipoComprobante: 'I', concepto: 'Paquete dermatologico integral', status: 'error', paymentStatus: 'unpaid', errorMessage: 'Error al timbrar: RFC del receptor no valido segun catalogo SAT.' },
        { id: 'demo-inv-8', patientId: 'demo-patient-4', appointmentId: null, subtotal: 1800, iva: 288, total: 2088, formaPago: '03', metodoPago: 'PUE', usoCFDI: 'G01', tipoComprobante: 'I', concepto: 'Crioterapia', status: 'timbrada', paymentStatus: 'paid', paidAt: daysAgo(8), cfdiUuid: 'D4E5F6A7-B8C9-0123-DEFA-4567890123DE', serie: 'A', folio: '004', fechaTimbrado: daysAgo(8) },
        { id: 'demo-inv-9', patientId: 'demo-patient-2', appointmentId: 'demo-apt-12', subtotal: 2000, iva: 320, total: 2320, formaPago: '03', metodoPago: 'PUE', usoCFDI: 'G01', tipoComprobante: 'I', concepto: 'Consulta estetica', status: 'timbrada', paymentStatus: 'paid', paidAt: daysAgo(6), cfdiUuid: 'E5F6A7B8-C9D0-1234-EFAB-5678901234EF', serie: 'A', folio: '005', fechaTimbrado: daysAgo(6) },
      ]

      for (const inv of invoicesData) {
        await db.invoice.upsert({
          where: { id: inv.id },
          update: {},
          create: { ...inv, clinicId: clinic.id },
        })
      }
      summary.invoices = invoicesData.length
    } else {
      summary.invoices = existingInvoices
    }

    // ─── 10. CONVERSATIONS & MESSAGES ──────────────────────
    const existingConversations = await db.conversation.count({ where: { clinicId: clinic.id } })

    if (existingConversations === 0) {
      const conversationsData = [
        {
          id: 'demo-conv-1', patientId: 'demo-patient-1', channel: 'whatsapp', status: 'active',
          intent: 'schedule', sentiment: 'positive', currentAgent: 'reception', routedToHuman: false,
          messages: [
            { id: 'demo-msg-1-1', direction: 'inbound', senderType: 'patient', content: 'Hola, necesito agendar mi cita de seguimiento para la revision del melanoma', createdAt: daysAgo(2, 9, 15) },
            { id: 'demo-msg-1-2', direction: 'outbound', senderType: 'agent', agentName: 'reception', content: 'Hola Maria! Claro, con gusto te ayudo a agendar tu cita de seguimiento. El Dr. Ruiz tiene disponibilidad este viernes a las 10:00 AM. Te queda bien?', aiGenerated: true, confidence: 0.95, createdAt: daysAgo(2, 9, 16) },
            { id: 'demo-msg-1-3', direction: 'inbound', senderType: 'patient', content: 'Si, perfecto! Confirmo para el viernes a las 10', createdAt: daysAgo(2, 9, 20) },
            { id: 'demo-msg-1-4', direction: 'outbound', senderType: 'agent', agentName: 'reception', content: 'Excelente! Tu cita queda confirmada para este viernes a las 10:00 AM con el Dr. Ruiz. Te enviamos un recordatorio 24 horas antes. Recuerda traer tus estudios de laboratorio. Nos vemos pronto!', aiGenerated: true, confidence: 0.92, createdAt: daysAgo(2, 9, 21) },
          ],
        },
        {
          id: 'demo-conv-2', patientId: 'demo-patient-3', channel: 'instagram', status: 'active',
          intent: 'inquiry', sentiment: 'neutral', currentAgent: 'reception', routedToHuman: false,
          messages: [
            { id: 'demo-msg-2-1', direction: 'inbound', senderType: 'patient', content: 'Hola, cuanto cuesta una consulta estetica? Tengo manchas en la cara que me gustaria tratar', createdAt: daysAgo(1, 14, 30) },
            { id: 'demo-msg-2-2', direction: 'outbound', senderType: 'agent', agentName: 'reception', content: 'Hola Ana! La consulta estetica tiene un costo de $2,000 MXN. En ella la Dra. Vega evaluara las manchas y te recomendara el mejor tratamiento. Quieres agendar una cita?', aiGenerated: true, confidence: 0.88, createdAt: daysAgo(1, 14, 31) },
            { id: 'demo-msg-2-3', direction: 'inbound', senderType: 'patient', content: 'Dejame pensarlo y les aviso, gracias!', createdAt: daysAgo(1, 14, 45) },
          ],
        },
        {
          id: 'demo-conv-3', patientId: 'demo-patient-5', channel: 'messenger', status: 'closed',
          intent: 'complaint', sentiment: 'negative', currentAgent: 'reception', routedToHuman: true,
          messages: [
            { id: 'demo-msg-3-1', direction: 'inbound', senderType: 'patient', content: 'Estoy muy inconforme. Llevo 40 minutos esperando y nadie me atiende.', createdAt: daysAgo(3, 11, 40) },
            { id: 'demo-msg-3-2', direction: 'outbound', senderType: 'agent', agentName: 'reception', content: 'Laura, lamento mucho la espera. Voy a transferirte con nuestro equipo para atenderte de inmediato.', aiGenerated: true, confidence: 0.72, createdAt: daysAgo(3, 11, 41) },
            { id: 'demo-msg-3-3', direction: 'outbound', senderType: 'system', content: 'Conversacion transferida a atencion humana.', createdAt: daysAgo(3, 11, 42) },
            { id: 'demo-msg-3-4', direction: 'outbound', senderType: 'staff', content: 'Hola Laura, disculpa la demora. Vamos a atenderte ahorita mismo. El doctor ya esta libre.', createdAt: daysAgo(3, 11, 50) },
          ],
        },
        {
          id: 'demo-conv-4', patientId: 'demo-patient-6', channel: 'whatsapp', status: 'active',
          intent: 'reschedule', sentiment: 'neutral', currentAgent: 'reception', routedToHuman: false,
          messages: [
            { id: 'demo-msg-4-1', direction: 'inbound', senderType: 'patient', content: 'Buenos dias, mi cita de manana la puedo cambiar para el jueves?', createdAt: daysAgo(0, 8, 10) },
            { id: 'demo-msg-4-2', direction: 'outbound', senderType: 'agent', agentName: 'reception', content: 'Hola Fernando! Claro, la Dra. Vega tiene disponibilidad el jueves a las 11:00 AM. Confirmo el cambio?', aiGenerated: true, confidence: 0.93, createdAt: daysAgo(0, 8, 11) },
            { id: 'demo-msg-4-3', direction: 'inbound', senderType: 'patient', content: 'Si, confirmo. Gracias!', createdAt: daysAgo(0, 8, 15) },
          ],
        },
        {
          id: 'demo-conv-5', patientId: 'demo-patient-2', channel: 'whatsapp', status: 'closed',
          intent: 'schedule', sentiment: 'positive', currentAgent: 'reception', routedToHuman: false,
          messages: [
            { id: 'demo-msg-5-1', direction: 'inbound', senderType: 'patient', content: 'Quiero agendar una consulta estetica con la Dra. Vega', createdAt: daysAgo(7, 10, 0) },
            { id: 'demo-msg-5-2', direction: 'outbound', senderType: 'agent', agentName: 'reception', content: 'Hola Carlos! La Dra. Vega tiene espacio este miercoles a las 1:00 PM para consulta estetica. Te funciona?', aiGenerated: true, confidence: 0.96, createdAt: daysAgo(7, 10, 1) },
            { id: 'demo-msg-5-3', direction: 'inbound', senderType: 'patient', content: 'Perfecto, ahi estare', createdAt: daysAgo(7, 10, 5) },
            { id: 'demo-msg-5-4', direction: 'outbound', senderType: 'agent', agentName: 'reception', content: 'Listo! Cita confirmada. Te esperamos!', aiGenerated: true, confidence: 0.94, createdAt: daysAgo(7, 10, 6) },
          ],
        },
        {
          id: 'demo-conv-6', patientId: 'demo-patient-8', channel: 'instagram', status: 'active',
          intent: 'inquiry', sentiment: 'neutral', currentAgent: 'marketing', routedToHuman: false,
          messages: [
            { id: 'demo-msg-6-1', direction: 'inbound', senderType: 'patient', content: 'Tienen promocion para tratamiento de manchas?', createdAt: daysAgo(0, 16, 30) },
            { id: 'demo-msg-6-2', direction: 'outbound', senderType: 'agent', agentName: 'marketing', content: 'Hola Miguel! Actualmente tenemos un 15% de descuento en paquetes de tratamiento laser para manchas. El paquete incluye 3 sesiones. Te interesa mas informacion?', aiGenerated: true, confidence: 0.85, createdAt: daysAgo(0, 16, 31) },
          ],
        },
      ]

      for (const conv of conversationsData) {
        await db.conversation.upsert({
          where: { id: conv.id },
          update: {},
          create: {
            id: conv.id, clinicId: clinic.id, patientId: conv.patientId, channel: conv.channel,
            status: conv.status, intent: conv.intent, sentiment: conv.sentiment,
            currentAgent: conv.currentAgent, routedToHuman: conv.routedToHuman ?? false,
            isMock: true, lastMessageAt: conv.messages[conv.messages.length - 1].createdAt,
          },
        })

        for (const msg of conv.messages) {
          await db.message.upsert({
            where: { id: msg.id },
            update: {},
            create: {
              id: msg.id, clinicId: clinic.id, conversationId: conv.id,
              direction: msg.direction, channel: conv.channel, senderType: msg.senderType,
              content: msg.content, agentName: (msg as Record<string, unknown>).agentName as string | undefined,
              aiGenerated: ((msg as Record<string, unknown>).aiGenerated as boolean) ?? false,
              confidence: (msg as Record<string, unknown>).confidence as number | undefined,
              isMock: true, createdAt: msg.createdAt,
            },
          })
        }
      }
      summary.conversations = conversationsData.length
      summary.messages = conversationsData.reduce((sum, c) => sum + c.messages.length, 0)
    } else {
      summary.conversations = existingConversations
      const existingMessages = await db.message.count({ where: { clinicId: clinic.id } })
      summary.messages = existingMessages
    }

    // ─── 11. FEATURE FLAGS ─────────────────────────────────
    const featureFlags = [
      { module: 'desk', feature: 'auto-reply', state: 'assist' },
      { module: 'desk', feature: 'appointment', state: 'assist' },
      { module: 'flow', feature: 'soap', state: 'assist' },
      { module: 'flow', feature: 'preconsulta', state: 'on' },
      { module: 'bill', feature: 'auto-cfdi', state: 'assist' },
      { module: 'bill', feature: 'reminders', state: 'off' },
      { module: 'grow', feature: 'reactivation', state: 'assist' },
      { module: 'grow', feature: 'segments', state: 'on' },
      { module: 'sight', feature: 'alerts', state: 'on' },
      { module: 'sight', feature: 'reports', state: 'assist' },
      { module: 'hub', feature: 'scheduling', state: 'off' },
      { module: 'hub', feature: 'inventory', state: 'off' },
    ]

    for (const flag of featureFlags) {
      await db.featureFlag.upsert({
        where: { clinicId_module_feature: { clinicId: clinic.id, module: flag.module, feature: flag.feature } },
        update: {},
        create: { clinicId: clinic.id, module: flag.module, feature: flag.feature, state: flag.state },
      })
    }
    summary.featureFlags = featureFlags.length

    // ─── 12. SOAP NOTES ────────────────────────────────────
    const existingSoapNotes = await db.soapNote.count({ where: { clinicId: clinic.id } })

    if (existingSoapNotes === 0) {
      await db.soapNote.upsert({
        where: { id: 'demo-soap-1' },
        update: {},
        create: {
          id: 'demo-soap-1', clinicId: clinic.id, patientId: 'demo-patient-1',
          appointmentId: 'demo-apt-6', doctorId: 'demo-doctor-1',
          subjective: 'Paciente femenina de 36 anos que acude a sesion de tratamiento laser para melanoma in situ en antebrazo izquierdo. Refiere buena tolerancia a sesiones previas. No refiere dolor, ardor ni cambios en la lesion. Ha seguido indicaciones de proteccion solar.',
          objective: 'Antebrazo izquierdo: lesion hiperpigmentada de 8mm, bordes bien definidos, sin cambios de tamano ni color respecto a sesion anterior. Piel perilesional sin alteraciones. No signos de inflamacion ni infeccion. Vitales: TA 118/76, FC 72, Temp 36.4C.',
          assessment: 'Melanoma in situ en antebrazo izquierdo en tratamiento con laser. Evolucion favorable sin progresion. Se continua esquema de sesiones quincenales. Diagnostico CIE-10: D03.2.',
          plan: '1. Continuar tratamiento laser quincenal (3 sesiones restantes). 2. Proteccion solar SPF 50+ estricta. 3. Revision dermatologica en 4 semanas. 4. Biopsia de control en 3 meses si no hay mejoria. 5. Entregar informe a oncologo tratante.',
          aiGenerated: true, aiSuggested: true, doctorApproved: true,
          doctorSignedAt: daysAgo(2, 9, 50),
          vitals: JSON.stringify({ bp: '118/76', hr: 72, temp: 36.4, weight: 62 }),
          diagnosis: 'Melanoma in situ - antebrazo izquierdo (D03.2)',
          prescriptions: JSON.stringify([{ medication: 'Protector solar SPF 50+', frequency: 'Cada 2 horas', duration: 'Indefinido' }]),
        },
      })

      await db.soapNote.upsert({
        where: { id: 'demo-soap-2' },
        update: {},
        create: {
          id: 'demo-soap-2', clinicId: clinic.id, patientId: 'demo-patient-2',
          appointmentId: 'demo-apt-4', doctorId: 'demo-doctor-1',
          subjective: 'Paciente masculino de 49 anos con acne cronico en cara. Refiere mejoria parcial con tratamiento de retinoides topicos. Presenta brote leve en zona mandibular desde hace 1 semana. Niega uso de nuevos productos cosmeticos. Ha cumplido con esquema de aplicacion nocturna.',
          objective: 'Piel facial con comedones no inflamatorios en zona frontal y nasal. Papulas eritematosas en region mandibular bilateral (4-5 lesiones). No nodulos ni quistes. Piel seca en zonas de aplicacion de retinoides. Escala de severidad: leve-moderada.',
          assessment: 'Acne vulgar cronico leve-moderado en brote mandibular. Buena respuesta parcial a retinoico topico. Posible ajuste de tratamiento. Diagnostico CIE-10: L70.0.',
          plan: '1. Ajustar retinoide topico a concentracion mayor (0.05% a 0.1%). 2. Agregar acido azelaico al manejo matutino. 3. Hidratacion facial con crema libre de aceite. 4. Control en 4 semanas. 5. Considerar terapia combinada si no mejoria.',
          aiGenerated: true, aiSuggested: true, doctorApproved: false, doctorSignedAt: null,
          vitals: JSON.stringify({ bp: '124/82', hr: 68, temp: 36.6, weight: 78 }),
          diagnosis: 'Acne vulgar cronico - leve moderado (L70.0)',
          prescriptions: JSON.stringify([
            { medication: 'Tretinoina 0.1% crema', frequency: 'Noche', duration: '4 semanas' },
            { medication: 'Acido azelaico 15% gel', frequency: 'Manana', duration: '4 semanas' },
            { medication: 'Hidratante libre de aceite', frequency: 'Manana y noche', duration: 'Indefinido' },
          ]),
        },
      })
      summary.soapNotes = 2
    } else {
      summary.soapNotes = existingSoapNotes
    }

    // ─── 13. EVENT BUS ─────────────────────────────────────
    const existingEvents = await db.eventBus.count({ where: { clinicId: clinic.id } })

    if (existingEvents === 0) {
      const eventsData = [
        { id: 'demo-event-1', eventType: 'cita_agendada', sourceAgent: 'desk', targetAgent: 'grow', payload: JSON.stringify({ appointmentId: 'demo-apt-1', patientId: 'demo-patient-1', patientName: 'Maria Garcia Lopez', doctorId: 'demo-doctor-1', date: today().toISOString(), service: 'Revision dermatologica' }), status: 'processed', processedAt: daysAgo(2, 9, 22), createdAt: daysAgo(2, 9, 21) },
        { id: 'demo-event-2', eventType: 'factura_generada', sourceAgent: 'bill', targetAgent: 'desk', payload: JSON.stringify({ invoiceId: 'demo-inv-1', patientId: 'demo-patient-1', patientName: 'Maria Garcia Lopez', total: 3248, status: 'timbrada' }), status: 'processed', processedAt: daysAgo(2, 10, 0), createdAt: daysAgo(2, 9, 55) },
        { id: 'demo-event-3', eventType: 'soap_borrador_listo', sourceAgent: 'flow', targetAgent: 'desk', payload: JSON.stringify({ soapNoteId: 'demo-soap-2', patientId: 'demo-patient-2', patientName: 'Carlos Mendoza Rivera', appointmentId: 'demo-apt-4' }), status: 'pending', createdAt: daysAgo(1, 16, 50) },
        { id: 'demo-event-4', eventType: 'cita_completada', sourceAgent: 'desk', targetAgent: 'bill', payload: JSON.stringify({ appointmentId: 'demo-apt-5', patientId: 'demo-patient-7', patientName: 'Isabel Reyes Castillo', doctorId: 'demo-doctor-2', service: 'Consulta general', price: 1200 }), status: 'processed', processedAt: daysAgo(1, 14, 50), createdAt: daysAgo(1, 14, 45) },
        { id: 'demo-event-5', eventType: 'paciente_nuevo', sourceAgent: 'desk', targetAgent: 'grow', payload: JSON.stringify({ patientId: 'demo-patient-6', name: 'Fernando Diaz Vega', source: 'walk_in', firstVisit: daysAgo(3).toISOString() }), status: 'processed', processedAt: daysAgo(3, 10, 30), createdAt: daysAgo(3, 10, 15) },
        { id: 'demo-event-6', eventType: 'cita_cancelada', sourceAgent: 'desk', targetAgent: 'grow', payload: JSON.stringify({ appointmentId: 'demo-apt-7', patientId: 'demo-patient-5', patientName: 'Laura Patricia Morales', doctorId: 'demo-doctor-1', service: 'Consulta estetica', reason: 'Conflicto de horario' }), status: 'processed', processedAt: daysAgo(3, 12, 5), createdAt: daysAgo(3, 12, 0) },
        { id: 'demo-event-7', eventType: 'pago_recibido', sourceAgent: 'bill', targetAgent: null, payload: JSON.stringify({ invoiceId: 'demo-inv-2', patientId: 'demo-patient-2', patientName: 'Carlos Mendoza Rivera', amount: 1740, formaPago: 'Tarjeta' }), status: 'processed', processedAt: daysAgo(1, 17, 5), createdAt: daysAgo(1, 17, 0) },
        { id: 'demo-event-8', eventType: 'mensaje_recibido', sourceAgent: 'desk', targetAgent: null, payload: JSON.stringify({ conversationId: 'demo-conv-6', patientId: 'demo-patient-8', patientName: 'Miguel Angel Torres', channel: 'Instagram', content: 'Tienen promocion para tratamiento de manchas?' }), status: 'pending', createdAt: daysAgo(0, 16, 30) },
        { id: 'demo-event-9', eventType: 'campana_lanzada', sourceAgent: 'grow', targetAgent: null, payload: JSON.stringify({ campaignId: 'reactivation-inactive', campaignName: 'Reactivacion pacientes inactivos', segment: 'inactive', recipientCount: 23 }), status: 'pending', createdAt: daysAgo(0, 9, 0) },
      ]

      for (const evt of eventsData) {
        await db.eventBus.upsert({
          where: { id: evt.id },
          update: {},
          create: { ...evt, clinicId: clinic.id },
        })
      }
      summary.events = eventsData.length
    } else {
      summary.events = existingEvents
    }

    // ─── 14. NOTIFICATIONS ─────────────────────────────────
    const existingNotifications = await db.notification.count({ where: { clinicId: clinic.id } })

    if (existingNotifications === 0) {
      const notificationsData = [
        { id: 'demo-notif-1', type: 'payment', title: 'Pago recibido', message: 'Roberto Jimenez Salazar — $4,060 MXN', icon: 'CheckCircle2', actionUrl: '/?module=bill', isRead: true },
        { id: 'demo-notif-2', type: 'appointment', title: 'Cita reagendada', message: 'Fernando Diaz Vega — Consulta general', icon: 'Calendar', actionUrl: '/?module=agenda', isRead: false },
        { id: 'demo-notif-3', type: 'invoice', title: 'Factura pendiente', message: 'Isabel Reyes Castillo — $1,392 MXN', icon: 'Receipt', actionUrl: '/?module=bill', isRead: false },
      ]

      for (const notif of notificationsData) {
        await db.notification.upsert({
          where: { id: notif.id },
          update: {},
          create: { ...notif, clinicId: clinic.id, createdAt: daysAgo(notif.isRead ? 3 : 1, Math.floor(Math.random() * 12) + 8) },
        })
      }
      summary.notifications = notificationsData.length
    } else {
      summary.notifications = existingNotifications
    }

    return NextResponse.json({
      seeded: true,
      message: 'Demo data seeded successfully',
      clinicId: clinic.id,
      clinicSlug: clinic.slug,
      summary,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Demo seed error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
