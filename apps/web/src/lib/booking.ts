import type { Booking, BookingStatus, User } from '../types/api';

export const statusLabels: Record<BookingStatus, string> = {
  PENDING: 'Pending review',
  APPROVED: 'Ready to collect',
  COLLECTED: 'On loan',
  RETURNED: 'Returned',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export function canCancel(booking: Booking, user: User) {
  return booking.borrower.id === user.id && ['PENDING', 'APPROVED'].includes(booking.status);
}

export function canApprove(booking: Booking, user: User) {
  return (
    user.role !== 'BORROWER' && booking.status === 'PENDING' && booking.borrower.id !== user.id
  );
}

export function validateDates(start: string, end: string) {
  if (!start || !end) return 'Choose a start date and an end date.';
  if (start > end) return 'The end date must be on or after the start date.';
  return null;
}

export function formatDate(date: string) {
  // Date-only booking values must not shift to the previous day in another timezone.
  const value = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`) : new Date(date);
  if (Number.isNaN(value.getTime())) return date;
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

export function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
