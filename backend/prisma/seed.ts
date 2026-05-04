import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const adminPermissions = [
  'MOVIE_READ_OWN',
  'MOVIE_WRITE_OWN',
  'MOVIE_READ_ALL',
  'MOVIE_WRITE_ALL',
  'LIST_READ_OWN',
  'LIST_WRITE_OWN',
  'LIST_READ_ALL',
  'LIST_WRITE_ALL',
  'ADMIN_VIEW_USERS',
  'ADMIN_DELETE_USERS',
];
const userPermissions = [
  'MOVIE_READ_OWN',
  'MOVIE_WRITE_OWN',
  'LIST_READ_OWN',
  'LIST_WRITE_OWN',
];

async function main() {
  const permissions = await Promise.all(
    adminPermissions.map((name) =>
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

  const userPermissionRows = permissions.filter((permission) => userPermissions.includes(permission.name));

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
