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

describe('GET /api/equipment', () => {
  it('requires login', async () => {
    const response = await request(app).get('/api/equipment');

    expect(response.status).toBe(401);
  });

  it('returns equipment in the shape of the API contract', async () => {
    const category = await createCategory('Cameras');
    const equipment = await createEquipment(category.id, 'Canon R6');
    const { token } = await createUser('BORROWER');

    const response = await request(app).get('/api/equipment').set(bearer(token));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      {
        id: equipment.id,
        name: 'Canon R6',
        description: null,
        status: 'AVAILABLE',
        category: { id: category.id, name: 'Cameras' },
      },
    ]);
  });

  it('filters by categoryId', async () => {
    const cameras = await createCategory('Cameras');
    const audio = await createCategory('Audio');
    await createEquipment(cameras.id, 'Canon R6');
    await createEquipment(audio.id, 'Rode Mic');
    const { token } = await createUser();

    const response = await request(app)
      .get(`/api/equipment?categoryId=${audio.id}`)
      .set(bearer(token));

    expect(response.body.data.map((item: { name: string }) => item.name)).toEqual(['Rode Mic']);
  });
});

describe('GET /api/equipment/:id', () => {
  it('returns one item', async () => {
    const category = await createCategory();
    const equipment = await createEquipment(category.id);
    const { token } = await createUser();

    const response = await request(app).get(`/api/equipment/${equipment.id}`).set(bearer(token));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(equipment.id);
  });

  it('returns NOT_FOUND for an unknown id', async () => {
    const { token } = await createUser();

    const response = await request(app).get('/api/equipment/does-not-exist').set(bearer(token));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /api/equipment', () => {
  it('lets an admin create equipment', async () => {
    const category = await createCategory();
    const { token } = await createUser('ADMIN');

    const response = await request(app)
      .post('/api/equipment')
      .set(bearer(token))
      .send({ name: 'Sony A7 IV', description: 'Full-frame camera', categoryId: category.id });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: 'Sony A7 IV',
      description: 'Full-frame camera',
      status: 'AVAILABLE',
      category: { id: category.id },
    });
  });

  it.each(['BORROWER', 'STAFF'] as const)('forbids a %s', async (role) => {
    const category = await createCategory();
    const { token } = await createUser(role);

    const response = await request(app)
      .post('/api/equipment')
      .set(bearer(token))
      .send({ name: 'Sony A7 IV', categoryId: category.id });

    expect(response.status).toBe(403);
  });

  it('rejects a missing name', async () => {
    const category = await createCategory();
    const { token } = await createUser('ADMIN');

    const response = await request(app)
      .post('/api/equipment')
      .set(bearer(token))
      .send({ categoryId: category.id });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a category that does not exist', async () => {
    const { token } = await createUser('ADMIN');

    const response = await request(app)
      .post('/api/equipment')
      .set(bearer(token))
      .send({ name: 'Sony A7 IV', categoryId: 'does-not-exist' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/equipment/:id', () => {
  it('lets an admin update equipment', async () => {
    const category = await createCategory();
    const equipment = await createEquipment(category.id, 'Old name');
    const { token } = await createUser('ADMIN');

    const response = await request(app)
      .patch(`/api/equipment/${equipment.id}`)
      .set(bearer(token))
      .send({ name: 'New name', description: 'Updated', categoryId: category.id });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ name: 'New name', description: 'Updated' });
  });

  it('returns NOT_FOUND for an unknown id', async () => {
    const category = await createCategory();
    const { token } = await createUser('ADMIN');

    const response = await request(app)
      .patch('/api/equipment/does-not-exist')
      .set(bearer(token))
      .send({ name: 'New name', categoryId: category.id });

    expect(response.status).toBe(404);
  });

  it('forbids a staff user', async () => {
    const category = await createCategory();
    const equipment = await createEquipment(category.id);
    const { token } = await createUser('STAFF');

    const response = await request(app)
      .patch(`/api/equipment/${equipment.id}`)
      .set(bearer(token))
      .send({ name: 'New name', categoryId: category.id });

    expect(response.status).toBe(403);
  });
});

describe('DELETE /api/equipment/:id', () => {
  it('lets an admin delete unused equipment', async () => {
    const category = await createCategory();
    const equipment = await createEquipment(category.id);
    const { token } = await createUser('ADMIN');

    const response = await request(app).delete(`/api/equipment/${equipment.id}`).set(bearer(token));

    expect(response.status).toBe(200);
    expect(await prisma.equipment.count()).toBe(0);
  });

  it('refuses to delete equipment that has bookings', async () => {
    const category = await createCategory();
    const equipment = await createEquipment(category.id);
    const { user, token } = await createUser('ADMIN');
    await prisma.booking.create({
      data: {
        equipmentId: equipment.id,
        borrowerId: user.id,
        startDate: new Date('2026-11-10'),
        endDate: new Date('2026-11-12'),
      },
    });

    const response = await request(app).delete(`/api/equipment/${equipment.id}`).set(bearer(token));

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('forbids a borrower', async () => {
    const category = await createCategory();
    const equipment = await createEquipment(category.id);
    const { token } = await createUser('BORROWER');

    const response = await request(app).delete(`/api/equipment/${equipment.id}`).set(bearer(token));

    expect(response.status).toBe(403);
  });
});

describe('PATCH /api/equipment/:id/maintenance', () => {
  it.each(['STAFF', 'ADMIN'] as const)(
    'lets %s mark equipment as under maintenance',
    async (role) => {
      const category = await createCategory();
      const equipment = await createEquipment(category.id);
      const { token } = await createUser(role);

      const response = await request(app)
        .patch(`/api/equipment/${equipment.id}/maintenance`)
        .set(bearer(token))
        .send({ underMaintenance: true });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('UNDER_MAINTENANCE');
    },
  );

  it('puts equipment back in service', async () => {
    const category = await createCategory();
    const equipment = await createEquipment(category.id, 'Broken camera', 'UNDER_MAINTENANCE');
    const { token } = await createUser('STAFF');

    const response = await request(app)
      .patch(`/api/equipment/${equipment.id}/maintenance`)
      .set(bearer(token))
      .send({ underMaintenance: false });

    expect(response.body.data.status).toBe('AVAILABLE');
  });

  it('forbids a borrower', async () => {
    const category = await createCategory();
    const equipment = await createEquipment(category.id);
    const { token } = await createUser('BORROWER');

    const response = await request(app)
      .patch(`/api/equipment/${equipment.id}/maintenance`)
      .set(bearer(token))
      .send({ underMaintenance: true });

    expect(response.status).toBe(403);
  });

  it('rejects a body that is not a boolean', async () => {
    const category = await createCategory();
    const equipment = await createEquipment(category.id);
    const { token } = await createUser('STAFF');

    const response = await request(app)
      .patch(`/api/equipment/${equipment.id}/maintenance`)
      .set(bearer(token))
      .send({ underMaintenance: 'yes' });

    expect(response.status).toBe(400);
  });

  it('returns NOT_FOUND for an unknown id', async () => {
    const { token } = await createUser('STAFF');

    const response = await request(app)
      .patch('/api/equipment/does-not-exist/maintenance')
      .set(bearer(token))
      .send({ underMaintenance: true });

    expect(response.status).toBe(404);
  });
});
