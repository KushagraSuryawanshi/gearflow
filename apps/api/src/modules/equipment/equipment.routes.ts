import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/db.js';
import { ApiError } from '../../lib/errors.js';
import { idParamsSchema, parse } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import { listBookingsForEquipment } from '../bookings/booking.service.js';
const equipmentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullish(),
  categoryId: z.string().min(1),
});

const maintenanceSchema = z.object({ underMaintenance: z.boolean() });

const listQuerySchema = z.object({ categoryId: z.string().min(1).optional() });

// Exactly the fields of the Equipment object in the API contract.
const equipmentSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  category: { select: { id: true, name: true } },
} as const;

async function requireExistingCategory(categoryId: string): Promise<void> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new ApiError('VALIDATION_ERROR', 'categoryId does not match an existing category.');
  }
}

export const equipmentRouter = Router();

equipmentRouter.use(authenticate);

equipmentRouter.get('/', async (req, res) => {
  const { categoryId } = parse(listQuerySchema, req.query);
  const equipment = await prisma.equipment.findMany({
    where: categoryId ? { categoryId } : {},
    select: equipmentSelect,
    orderBy: { name: 'asc' },
  });
  res.json({ data: equipment });
});

equipmentRouter.get('/:id', async (req, res) => {
  const { id } = parse(idParamsSchema, req.params);
  const equipment = await prisma.equipment.findUnique({ where: { id }, select: equipmentSelect });
  if (!equipment) {
    throw new ApiError('NOT_FOUND', 'Equipment not found.');
  }
  res.json({ data: equipment });
});

equipmentRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const { name, description, categoryId } = parse(equipmentSchema, req.body);
  await requireExistingCategory(categoryId);
  const equipment = await prisma.equipment.create({
    data: { name, description: description ?? null, categoryId },
    select: equipmentSelect,
  });
  res.status(201).json({ data: equipment });
});

equipmentRouter.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const { id } = parse(idParamsSchema, req.params);
  const { name, description, categoryId } = parse(equipmentSchema, req.body);
  await requireExistingCategory(categoryId);
  const equipment = await prisma.equipment.update({
    where: { id },
    data: { name, description: description ?? null, categoryId },
    select: equipmentSelect,
  });
  res.json({ data: equipment });
});

equipmentRouter.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const { id } = parse(idParamsSchema, req.params);
  await prisma.equipment.delete({ where: { id } });
  res.json({ data: { id } });
});

equipmentRouter.patch('/:id/maintenance', requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const { id } = parse(idParamsSchema, req.params);
  const { underMaintenance } = parse(maintenanceSchema, req.body);
  const equipment = await prisma.equipment.update({
    where: { id },
    data: { status: underMaintenance ? 'UNDER_MAINTENANCE' : 'AVAILABLE' },
    select: equipmentSelect,
  });
  res.json({ data: equipment });
});
equipmentRouter.get('/:id/bookings', requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const { id } = parse(idParamsSchema, req.params);
  res.json({ data: await listBookingsForEquipment(id) });
});
