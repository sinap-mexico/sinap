import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create demo clinic
  const clinic = await prisma.clinic.upsert({
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
    },
  })

  // Create demo doctor
  const doctor = await prisma.doctor.upsert({
    where: { id: 'demo-doctor-1' },
    update: {},
    create: {
      id: 'demo-doctor-1',
      clinicId: clinic.id,
      name: 'Dr. Alejandro Ruiz',
      email: 'aruiz@clinicasanangel.mx',
      phone: '+52 55 1234 5678',
      specialty: 'Dermatologia',
      license: '12345678',
      color: '#1D9E75',
      workDays: '1,2,3,4,5',
      workStart: '09:00',
      workEnd: '18:00',
      slotMinutes: 30,
    },
  })

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo1234', 12)
  await prisma.user.upsert({
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

  // Create demo services
  const services = [
    { name: 'Consulta general', duration: 30, price: 1200, category: 'Consulta' },
    { name: 'Revision dermatologica', duration: 45, price: 1500, category: 'Consulta' },
    { name: 'Tratamiento laser', duration: 45, price: 2800, category: 'Procedimiento' },
    { name: 'Crioterapia', duration: 30, price: 1800, category: 'Procedimiento' },
    { name: 'Biopsia', duration: 60, price: 3500, category: 'Procedimiento' },
    { name: 'Consulta estetica', duration: 30, price: 2000, category: 'Estetica' },
  ]

  for (const svc of services) {
    await prisma.service.upsert({
      where: { id: `svc-${svc.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `svc-${svc.name.toLowerCase().replace(/\s+/g, '-')}`,
        clinicId: clinic.id,
        ...svc,
      },
    })
  }

  console.log('Seed completed successfully')
  console.log('Demo user: demo@sinap.health / demo1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
