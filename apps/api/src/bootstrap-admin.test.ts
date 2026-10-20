import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from './lib/db.js';
import { verifyPassword } from './lib/password.js';
import { resetDatabase } from './test/helpers.js';
import {
  BootstrapAdminError,
  bootstrapAdmin,
  readBootstrapAdminCredentials,
  type BootstrapAdminCredentials,
} from './bootstrap-admin.js';

const credentials: BootstrapAdminCredentials = {
  email: 'initial.admin@test.dev',
  name: 'Initial Admin',
  password: 'A-secure-test-password',
};

beforeEach(resetDatabase);
afterEach(resetDatabase);

describe('bootstrapAdmin', () => {
  it('creates exactly one admin with a hashed password', async () => {
    await bootstrapAdmin(prisma, credentials);

    const users = await prisma.user.findMany();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      email: credentials.email,
      name: credentials.name,
      role: 'ADMIN',
    });
    expect(users[0]?.passwordHash).not.toBe(credentials.password);
    await expect(verifyPassword(credentials.password, users[0]?.passwordHash ?? '')).resolves.toBe(
      true,
    );
  });

  it('refuses when an admin already exists', async () => {
    await prisma.user.create({
      data: {
        email: 'existing.admin@test.dev',
        name: 'Existing Admin',
        passwordHash: 'unchanged-hash',
        role: 'ADMIN',
      },
    });

    await expect(bootstrapAdmin(prisma, credentials)).rejects.toThrow(
      'An admin user already exists',
    );
    await expect(prisma.user.count()).resolves.toBe(1);
  });

  it('refuses to modify a non-admin with the requested email', async () => {
    const existing = await prisma.user.create({
      data: {
        email: credentials.email,
        name: 'Existing Borrower',
        passwordHash: 'unchanged-hash',
        role: 'BORROWER',
      },
    });

    await expect(bootstrapAdmin(prisma, credentials)).rejects.toThrow(
      'A user with the bootstrap email already exists',
    );
    await expect(prisma.user.findUnique({ where: { id: existing.id } })).resolves.toMatchObject({
      name: 'Existing Borrower',
      passwordHash: 'unchanged-hash',
      role: 'BORROWER',
    });
  });

  it('allows only one of two concurrent bootstrap attempts', async () => {
    const results = await Promise.allSettled([
      bootstrapAdmin(prisma, credentials),
      bootstrapAdmin(prisma, { ...credentials, email: 'other.admin@test.dev' }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    await expect(prisma.user.count({ where: { role: 'ADMIN' } })).resolves.toBe(1);
  });
});

describe('readBootstrapAdminCredentials', () => {
  it('normalizes the email and trims the name', () => {
    expect(
      readBootstrapAdminCredentials({
        BOOTSTRAP_ADMIN_EMAIL: 'Initial.Admin@TEST.DEV',
        BOOTSTRAP_ADMIN_NAME: '  Initial Admin  ',
        BOOTSTRAP_ADMIN_PASSWORD: credentials.password,
      }),
    ).toEqual(credentials);
  });

  it.each([
    [{}, 'BOOTSTRAP_ADMIN_EMAIL'],
    [
      {
        BOOTSTRAP_ADMIN_EMAIL: 'not-an-email',
        BOOTSTRAP_ADMIN_NAME: credentials.name,
        BOOTSTRAP_ADMIN_PASSWORD: credentials.password,
      },
      'BOOTSTRAP_ADMIN_EMAIL',
    ],
    [
      {
        BOOTSTRAP_ADMIN_EMAIL: credentials.email,
        BOOTSTRAP_ADMIN_NAME: '   ',
        BOOTSTRAP_ADMIN_PASSWORD: credentials.password,
      },
      'BOOTSTRAP_ADMIN_NAME',
    ],
    [
      {
        BOOTSTRAP_ADMIN_EMAIL: credentials.email,
        BOOTSTRAP_ADMIN_NAME: credentials.name,
        BOOTSTRAP_ADMIN_PASSWORD: 'too-short',
      },
      'BOOTSTRAP_ADMIN_PASSWORD',
    ],
  ])('rejects missing or invalid input without exposing values', (environment, variable) => {
    expect(() => readBootstrapAdminCredentials(environment)).toThrow(BootstrapAdminError);
    expect(() => readBootstrapAdminCredentials(environment)).toThrow(variable);
  });
});
