import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/db.js';
import { ApiError } from '../../lib/errors.js';
import { idParamsSchema, parse } from '../../lib/validate.js';
import { authenticate, currentUser } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';

const roleSchema = z.object({ role: z.enum(['BORROWER', 'STAFF', 'ADMIN']) });

// Exactly the fields of the User object in the API contract; never the password hash.
const userSelect = { id: true, name: true, email: true, role: true } as const;

export const usersRouter = Router();

usersRouter.use(authenticate, requireRole('ADMIN'));

usersRouter.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({ select: userSelect, orderBy: { name: 'asc' } });
  res.json({ data: users });
});

usersRouter.patch('/:id/role', async (req, res) => {
  const { id } = parse(idParamsSchema, req.params);
  const { role } = parse(roleSchema, req.body);

  // Otherwise the last admin could demote themselves and nobody could manage users any more.
  if (id === currentUser(req).id) {
    throw new ApiError('FORBIDDEN', 'You cannot change your own role.');
  }

  const user = await prisma.user.update({ where: { id }, data: { role }, select: userSelect });
  res.json({ data: user });
});
