import '../src/env.js';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { ADMIN_PERMISSIONS, USER_PERMISSIONS } from '../src/utils/permissions.js';

const prisma = new PrismaClient();

const userCount = readPositiveInt('BENCHMARK_USER_COUNT', 250);
const moviesPerUser = readPositiveInt('BENCHMARK_MOVIES_PER_USER', 60);
const listsPerUser = readPositiveInt('BENCHMARK_LISTS_PER_USER', 12);
const listSizeMin = readPositiveInt('BENCHMARK_LIST_SIZE_MIN', 12);
const listSizeMax = readPositiveInt('BENCHMARK_LIST_SIZE_MAX', 24);

function readPositiveInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw?.trim()) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function ensureBenchmarkTarget() {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  if (!databaseUrl.includes('_test')) {
    throw new Error(`Refusing to seed benchmark data into a non-test database: ${databaseUrl}`);
  }

  if ((process.env.NODE_ENV ?? '') !== 'test') {
    throw new Error(`Benchmark seeding must run with NODE_ENV=test. Received NODE_ENV=${process.env.NODE_ENV ?? 'undefined'}`);
  }
}

async function seedRoles() {
  const permissions = await Promise.all(
    ADMIN_PERMISSIONS.map((name) =>
      prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const userPermissionRows = permissions.filter((permission) => USER_PERMISSIONS.includes(permission.name as (typeof USER_PERMISSIONS)[number]));

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

  const userRole = await prisma.role.upsert({
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

  return { adminRole, userRole };
}

async function resetBenchmarkTables() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "_PermissionToRole", "PasswordResetToken", "RecoveryCode", "AuditLog", "SuspiciousUser", "ListMovie", "Frame", "CustomList", "Movie", "User", "Role", "Permission" RESTART IDENTITY CASCADE');
}

function buildMovieTitle() {
  return `${faker.word.adjective({ length: { min: 4, max: 10 } })} ${faker.word.noun({ length: { min: 4, max: 12 } })}`;
}

async function seedBenchmarkDataset() {
  ensureBenchmarkTarget();
  await resetBenchmarkTables();
  const { adminRole, userRole } = await seedRoles();
  const sharedPasswordHash = await bcrypt.hash('benchmark123', 12);

  await prisma.user.create({
    data: {
      id: randomUUID(),
      email: 'admin@benchmark.local',
      name: 'Benchmark Admin',
      passwordHash: sharedPasswordHash,
      roleId: adminRole.id,
    },
  });

  const userIds: string[] = [];
  const movieRows: Array<{
    id: string;
    movieName: string;
    watchDate: Date;
    rating: number;
    review: string;
    userId: string;
  }> = [];
  const listRows: Array<{
    id: string;
    name: string;
    description: string;
    userId: string;
  }> = [];
  const listMovieRows: Array<{
    id: string;
    listId: string;
    movieId: string;
  }> = [];

  for (let userIndex = 0; userIndex < userCount; userIndex += 1) {
    const userId = randomUUID();
    userIds.push(userId);

    await prisma.user.create({
      data: {
        id: userId,
        email: `benchmark-user-${userIndex + 1}@example.com`,
        name: faker.person.fullName(),
        passwordHash: sharedPasswordHash,
        roleId: userRole.id,
      },
    });

    const userMovieIds: string[] = [];
    for (let movieIndex = 0; movieIndex < moviesPerUser; movieIndex += 1) {
      const movieId = randomUUID();
      userMovieIds.push(movieId);
      movieRows.push({
        id: movieId,
        movieName: buildMovieTitle(),
        watchDate: faker.date.between({ from: '2020-01-01', to: '2025-12-31' }),
        rating: faker.number.int({ min: 1, max: 10 }) / 2,
        review: faker.lorem.sentence(),
        userId,
      });
    }

    const userListIds: string[] = [];
    for (let listIndex = 0; listIndex < listsPerUser; listIndex += 1) {
      const listId = randomUUID();
      userListIds.push(listId);
      listRows.push({
        id: listId,
        name: `${faker.word.adjective()} ${faker.word.noun()} ${listIndex + 1}`,
        description: faker.lorem.sentence(),
        userId,
      });
    }

    const anchorGroups = faker.helpers.arrayElements(
      userMovieIds,
      Math.max(4, Math.min(12, Math.floor(userMovieIds.length / 4))),
    );

    for (let listIndex = 0; listIndex < userListIds.length; listIndex += 1) {
      const listId = userListIds[listIndex];
      const sharedAnchorStart = (listIndex * 2) % anchorGroups.length;
      const sharedAnchorMovies = anchorGroups.slice(sharedAnchorStart, sharedAnchorStart + 6);
      const targetListSize = faker.number.int({ min: listSizeMin, max: listSizeMax });
      const extraMovies = faker.helpers.arrayElements(
        userMovieIds.filter((movieId) => !sharedAnchorMovies.includes(movieId)),
        Math.max(0, targetListSize - sharedAnchorMovies.length),
      );

      const movieIdsForList = Array.from(new Set([...sharedAnchorMovies, ...extraMovies]));

      for (const movieId of movieIdsForList) {
        listMovieRows.push({
          id: randomUUID(),
          listId,
          movieId,
        });
      }
    }
  }

  await prisma.movie.createMany({ data: movieRows });
  await prisma.customList.createMany({ data: listRows });
  await prisma.listMovie.createMany({ data: listMovieRows });

  console.log(`Benchmark seed complete on test database for ${userIds.length} users.`);
  console.log(`Inserted ${movieRows.length} movies, ${listRows.length} lists, and ${listMovieRows.length} list-movie links.`);
}

seedBenchmarkDataset()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
