import { PrismaClient } from '@prisma/client';
import { scryptSync } from 'node:crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return scryptSync(password, 'frames-auth-salt', 64).toString('hex');
}

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER' },
  });

  const hashedPassword = hashPassword('admin123');

  await prisma.user.upsert({
    where: { email: 'admin@moviediary.com' },
    update: {
      passwordHash: hashedPassword
    },
    create: {
      email: 'admin@moviediary.com',
      name: 'Site Admin',
      passwordHash: hashedPassword,
      roleId: adminRole.id,
    },
  });

  console.log('Database seeded successfully with scryptSync!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });