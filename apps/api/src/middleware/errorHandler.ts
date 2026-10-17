import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../lib/errors.js';

function isBodyParseError(error: unknown): boolean {
  return error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed';
}

// Turns the common database failures into the API's own errors, so route code does not repeat this.
function fromPrismaError(error: unknown): ApiError | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return undefined;
  }
  switch (error.code) {
    case 'P2025':
      return new ApiError('NOT_FOUND', 'Record not found.');
    case 'P2002':
      return new ApiError('CONFLICT', 'A record with this value already exists.');
    case 'P2003':
      return new ApiError('CONFLICT', 'This record is still in use by other records.');
    default:
      return undefined;
  }
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new ApiError('NOT_FOUND', 'Route not found'));
};

// Express only treats a function as an error handler if it declares all four parameters.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const apiError = error instanceof ApiError ? error : fromPrismaError(error);
  if (apiError) {
    res.status(apiError.status).json({ error: { code: apiError.code, message: apiError.message } });
    return;
  }
  if (isBodyParseError(error)) {
    res
      .status(400)
      .json({ error: { code: 'VALIDATION_ERROR', message: 'Body is not valid JSON' } });
    return;
  }
  console.error(error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
};
