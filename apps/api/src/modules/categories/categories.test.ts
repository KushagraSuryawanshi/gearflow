import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { prisma } from '../../lib/db.js';
import {
  bearer,
  createCategory,
  createEquipment,
  createUser,
  resetDatabase,
} from '../../test/helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('GET /api/categories', () => {
  it('requires login', async () => {
    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(401);
  });

  it('lists categories for any logged-in user, sorted by name', async () => {
    await createCategory('Lighting');
    await createCategory('Audio');
    const { token } = await createUser('BORROWER');

    const response = await request(app).get('/api/categories').set(bearer(token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((category: { name: string }) => category.name)).toEqual([
      'Audio',
      'Lighting',
    ]);
    expect(Object.keys(response.body.data[0]).sort()).toEqual(['id', 'name']);
  });
});

describe('POST /api/categories', () => {
  it('lets an admin create a category', async () => {
    const { token } = await createUser('ADMIN');

    const response = await request(app)
      .post('/api/categories')
      .set(bearer(token))
      .send({ name: 'Cameras' });

    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe('Cameras');
  });

  it.each(['BORROWER', 'STAFF'] as const)('forbids a %s', async (role) => {
    const { token } = await createUser(role);

    const response = await request(app)
      .post('/api/categories')
      .set(bearer(token))
      .send({ name: 'Cameras' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects an empty name', async () => {
    const { token } = await createUser('ADMIN');

    const response = await request(app)
      .post('/api/categories')
      .set(bearer(token))
      .send({ name: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a duplicate name', async () => {
    await createCategory('Cameras');
    const { token } = await createUser('ADMIN');

    const response = await request(app)
      .post('/api/categories')
      .set(bearer(token))
      .send({ name: 'Cameras' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });
});

describe('PATCH /api/categories/:id', () => {
  it('lets an admin rename a category', async () => {
    const category = await createCategory('Camers');
    const { token } = await createUser('ADMIN');

    const response = await request(app)
      .patch(`/api/categories/${category.id}`)
      .set(bearer(token))
      .send({ name: 'Cameras' });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ id: category.id, name: 'Cameras' });
  });

  it('returns NOT_FOUND for an unknown category', async () => {
    const { token } = await createUser('ADMIN');

    const response = await request(app)
      .patch('/api/categories/does-not-exist')
      .set(bearer(token))
      .send({ name: 'Cameras' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('forbids a staff user', async () => {
    const category = await createCategory();
    const { token } = await createUser('STAFF');

    const response = await request(app)
      .patch(`/api/categories/${category.id}`)
      .set(bearer(token))
      .send({ name: 'Other' });

    expect(response.status).toBe(403);
  });
});

describe('DELETE /api/categories/:id', () => {
  it('lets an admin delete an unused category', async () => {
    const category = await createCategory();
    const { token } = await createUser('ADMIN');

    const response = await request(app).delete(`/api/categories/${category.id}`).set(bearer(token));

    expect(response.status).toBe(200);
    expect(await prisma.category.count()).toBe(0);
  });

  it('refuses to delete a category that still has equipment', async () => {
    const category = await createCategory();
    await createEquipment(category.id);
    const { token } = await createUser('ADMIN');

    const response = await request(app).delete(`/api/categories/${category.id}`).set(bearer(token));

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('forbids a borrower', async () => {
    const category = await createCategory();
    const { token } = await createUser('BORROWER');

    const response = await request(app).delete(`/api/categories/${category.id}`).set(bearer(token));

    expect(response.status).toBe(403);
  });
});
