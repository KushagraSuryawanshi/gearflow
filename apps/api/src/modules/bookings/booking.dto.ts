import type { Prisma } from '@prisma/client';

// Exactly the fields of the Booking object in the API contract.
export const bookingSelect = {
  id: true,
  equipment: { select: { id: true, name: true } },
  borrower: { select: { id: true, name: true, email: true } },
  startDate: true,
  endDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BookingSelect;

type BookingRow = Prisma.BookingGetPayload<{ select: typeof bookingSelect }>;

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// The contract uses YYYY-MM-DD for booking dates, while Prisma returns Date objects.
export function toBookingResponse(booking: BookingRow) {
  return {
    ...booking,
    startDate: toDateString(booking.startDate),
    endDate: toDateString(booking.endDate),
  };
}
