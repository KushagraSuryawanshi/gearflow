import { prisma } from '../../lib/db.js';
import { ApiError } from '../../lib/errors.js';
import type { AuthUser } from '../../middleware/authenticate.js';
import { bookingSelect, toBookingResponse } from './booking.dto.js';
import { assertCanMove, assertValidDateRange } from './booking.rules.js';

export interface CreateBookingInput {
  equipmentId: string;
  startDate: string;
  endDate: string;
}

// Only APPROVED and COLLECTED bookings hold the equipment. Both dates are inclusive, which matches the database constraint that backs this check.
async function hasActiveOverlap(equipmentId: string, startDate: Date, endDate: Date) {
  const count = await prisma.booking.count({
    where: {
      equipmentId,
      status: { in: ['APPROVED', 'COLLECTED'] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });
  return count > 0;
}

export async function createBooking(borrowerId: string, input: CreateBookingInput) {
  assertValidDateRange(input.startDate, input.endDate);

  const equipment = await prisma.equipment.findUnique({
    where: { id: input.equipmentId },
    select: { status: true },
  });
  if (!equipment) {
    throw new ApiError('NOT_FOUND', 'Equipment not found.');
  }
  if (equipment.status === 'UNDER_MAINTENANCE') {
    throw new ApiError(
      'EQUIPMENT_UNDER_MAINTENANCE',
      'This equipment is under maintenance and cannot be booked.',
    );
  }

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  if (await hasActiveOverlap(input.equipmentId, startDate, endDate)) {
    throw new ApiError(
      'BOOKING_CONFLICT',
      'This equipment is already booked for the selected dates.',
    );
  }

  const booking = await prisma.booking.create({
    data: { equipmentId: input.equipmentId, borrowerId, startDate, endDate },
    select: bookingSelect,
  });
  return toBookingResponse(booking);
}

export async function listMyBookings(borrowerId: string) {
  const bookings = await prisma.booking.findMany({
    where: { borrowerId },
    select: bookingSelect,
    orderBy: { createdAt: 'desc' },
  });
  return bookings.map(toBookingResponse);
}

export async function cancelBooking(user: AuthUser, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { borrowerId: true, status: true },
  });
  if (!booking) {
    throw new ApiError('NOT_FOUND', 'Booking not found.');
  }
  if (booking.borrowerId !== user.id) {
    throw new ApiError('FORBIDDEN', 'Only the borrower can cancel this booking.');
  }
  assertCanMove(booking.status, 'CANCELLED');

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' },
    select: bookingSelect,
  });
  return toBookingResponse(updated);
}
