import { pathToFileURL } from 'node:url';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { prisma } from './lib/db.js';
import { hashPassword } from './lib/password.js';

const credentialsSchema = z.object({
  BOOTSTRAP_ADMIN_EMAIL: z.email().transform((email) => email.toLowerCase()),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12),
  BOOTSTRAP_ADMIN_NAME: z.string().trim().min(1),
});

export type BootstrapAdminCredentials = {
  email: string;
  password: string;
  name: string;
};

export class BootstrapAdminError extends Error {}

export function readBootstrapAdminCredentials(
  environment: NodeJS.ProcessEnv,
): BootstrapAdminCredentials {
  const result = credentialsSchema.safeParse(environment);
  if (!result.success) {
    const invalidVariables = [
      ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    ].join(', ');
    throw new BootstrapAdminError(
      `Missing or invalid bootstrap environment variable(s): ${invalidVariables}`,
    );
  }

  return {
    email: result.data.BOOTSTRAP_ADMIN_EMAIL,
    password: result.data.BOOTSTRAP_ADMIN_PASSWORD,
    name: result.data.BOOTSTRAP_ADMIN_NAME,
  };
}

export async function bootstrapAdmin(
  client: PrismaClient,
  credentials: BootstrapAdminCredentials,
): Promise<void> {
  await client.$transaction(async (transaction) => {
    // Serialize bootstrap attempts so two simultaneous runs cannot both observe an empty system.
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(1358451041)::text`;

    const existingAdmin = await transaction.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    if (existingAdmin) {
      throw new BootstrapAdminError('An admin user already exists; refusing to bootstrap another');
    }

    const existingUser = await transaction.user.findUnique({
      where: { email: credentials.email },
      select: { id: true },
    });
    if (existingUser) {
      throw new BootstrapAdminError(
        'A user with the bootstrap email already exists; refusing to modify that user',
      );
    }

    const passwordHash = await hashPassword(credentials.password);
    await transaction.user.create({
      data: {
        email: credentials.email,
        name: credentials.name,
        passwordHash,
        role: 'ADMIN',
      },
    });
  });
}

async function main(): Promise<void> {
  try {
    const credentials = readBootstrapAdminCredentials(process.env);
    await bootstrapAdmin(prisma, credentials);
    console.log('Initial admin user created successfully');
  } catch (error) {
    if (error instanceof BootstrapAdminError) {
      console.error(`Bootstrap admin refused: ${error.message}`);
    } else {
      console.error('Bootstrap admin failed due to an unexpected database error');
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  await main();
}
