import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { ApiError } from '../lib/errors.js';

export function requireRole(...allowed: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      throw new ApiError('UNAUTHORIZED', 'Login required');
    }
    if (!allowed.includes(req.user.role)) {
      throw new ApiError('FORBIDDEN', 'You do not have permission to do this');
    }
    next();
  };
}
