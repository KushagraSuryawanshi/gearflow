import type { BookingStatus, EquipmentStatus, Role } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { hashPassword } from '../lib/password.js';
import { signToken } from '../lib/token.js';

export const TEST_PASSWORD = 'Test-password-1';

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE "Booking", "Equipment", "Category", "User" CASCADE');
}

let userCount = 0;

export async function createUser(role: Role = 'BORROWER') {
  userCount += 1;
  const user = await prisma.user.create({
    data: {
      name: `Test ${role} ${userCount}`,
      email: `${role.toLowerCase()}${userCount}@test.dev`,
      passwordHash: await hashPassword(TEST_PASSWORD),
      role,
    },
  });
  return { user, token: signToken(user.id) };
}

export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
export function createCategory(name = 'Cameras') {
  return prisma.category.create({ data: { name } });
}

export function createEquipment(
  categoryId: string,
  name = 'Test Camera',
  status: EquipmentStatus = 'AVAILABLE',
) {
  return prisma.equipment.create({ data: { name, categoryId, status } });
}

// Inserts a booking directly, so tests can set up any status without going through the API.
export function insertBooking(options: {
  equipmentId: string;
  borrowerId: string;
  startDate: string;
  endDate: string;
  status?: BookingStatus;
}) {
  return prisma.booking.create({
    data: {
      equipmentId: options.equipmentId,
      borrowerId: options.borrowerId,
      startDate: new Date(options.startDate),
      endDate: new Date(options.endDate),
      status: options.status ?? 'PENDING',
    },
  });
}
