import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { prisma } from '../../lib/db.js';
import { bearer, createUser, resetDatabase } from '../../test/helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('GET /api/users', () => {
  it('lists users for an admin without exposing password hashes', async () => {
    const admin = await createUser('ADMIN');
    const borrower = await createUser('BORROWER');

    const response = await request(app).get('/api/users').set(bearer(admin.token));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data).toContainEqual({
      id: borrower.user.id,
      name: borrower.user.name,
      email: borrower.user.email,
      role: 'BORROWER',
    });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it.each(['BORROWER', 'STAFF'] as const)('is forbidden to a %s', async (role) => {
    const user = await createUser(role);

    const response = await request(app).get('/api/users').set(bearer(user.token));

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('requires login', async () => {
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(401);
  });
});

describe('PATCH /api/users/:id/role', () => {
  it('lets an admin change another user’s role', async () => {
    const admin = await createUser('ADMIN');
    const borrower = await createUser('BORROWER');

    const response = await request(app)
      .patch(`/api/users/${borrower.user.id}/role`)
      .set(bearer(admin.token))
      .send({ role: 'STAFF' });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      id: borrower.user.id,
      name: borrower.user.name,
      email: borrower.user.email,
      role: 'STAFF',
    });
  });

  it('gives the promoted user staff access straight away', async () => {
    const admin = await createUser('ADMIN');
    const borrower = await createUser('BORROWER');
    const before = await request(app).get('/api/bookings/pending').set(bearer(borrower.token));

    await request(app)
      .patch(`/api/users/${borrower.user.id}/role`)
      .set(bearer(admin.token))
      .send({ role: 'STAFF' });
    const after = await request(app).get('/api/bookings/pending').set(bearer(borrower.token));

    expect(before.status).toBe(403);
    expect(after.status).toBe(200);
  });

  it('rejects a role that does not exist', async () => {
    const admin = await createUser('ADMIN');
    const borrower = await createUser('BORROWER');

    const response = await request(app)
      .patch(`/api/users/${borrower.user.id}/role`)
      .set(bearer(admin.token))
      .send({ role: 'SUPERUSER' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns NOT_FOUND for an unknown user', async () => {
    const admin = await createUser('ADMIN');

    const response = await request(app)
      .patch('/api/users/does-not-exist/role')
      .set(bearer(admin.token))
      .send({ role: 'STAFF' });

    expect(response.status).toBe(404);
  });

  it('stops an admin changing their own role', async () => {
    const admin = await createUser('ADMIN');

    const response = await request(app)
      .patch(`/api/users/${admin.user.id}/role`)
      .set(bearer(admin.token))
      .send({ role: 'BORROWER' });

    expect(response.status).toBe(403);
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: admin.user.id } });
    expect(unchanged.role).toBe('ADMIN');
  });

  it.each(['BORROWER', 'STAFF'] as const)('is forbidden to a %s', async (role) => {
    const user = await createUser(role);
    const other = await createUser('BORROWER');

    const response = await request(app)
      .patch(`/api/users/${other.user.id}/role`)
      .set(bearer(user.token))
      .send({ role: 'ADMIN' });

    expect(response.status).toBe(403);
  });
});
