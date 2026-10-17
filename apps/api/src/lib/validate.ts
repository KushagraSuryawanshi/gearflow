import { z, type ZodType } from 'zod';
import { ApiError } from './errors.js';

export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');
    throw new ApiError('VALIDATION_ERROR', message);
  }
  return result.data;
}

export const idParamsSchema = z.object({ id: z.string().min(1) });
