export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BOOKING_CONFLICT'
  | 'EQUIPMENT_UNDER_MAINTENANCE'
  | 'INVALID_STATUS_TRANSITION'
  | 'SELF_APPROVAL_NOT_ALLOWED';

const statusByCode: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  INVALID_CREDENTIALS: 401,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BOOKING_CONFLICT: 409,
  EQUIPMENT_UNDER_MAINTENANCE: 409,
  INVALID_STATUS_TRANSITION: 409,
  SELF_APPROVAL_NOT_ALLOWED: 403,
};

export class ApiError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.status = statusByCode[code];
  }
}
