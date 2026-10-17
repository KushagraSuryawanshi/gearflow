import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { ApiError } from '../lib/errors.js';
import { verifyToken } from '../lib/token.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError('UNAUTHORIZED', 'Missing bearer token');
  }

  let userId: string;
  try {
    userId = verifyToken(header.slice('Bearer '.length));
  } catch {
    throw new ApiError('UNAUTHORIZED', 'Invalid or expired token');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) {
    throw new ApiError('UNAUTHORIZED', 'User no longer exists');
  }

  req.user = user;
  next();
}
export function currentUser(req: Request): AuthUser {
  if (!req.user) {
    throw new ApiError('UNAUTHORIZED', 'Login required');
  }
  return req.user;
}
