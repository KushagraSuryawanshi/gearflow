import { describe, expect, it } from 'vitest';
import { canApprove, canCancel, formatDate, validateDates } from '../../src/lib/booking';
import type { Booking, BookingStatus, User } from '../../src/types/api';

const borrower: User = {
  id: 'borrower',
  name: 'Alex',
  email: 'alex@example.test',
  role: 'BORROWER',
};
const staff: User = { id: 'staff', name: 'Sam', email: 'sam@example.test', role: 'STAFF' };
const booking: Booking = {
  id: 'booking',
  equipment: { id: 'camera', name: 'Camera #001' },
  borrower,
  startDate: '2026-11-05',
  endDate: '2026-11-07',
  status: 'PENDING',
  createdAt: '2026-10-17T10:00:00Z',
  updatedAt: '2026-10-17T10:00:00Z',
};

describe('booking controls', () => {
  it.each(['PENDING', 'APPROVED'] as BookingStatus[])(
    'lets the owner cancel a %s booking',
    (status) => {
      expect(canCancel({ ...booking, status }, borrower)).toBe(true);
      expect(canCancel({ ...booking, status }, staff)).toBe(false);
    },
  );
  it.each(['COLLECTED', 'RETURNED', 'REJECTED', 'CANCELLED'] as BookingStatus[])(
    'does not offer cancellation after %s',
    (status) => {
      expect(canCancel({ ...booking, status }, borrower)).toBe(false);
    },
  );
  it('requires a different staff or admin account for approval', () => {
    expect(canApprove(booking, staff)).toBe(true);
    expect(canApprove(booking, { ...staff, role: 'ADMIN' })).toBe(true);
    expect(canApprove(booking, borrower)).toBe(false);
    expect(canApprove({ ...booking, borrower: staff }, staff)).toBe(false);
    expect(canApprove({ ...booking, status: 'APPROVED' }, staff)).toBe(false);
  });
  it('accepts same-day bookings and rejects reversed or missing dates', () => {
    expect(validateDates('2026-11-05', '2026-11-05')).toBeNull();
    expect(validateDates('2026-11-05', '2026-11-07')).toBeNull();
    expect(validateDates('2026-11-07', '2026-11-05')).toMatch(/end date/);
    expect(validateDates('', '')).toMatch(/Choose/);
  });
  it('formats a date-only value without moving to the previous day', () => {
    expect(formatDate('2026-11-05')).toBe('5 Nov 2026');
  });
});
