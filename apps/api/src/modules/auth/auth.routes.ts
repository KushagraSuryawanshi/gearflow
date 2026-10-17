import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/db.js';
import { ApiError } from '../../lib/errors.js';
import { verifyPassword } from '../../lib/password.js';
import { signToken } from '../../lib/token.js';
import { parse } from '../../lib/validate.js';
import { authenticate } from '../../middleware/authenticate.js';

const loginSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = parse(loginSchema, req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  // Unknown email and wrong password give the same answer so the API does not reveal which emails exist.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError('INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  res.json({
    data: {
      token: signToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    },
  });
});

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ data: req.user });
});
