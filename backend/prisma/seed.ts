import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { AccountStatus, PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password || password.length < 16) {
    throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD of at least 16 characters before seeding.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, role: Role.ADMIN, status: AccountStatus.ACTIVE },
    // Do not replace existing credentials or change an existing account's role.
    update: {},
  });
  console.log(`Bootstrap administrator is ready: ${email}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
