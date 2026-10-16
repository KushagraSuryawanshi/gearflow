import type { BookingStatus } from '@prisma/client';
import { ApiError } from '../../lib/errors.js';

// PENDING -> APPROVED -> COLLECTED -> RETURNED, with REJECTED and CANCELLED as dead ends.
// A borrower cannot cancel after collection because COLLECTED can only move to RETURNED.
export const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['COLLECTED', 'CANCELLED'],
  COLLECTED: ['RETURNED'],
  REJECTED: [],
  CANCELLED: [],
  RETURNED: [],
};

export function assertCanMove(from: BookingStatus, to: BookingStatus): void {
  if (!allowedTransitions[from].includes(to)) {
    throw new ApiError('INVALID_STATUS_TRANSITION', `A ${from} booking cannot become ${to}.`);
  }
}

// ISO dates (YYYY-MM-DD) sort the same way as the dates they represent.
export function assertValidDateRange(startDate: string, endDate: string): void {
  if (startDate > endDate) {
    throw new ApiError('VALIDATION_ERROR', 'startDate must not be after endDate.');
  }
}
