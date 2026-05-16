import '../src/env.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mode = process.argv[2];

function ensureTestDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  if (!databaseUrl.includes('_test')) {
    throw new Error(`Refusing to modify benchmark indexes on a non-test database: ${databaseUrl}`);
  }

  if ((process.env.NODE_ENV ?? '') !== 'test') {
    throw new Error(`Benchmark index operations must run with NODE_ENV=test. Received NODE_ENV=${process.env.NODE_ENV ?? 'undefined'}`);
  }
}

async function applyIndexes() {
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "CustomList_userId_id_idx" ON "CustomList"("userId", "id");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ListMovie_movieId_listId_idx" ON "ListMovie"("movieId", "listId");
  `);

  console.log('Applied benchmark overlap indexes on the test database.');
}

async function dropIndexes() {
  await prisma.$executeRawUnsafe(`
    DROP INDEX IF EXISTS "CustomList_userId_id_idx";
  `);
  await prisma.$executeRawUnsafe(`
    DROP INDEX IF EXISTS "ListMovie_movieId_listId_idx";
  `);

  console.log('Dropped benchmark overlap indexes from the test database.');
}

async function main() {
  ensureTestDatabase();

  if (mode === 'apply') {
    await applyIndexes();
    return;
  }

  if (mode === 'drop') {
    await dropIndexes();
    return;
  }

  throw new Error('Usage: tsx prisma/benchmarkIndexes.ts <apply|drop>');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
