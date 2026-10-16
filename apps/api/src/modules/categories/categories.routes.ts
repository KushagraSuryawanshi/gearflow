import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/db.js';
import { idParamsSchema, parse } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';

const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

const categorySelect = { id: true, name: true } as const;

export const categoriesRouter = Router();

categoriesRouter.use(authenticate);

categoriesRouter.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    select: categorySelect,
    orderBy: { name: 'asc' },
  });
  res.json({ data: categories });
});

categoriesRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const { name } = parse(categorySchema, req.body);
  const category = await prisma.category.create({ data: { name }, select: categorySelect });
  res.status(201).json({ data: category });
});
categoriesRouter.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const { id } = parse(idParamsSchema, req.params);
  const { name } = parse(categorySchema, req.body);
  const category = await prisma.category.update({
    where: { id },
    data: { name },
    select: categorySelect,
  });
  res.json({ data: category });
});

categoriesRouter.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const { id } = parse(idParamsSchema, req.params);
  await prisma.category.delete({ where: { id } });
  res.json({ data: { id } });
});
