import type { BookingStatus, Role } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { prisma } from '../../lib/db.js';
import {
  bearer,
  createCategory,
  createEquipment,
  createUser,
  insertBooking,
  resetDatabase,
} from '../../test/helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

async function setupBooking(
  status: BookingStatus = 'PENDING',
  options: { borrowerRole?: Role; start?: string; end?: string; equipmentId?: string } = {},
) {
  const equipmentId =
    options.equipmentId ?? (await createEquipment((await createCategory()).id, 'Canon R6')).id;
  const owner = await createUser(options.borrowerRole ?? 'BORROWER');
  const booking = await insertBooking({
    equipmentId,
    borrowerId: owner.user.id,
    startDate: options.start ?? '2026-11-10',
    endDate: options.end ?? '2026-11-12',
    status,
  });
  return { equipmentId, owner, booking };
}

function review(token: string, bookingId: string, decision: string) {
  return request(app)
    .patch(`/api/bookings/${bookingId}/review`)
    .set(bearer(token))
    .send({ decision });
}

describe('GET /api/bookings/pending', () => {
  it('lists only pending bookings, oldest first', async () => {
    const first = await setupBooking('PENDING', { start: '2026-11-01', end: '2026-11-02' });
    await setupBooking('APPROVED', {
      equipmentId: first.equipmentId,
      start: '2026-11-05',
      end: '2026-11-06',
    });
    await setupBooking('PENDING', {
      equipmentId: first.equipmentId,
      start: '2026-11-03',
      end: '2026-11-04',
    });
    const staff = await createUser('STAFF');

    const response = await request(app).get('/api/bookings/pending').set(bearer(staff.token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((booking: { startDate: string }) => booking.startDate)).toEqual([
      '2026-11-01',
      '2026-11-03',
    ]);
  });

  it('is open to admins', async () => {
    const admin = await createUser('ADMIN');

    const response = await request(app).get('/api/bookings/pending').set(bearer(admin.token));

    expect(response.status).toBe(200);
  });

  it('is forbidden to borrowers', async () => {
    const borrower = await createUser('BORROWER');

    const response = await request(app).get('/api/bookings/pending').set(bearer(borrower.token));

    expect(response.status).toBe(403);
  });
});

describe('GET /api/bookings/active', () => {
  it('lists approved and collected bookings only', async () => {
    const first = await setupBooking('APPROVED', { start: '2026-11-01', end: '2026-11-02' });
    await setupBooking('COLLECTED', {
      equipmentId: first.equipmentId,
      start: '2026-11-03',
      end: '2026-11-04',
    });
    await setupBooking('PENDING', {
      equipmentId: first.equipmentId,
      start: '2026-11-05',
      end: '2026-11-06',
    });
    await setupBooking('RETURNED', {
      equipmentId: first.equipmentId,
      start: '2026-11-07',
      end: '2026-11-08',
    });
    const staff = await createUser('STAFF');

    const response = await request(app).get('/api/bookings/active').set(bearer(staff.token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((booking: { status: string }) => booking.status)).toEqual([
      'APPROVED',
      'COLLECTED',
    ]);
  });

  it('is forbidden to borrowers', async () => {
    const borrower = await createUser('BORROWER');

    const response = await request(app).get('/api/bookings/active').set(bearer(borrower.token));

    expect(response.status).toBe(403);
  });
});

describe('PATCH /api/bookings/:id/review', () => {
  it.each(['STAFF', 'ADMIN'] as const)('lets %s approve a pending booking', async (role) => {
    const { booking } = await setupBooking();
    const reviewer = await createUser(role);

    const response = await review(reviewer.token, booking.id, 'APPROVED');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('APPROVED');
  });

  it('lets staff reject a pending booking', async () => {
    const { booking } = await setupBooking();
    const staff = await createUser('STAFF');

    const response = await review(staff.token, booking.id, 'REJECTED');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('REJECTED');
  });

  it('is forbidden to borrowers', async () => {
    const { booking, owner } = await setupBooking();

    const response = await review(owner.token, booking.id, 'APPROVED');

    expect(response.status).toBe(403);
  });

  it.each(['MAYBE', 'COLLECTED', ''])('rejects the decision %j', async (decision) => {
    const { booking } = await setupBooking();
    const staff = await createUser('STAFF');

    const response = await review(staff.token, booking.id, decision);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.each(['STAFF', 'ADMIN'] as const)('stops a %s approving their own request', async (role) => {
    const { booking, owner } = await setupBooking('PENDING', { borrowerRole: role });

    const response = await review(owner.token, booking.id, 'APPROVED');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('SELF_APPROVAL_NOT_ALLOWED');
    const unchanged = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(unchanged.status).toBe('PENDING');
  });

  it.each(['APPROVED', 'COLLECTED', 'RETURNED', 'REJECTED', 'CANCELLED'] as const)(
    'does not review a %s booking',
    async (status) => {
      const { booking } = await setupBooking(status);
      const staff = await createUser('STAFF');

      const response = await review(staff.token, booking.id, 'APPROVED');

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    },
  );

  it('returns NOT_FOUND for an unknown booking', async () => {
    const staff = await createUser('STAFF');

    const response = await review(staff.token, 'does-not-exist', 'APPROVED');

    expect(response.status).toBe(404);
  });
});

describe('approval and overlapping bookings', () => {
  it('checks for overlaps again at approval time', async () => {
    const pending = await setupBooking('PENDING', { start: '2026-11-10', end: '2026-11-14' });
    await setupBooking('APPROVED', {
      equipmentId: pending.equipmentId,
      start: '2026-11-12',
      end: '2026-11-16',
    });
    const staff = await createUser('STAFF');

    const response = await review(staff.token, pending.booking.id, 'APPROVED');

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('BOOKING_CONFLICT');
    const unchanged = await prisma.booking.findUniqueOrThrow({ where: { id: pending.booking.id } });
    expect(unchanged.status).toBe('PENDING');
  });

  it('approves the first of two overlapping requests and refuses the second', async () => {
    const first = await setupBooking('PENDING', { start: '2026-11-10', end: '2026-11-14' });
    const second = await setupBooking('PENDING', {
      equipmentId: first.equipmentId,
      start: '2026-11-12',
      end: '2026-11-16',
    });
    const staff = await createUser('STAFF');

    const firstResponse = await review(staff.token, first.booking.id, 'APPROVED');
    const secondResponse = await review(staff.token, second.booking.id, 'APPROVED');

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body.error.code).toBe('BOOKING_CONFLICT');
  });

  it('lets only one of two simultaneous approvals through', async () => {
    const first = await setupBooking('PENDING', { start: '2026-11-10', end: '2026-11-14' });
    const second = await setupBooking('PENDING', {
      equipmentId: first.equipmentId,
      start: '2026-11-12',
      end: '2026-11-16',
    });
    const staff = await createUser('STAFF');

    const responses = await Promise.all([
      review(staff.token, first.booking.id, 'APPROVED'),
      review(staff.token, second.booking.id, 'APPROVED'),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await prisma.booking.count({ where: { status: 'APPROVED' } })).toBe(1);
  });

  it('is backed by a database constraint, not only by the API check', async () => {
    const first = await setupBooking('APPROVED', { start: '2026-11-10', end: '2026-11-14' });
    const second = await setupBooking('PENDING', {
      equipmentId: first.equipmentId,
      start: '2026-11-12',
      end: '2026-11-16',
    });

    await expect(
      prisma.booking.update({ where: { id: second.booking.id }, data: { status: 'APPROVED' } }),
    ).rejects.toThrow(/booking_no_overlap/);
  });
});

describe('PATCH /api/bookings/:id/collect', () => {
  it('records collection of an approved booking', async () => {
    const { booking } = await setupBooking('APPROVED');
    const staff = await createUser('STAFF');

    const response = await request(app)
      .patch(`/api/bookings/${booking.id}/collect`)
      .set(bearer(staff.token));

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('COLLECTED');
  });

  it.each(['PENDING', 'COLLECTED', 'RETURNED', 'REJECTED', 'CANCELLED'] as const)(
    'does not collect a %s booking',
    async (status) => {
      const { booking } = await setupBooking(status);
      const staff = await createUser('STAFF');

      const response = await request(app)
        .patch(`/api/bookings/${booking.id}/collect`)
        .set(bearer(staff.token));

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    },
  );

  it('is forbidden to borrowers', async () => {
    const { booking, owner } = await setupBooking('APPROVED');

    const response = await request(app)
      .patch(`/api/bookings/${booking.id}/collect`)
      .set(bearer(owner.token));

    expect(response.status).toBe(403);
  });

  it('returns NOT_FOUND for an unknown booking', async () => {
    const staff = await createUser('STAFF');

    const response = await request(app)
      .patch('/api/bookings/does-not-exist/collect')
      .set(bearer(staff.token));

    expect(response.status).toBe(404);
  });
});

describe('PATCH /api/bookings/:id/return', () => {
  it('records the return of a collected booking', async () => {
    const { booking } = await setupBooking('COLLECTED');
    const staff = await createUser('ADMIN');

    const response = await request(app)
      .patch(`/api/bookings/${booking.id}/return`)
      .set(bearer(staff.token));

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('RETURNED');
  });

  it.each(['PENDING', 'APPROVED', 'RETURNED', 'REJECTED', 'CANCELLED'] as const)(
    'does not return a %s booking',
    async (status) => {
      const { booking } = await setupBooking(status);
      const staff = await createUser('STAFF');

      const response = await request(app)
        .patch(`/api/bookings/${booking.id}/return`)
        .set(bearer(staff.token));

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    },
  );

  it('is forbidden to borrowers', async () => {
    const { booking, owner } = await setupBooking('COLLECTED');

    const response = await request(app)
      .patch(`/api/bookings/${booking.id}/return`)
      .set(bearer(owner.token));

    expect(response.status).toBe(403);
  });
});

describe('booking lifecycle', () => {
  it('runs from request to return, and blocks cancelling once collected', async () => {
    const equipment = await createEquipment((await createCategory()).id, 'Canon R6');
    const borrower = await createUser('BORROWER');
    const staff = await createUser('STAFF');

    const created = await request(app)
      .post('/api/bookings')
      .set(bearer(borrower.token))
      .send({ equipmentId: equipment.id, startDate: '2026-11-10', endDate: '2026-11-12' });
    const id = created.body.data.id as string;
    expect(created.body.data.status).toBe('PENDING');

    expect((await review(staff.token, id, 'APPROVED')).body.data.status).toBe('APPROVED');

    const collected = await request(app)
      .patch(`/api/bookings/${id}/collect`)
      .set(bearer(staff.token));
    expect(collected.body.data.status).toBe('COLLECTED');

    const cancel = await request(app)
      .patch(`/api/bookings/${id}/cancel`)
      .set(bearer(borrower.token));
    expect(cancel.status).toBe(409);
    expect(cancel.body.error.code).toBe('INVALID_STATUS_TRANSITION');

    const returned = await request(app)
      .patch(`/api/bookings/${id}/return`)
      .set(bearer(staff.token));
    expect(returned.body.data.status).toBe('RETURNED');
  });
});

describe('GET /api/equipment/:id/bookings', () => {
  it('lists the booking history of one item, newest dates first', async () => {
    const first = await setupBooking('RETURNED', { start: '2026-10-01', end: '2026-10-03' });
    await setupBooking('APPROVED', {
      equipmentId: first.equipmentId,
      start: '2026-11-01',
      end: '2026-11-03',
    });
    await setupBooking('PENDING');
    const staff = await createUser('STAFF');

    const response = await request(app)
      .get(`/api/equipment/${first.equipmentId}/bookings`)
      .set(bearer(staff.token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((booking: { startDate: string }) => booking.startDate)).toEqual([
      '2026-11-01',
      '2026-10-01',
    ]);
  });

  it('is forbidden to borrowers', async () => {
    const { equipmentId, owner } = await setupBooking();

    const response = await request(app)
      .get(`/api/equipment/${equipmentId}/bookings`)
      .set(bearer(owner.token));

    expect(response.status).toBe(403);
  });

  it('returns NOT_FOUND for unknown equipment', async () => {
    const staff = await createUser('STAFF');

    const response = await request(app)
      .get('/api/equipment/does-not-exist/bookings')
      .set(bearer(staff.token));

    expect(response.status).toBe(404);
  });
});
