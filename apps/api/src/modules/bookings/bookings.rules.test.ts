import type { BookingStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { assertCanMove, assertValidDateRange } from './booking.rules.js';

const allStatuses: BookingStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'COLLECTED',
  'RETURNED',
  'CANCELLED',
];

const validMoves: [BookingStatus, BookingStatus][] = [
  ['PENDING', 'APPROVED'],
  ['PENDING', 'REJECTED'],
  ['PENDING', 'CANCELLED'],
  ['APPROVED', 'COLLECTED'],
  ['APPROVED', 'CANCELLED'],
  ['COLLECTED', 'RETURNED'],
];

describe('assertCanMove', () => {
  it.each(validMoves)('allows %s to %s', (from, to) => {
    expect(() => assertCanMove(from, to)).not.toThrow();
  });

  const invalidMoves = allStatuses.flatMap((from) =>
    allStatuses
      .filter(
        (to) => !validMoves.some(([validFrom, validTo]) => validFrom === from && validTo === to),
      )
      .map((to): [BookingStatus, BookingStatus] => [from, to]),
  );

  it.each(invalidMoves)('blocks %s to %s', (from, to) => {
    expect(() => assertCanMove(from, to)).toThrow(
      expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }),
    );
  });
});

describe('assertValidDateRange', () => {
  it('accepts a range where start is before end', () => {
    expect(() => assertValidDateRange('2026-11-10', '2026-11-12')).not.toThrow();
  });

  it('accepts a single-day booking', () => {
    expect(() => assertValidDateRange('2026-11-10', '2026-11-10')).not.toThrow();
  });

  it('rejects a start date after the end date', () => {
    expect(() => assertValidDateRange('2026-11-12', '2026-11-10')).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    );
  });
});
