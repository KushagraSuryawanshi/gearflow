import type { BookingStatus } from '@prisma/client';
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

// Only APPROVED and COLLECTED bookings hold the equipment. Both dates are inclusive,
// which matches the database constraint that backs this check.
async function hasActiveOverlap(
  equipmentId: string,
  startDate: Date,
  endDate: Date,
  ignoreBookingId?: string,
) {
  const count = await prisma.booking.count({
    where: {
      equipmentId,
      status: { in: ['APPROVED', 'COLLECTED'] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      ...(ignoreBookingId ? { id: { not: ignoreBookingId } } : {}),
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

async function findBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { borrowerId: true, equipmentId: true, startDate: true, endDate: true, status: true },
  });
  if (!booking) {
    throw new ApiError('NOT_FOUND', 'Booking not found.');
  }
  return booking;
}

async function setStatus(bookingId: string, status: BookingStatus) {
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status },
    select: bookingSelect,
  });
  return toBookingResponse(updated);
}

export async function listPendingBookings() {
  const bookings = await prisma.booking.findMany({
    where: { status: 'PENDING' },
    select: bookingSelect,
    orderBy: { createdAt: 'asc' },
  });
  return bookings.map(toBookingResponse);
}

// Active loans: approved bookings waiting for collection and collected ones waiting for return.
export async function listActiveBookings() {
  const bookings = await prisma.booking.findMany({
    where: { status: { in: ['APPROVED', 'COLLECTED'] } },
    select: bookingSelect,
    orderBy: { startDate: 'asc' },
  });
  return bookings.map(toBookingResponse);
}

export async function listBookingsForEquipment(equipmentId: string) {
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { id: true },
  });
  if (!equipment) {
    throw new ApiError('NOT_FOUND', 'Equipment not found.');
  }
  const bookings = await prisma.booking.findMany({
    where: { equipmentId },
    select: bookingSelect,
    orderBy: { startDate: 'desc' },
  });
  return bookings.map(toBookingResponse);
}

export async function reviewBooking(
  reviewer: AuthUser,
  bookingId: string,
  decision: 'APPROVED' | 'REJECTED',
) {
  const booking = await findBooking(bookingId);

  if (decision === 'APPROVED' && booking.borrowerId === reviewer.id) {
    throw new ApiError('SELF_APPROVAL_NOT_ALLOWED', 'You cannot approve your own booking request.');
  }
  assertCanMove(booking.status, decision);

  if (decision === 'REJECTED') {
    return setStatus(bookingId, decision);
  }

  // Pending requests may overlap each other, so the check must be repeated at approval.
  const overlaps = await hasActiveOverlap(
    booking.equipmentId,
    booking.startDate,
    booking.endDate,
    bookingId,
  );
  if (overlaps) {
    throw new ApiError(
      'BOOKING_CONFLICT',
      'This equipment is already booked for the selected dates.',
    );
  }

  try {
    return await setStatus(bookingId, decision);
  } catch (error) {
    // Two approvals can pass the check above at the same moment; the database constraint stops the second one, and it must look like any other booking conflict.
    if (error instanceof Error && error.message.includes('booking_no_overlap')) {
      throw new ApiError(
        'BOOKING_CONFLICT',
        'This equipment is already booked for the selected dates.',
      );
    }
    throw error;
  }
}

export async function collectBooking(bookingId: string) {
  const booking = await findBooking(bookingId);
  assertCanMove(booking.status, 'COLLECTED');
  return setStatus(bookingId, 'COLLECTED');
}

export async function returnBooking(bookingId: string) {
  const booking = await findBooking(bookingId);
  assertCanMove(booking.status, 'RETURNED');
  return setStatus(bookingId, 'RETURNED');
}
