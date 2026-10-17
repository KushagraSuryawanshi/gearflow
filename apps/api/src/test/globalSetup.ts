import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

// Tests run against their own database so they never touch the demo data in "gearflow".
const TEST_DATABASE_URL =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://gearflow:change-me-locally@localhost:5433/gearflow_test?schema=public';

async function createDatabaseIfMissing(databaseUrl: string): Promise<void> {
  const url = new URL(databaseUrl);
  const name = url.pathname.slice(1);
  if (!/^\w+$/.test(name)) {
    throw new Error(`Unsafe test database name: ${name}`);
  }

  // Connect to the default "postgres" database, because the test one may not exist yet.
  url.pathname = '/postgres';
  const admin = new PrismaClient({ datasourceUrl: url.toString() });
  try {
    const found = await admin.$queryRawUnsafe<unknown[]>(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      name,
    );
    if (found.length === 0) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
    }
  } finally {
    await admin.$disconnect();
  }
}

export async function setup(): Promise<void> {
  await createDatabaseIfMissing(TEST_DATABASE_URL);
  process.env['DATABASE_URL'] = TEST_DATABASE_URL;
  execSync('npx prisma migrate deploy --schema prisma/schema.prisma', {
    stdio: 'inherit',
    env: process.env,
  });
}
