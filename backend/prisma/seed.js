import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed one demo user for local manual testing.
  await prisma.user.upsert({
    where: { email: 'demo@frames.local' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@frames.local',
      // Hash of "password123" using the current auth salt logic.
      passwordHash: 'f3fb379f92fce6bb12bc7f39557850611696eb3566c3f37d35be47e1f560a9fa31f4d884655d7be2420a76d066773f1be8d7935d31e8f89f9443ac8f4b318133',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

