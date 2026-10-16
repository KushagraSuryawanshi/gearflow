import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { prisma } from '../../lib/db.js';
import { bearer, createUser, resetDatabase, TEST_PASSWORD } from '../../test/helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('POST /api/auth/login', () => {
  it('returns a token and the user for valid credentials', async () => {
    const { user } = await createUser('STAFF');

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'STAFF',
    });
  });

  it('accepts the email in a different letter case', async () => {
    const { user } = await createUser();

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email.toUpperCase(), password: TEST_PASSWORD });

    expect(response.status).toBe(200);
  });

  it('rejects a wrong password with INVALID_CREDENTIALS', async () => {
    const { user } = await createUser();

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown email with the same error', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.dev', password: TEST_PASSWORD });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects invalid input with VALIDATION_ERROR', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user for a valid token', async () => {
    const { user, token } = await createUser('ADMIN');

    const response = await request(app).get('/api/auth/me').set(bearer(token));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'ADMIN',
    });
  });

  it('rejects a request without a token', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an invalid token', async () => {
    const response = await request(app).get('/api/auth/me').set(bearer('not-a-real-token'));

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a token for a user that no longer exists', async () => {
    const { user, token } = await createUser();
    await prisma.user.delete({ where: { id: user.id } });

    const response = await request(app).get('/api/auth/me').set(bearer(token));

    expect(response.status).toBe(401);
  });

  it('reflects a role change straight away', async () => {
    const { user, token } = await createUser('BORROWER');
    await prisma.user.update({ where: { id: user.id }, data: { role: 'STAFF' } });

    const response = await request(app).get('/api/auth/me').set(bearer(token));

    expect(response.body.data.role).toBe('STAFF');
  });
});
