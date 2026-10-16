import type { BookingStatus } from '@prisma/client';
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

async function setupEquipment(status: 'AVAILABLE' | 'UNDER_MAINTENANCE' = 'AVAILABLE') {
  const category = await createCategory();
  return createEquipment(category.id, 'Canon R6', status);
}

function postBooking(token: string, body: object) {
  return request(app).post('/api/bookings').set(bearer(token)).send(body);
}

describe('POST /api/bookings', () => {
  it('requires login', async () => {
    const response = await request(app).post('/api/bookings').send({});

    expect(response.status).toBe(401);
  });

  it('creates a PENDING booking for the logged-in user', async () => {
    const equipment = await setupEquipment();
    const { user, token } = await createUser('BORROWER');

    const response = await postBooking(token, {
      equipmentId: equipment.id,
      startDate: '2026-11-10',
      endDate: '2026-11-12',
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      equipment: { id: equipment.id, name: 'Canon R6' },
      borrower: { id: user.id, name: user.name, email: user.email },
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      status: 'PENDING',
    });
    expect(response.body.data.createdAt).toEqual(expect.any(String));
  });

  it('ignores a borrower id sent by the client', async () => {
    const equipment = await setupEquipment();
    const { user, token } = await createUser('BORROWER');
    const other = await createUser('BORROWER');

    const response = await postBooking(token, {
      equipmentId: equipment.id,
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      borrowerId: other.user.id,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.borrower.id).toBe(user.id);
  });

  it.each(['BORROWER', 'STAFF', 'ADMIN'] as const)('lets a %s request a booking', async (role) => {
    const equipment = await setupEquipment();
    const { token } = await createUser(role);

    const response = await postBooking(token, {
      equipmentId: equipment.id,
      startDate: '2026-11-10',
      endDate: '2026-11-12',
    });

    expect(response.status).toBe(201);
  });

  it('accepts a single-day booking', async () => {
    const equipment = await setupEquipment();
    const { token } = await createUser();

    const response = await postBooking(token, {
      equipmentId: equipment.id,
      startDate: '2026-11-10',
      endDate: '2026-11-10',
    });

    expect(response.status).toBe(201);
  });

  it('rejects a start date after the end date', async () => {
    const equipment = await setupEquipment();
    const { token } = await createUser();

    const response = await postBooking(token, {
      equipmentId: equipment.id,
      startDate: '2026-11-12',
      endDate: '2026-11-10',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.each(['2026-02-31', '10/11/2026', 'tomorrow', ''])('rejects the date %j', async (date) => {
    const equipment = await setupEquipment();
    const { token } = await createUser();

    const response = await postBooking(token, {
      equipmentId: equipment.id,
      startDate: date,
      endDate: '2026-11-12',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns NOT_FOUND for unknown equipment', async () => {
    const { token } = await createUser();

    const response = await postBooking(token, {
      equipmentId: 'does-not-exist',
      startDate: '2026-11-10',
      endDate: '2026-11-12',
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('blocks equipment that is under maintenance', async () => {
    const equipment = await setupEquipment('UNDER_MAINTENANCE');
    const { token } = await createUser();

    const response = await postBooking(token, {
      equipmentId: equipment.id,
      startDate: '2026-11-10',
      endDate: '2026-11-12',
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EQUIPMENT_UNDER_MAINTENANCE');
  });
});

describe('POST /api/bookings overlap rules', () => {
  async function requestWithExisting(status: BookingStatus, start: string, end: string) {
    const equipment = await setupEquipment();
    const owner = await createUser('BORROWER');
    await insertBooking({
      equipmentId: equipment.id,
      borrowerId: owner.user.id,
      startDate: start,
      endDate: end,
      status,
    });
    const { token } = await createUser('BORROWER');
    return postBooking(token, {
      equipmentId: equipment.id,
      startDate: '2026-11-12',
      endDate: '2026-11-16',
    });
  }

  it.each(['APPROVED', 'COLLECTED'] as const)(
    'rejects dates that overlap a %s booking',
    async (status) => {
      const response = await requestWithExisting(status, '2026-11-10', '2026-11-14');

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOOKING_CONFLICT');
    },
  );

  it('rejects a booking that sits inside an existing one', async () => {
    const response = await requestWithExisting('APPROVED', '2026-11-01', '2026-11-30');

    expect(response.status).toBe(409);
  });

  it('treats a shared end date as an overlap', async () => {
    const response = await requestWithExisting('APPROVED', '2026-11-08', '2026-11-12');

    expect(response.status).toBe(409);
  });

  it('allows a booking that starts the day after another ends', async () => {
    const response = await requestWithExisting('APPROVED', '2026-11-08', '2026-11-11');

    expect(response.status).toBe(201);
  });

  it('allows overlapping PENDING requests', async () => {
    const response = await requestWithExisting('PENDING', '2026-11-10', '2026-11-14');

    expect(response.status).toBe(201);
  });

  it.each(['REJECTED', 'CANCELLED', 'RETURNED'] as const)('ignores %s bookings', async (status) => {
    const response = await requestWithExisting(status, '2026-11-10', '2026-11-14');

    expect(response.status).toBe(201);
  });

  it('does not mix up different equipment', async () => {
    const category = await createCategory();
    const first = await createEquipment(category.id, 'Camera A');
    const second = await createEquipment(category.id, 'Camera B');
    const owner = await createUser();
    await insertBooking({
      equipmentId: first.id,
      borrowerId: owner.user.id,
      startDate: '2026-11-10',
      endDate: '2026-11-14',
      status: 'APPROVED',
    });
    const { token } = await createUser();

    const response = await postBooking(token, {
      equipmentId: second.id,
      startDate: '2026-11-10',
      endDate: '2026-11-14',
    });

    expect(response.status).toBe(201);
  });
});

describe('GET /api/bookings/mine', () => {
  it('returns only the logged-in user’s bookings, newest first', async () => {
    const equipment = await setupEquipment();
    const me = await createUser();
    const other = await createUser();
    await insertBooking({
      equipmentId: equipment.id,
      borrowerId: me.user.id,
      startDate: '2026-11-01',
      endDate: '2026-11-02',
    });
    await insertBooking({
      equipmentId: equipment.id,
      borrowerId: other.user.id,
      startDate: '2026-11-03',
      endDate: '2026-11-04',
    });
    await insertBooking({
      equipmentId: equipment.id,
      borrowerId: me.user.id,
      startDate: '2026-11-05',
      endDate: '2026-11-06',
    });

    const response = await request(app).get('/api/bookings/mine').set(bearer(me.token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((booking: { startDate: string }) => booking.startDate)).toEqual([
      '2026-11-05',
      '2026-11-01',
    ]);
  });
});

describe('PATCH /api/bookings/:id/cancel', () => {
  async function setupBooking(status: BookingStatus) {
    const equipment = await setupEquipment();
    const owner = await createUser('BORROWER');
    const booking = await insertBooking({
      equipmentId: equipment.id,
      borrowerId: owner.user.id,
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      status,
    });
    return { owner, booking };
  }

  it.each(['PENDING', 'APPROVED'] as const)(
    'lets the owner cancel a %s booking',
    async (status) => {
      const { owner, booking } = await setupBooking(status);

      const response = await request(app)
        .patch(`/api/bookings/${booking.id}/cancel`)
        .set(bearer(owner.token));

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('CANCELLED');
    },
  );

  it.each(['COLLECTED', 'RETURNED', 'REJECTED', 'CANCELLED'] as const)(
    'does not let the owner cancel a %s booking',
    async (status) => {
      const { owner, booking } = await setupBooking(status);

      const response = await request(app)
        .patch(`/api/bookings/${booking.id}/cancel`)
        .set(bearer(owner.token));

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    },
  );

  it.each(['BORROWER', 'STAFF', 'ADMIN'] as const)(
    'does not let another %s cancel the booking',
    async (role) => {
      const { booking } = await setupBooking('PENDING');
      const stranger = await createUser(role);

      const response = await request(app)
        .patch(`/api/bookings/${booking.id}/cancel`)
        .set(bearer(stranger.token));

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    },
  );

  it('returns NOT_FOUND for an unknown booking', async () => {
    const { token } = await createUser();

    const response = await request(app)
      .patch('/api/bookings/does-not-exist/cancel')
      .set(bearer(token));

    expect(response.status).toBe(404);
  });
});
