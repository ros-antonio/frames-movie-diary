import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { ADMIN_PERMISSIONS, USER_PERMISSIONS } from '../src/utils/permissions.js';

const prisma = new PrismaClient();

async function main() {
  const permissions = await Promise.all(
    ADMIN_PERMISSIONS.map((name) =>
      prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {
      permissions: {
        set: permissions.map((permission) => ({ id: permission.id })),
      },
    },
    create: {
      name: 'ADMIN',
      permissions: {
        connect: permissions.map((permission) => ({ id: permission.id })),
      },
    },
  });

  const userPermissionRows = permissions.filter((permission) => USER_PERMISSIONS.includes(permission.name as (typeof USER_PERMISSIONS)[number]));

  await prisma.role.upsert({
    where: { name: 'USER' },
    update: {
      permissions: {
        set: userPermissionRows.map((permission) => ({ id: permission.id })),
      },
    },
    create: {
      name: 'USER',
      permissions: {
        connect: userPermissionRows.map((permission) => ({ id: permission.id })),
      },
    },
  });

  const hashedPassword = await bcrypt.hash('admin123', 12);

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

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
