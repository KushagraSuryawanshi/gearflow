import type { Role } from '@prisma/client';
import { prisma } from './lib/db.js';
import { hashPassword } from './lib/password.js';

// Demo-only credentials for local development and the staging demo.
const DEMO_PASSWORD = 'GearFlow-demo-1';

const demoUsers: { name: string; email: string; role: Role }[] = [
  { name: 'Demo Borrower', email: 'borrower@gearflow.test', role: 'BORROWER' },
  { name: 'Demo Staff', email: 'staff@gearflow.test', role: 'STAFF' },
  { name: 'Demo Admin', email: 'admin@gearflow.test', role: 'ADMIN' },
];

const equipmentByCategory: Record<string, { name: string; description: string }[]> = {
  Cameras: [
    { name: 'Canon EOS R6', description: 'Full-frame mirrorless camera with 24-105mm lens' },
    { name: 'Sony A7 III', description: 'Full-frame mirrorless camera with kit lens' },
  ],
  Audio: [
    { name: 'Rode NT1 Microphone', description: 'Studio condenser microphone with shock mount' },
    { name: 'Zoom H6 Recorder', description: 'Six-track portable audio recorder' },
  ],
  Lighting: [
    { name: 'Aputure 300D Light', description: 'Continuous LED light with softbox' },
    { name: 'Manfrotto Tripod', description: 'Aluminium tripod with fluid head' },
  ],
};

async function seed(): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('Refusing to seed demo data in production');
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, passwordHash },
      create: { ...user, passwordHash },
    });
  }

  for (const [categoryName, items] of Object.entries(equipmentByCategory)) {
    const category = await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName },
    });
    for (const item of items) {
      // Equipment names are not unique in the schema, so check before creating to keep re-runs safe.
      const existing = await prisma.equipment.findFirst({ where: { name: item.name } });
      if (existing) {
        await prisma.equipment.update({
          where: { id: existing.id },
          data: { ...item, categoryId: category.id, status: 'AVAILABLE' },
        });
      } else {
        await prisma.equipment.create({ data: { ...item, categoryId: category.id } });
      }
    }
  }

  console.log('Seeded demo users, categories and equipment');
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
