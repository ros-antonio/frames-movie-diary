# Gold Benchmark Setup

This guide is for benchmarking the two admin statistics endpoints on the **test database only**:

- optimized: `/api/statistics/list-overlaps`
- naive: `/api/statistics/list-overlaps-naive`

Everything below assumes:

- you are in `backend/`
- your benchmark work should target the database from `backend/.env.test`
- the test database URL contains `_test`

## Safety

These helper scripts are intentionally locked to the test database:

- `db:seed:benchmark`
- `db:benchmark:indexes:apply`
- `db:benchmark:indexes:drop`

They will refuse to run if `DATABASE_URL` does not contain `_test` or if `NODE_ENV` is not `test`.

## Benchmark Seed

Default benchmark seed:

```powershell
cd backend
npm.cmd run db:seed:benchmark
```

Custom benchmark size:

```powershell
cd backend
$env:BENCHMARK_USER_COUNT='250'
$env:BENCHMARK_MOVIES_PER_USER='60'
$env:BENCHMARK_LISTS_PER_USER='12'
$env:BENCHMARK_LIST_SIZE_MIN='12'
$env:BENCHMARK_LIST_SIZE_MAX='24'
npm.cmd run db:seed:benchmark
```

The benchmark seed creates:

- one benchmark admin account
- many benchmark users
- many user-owned movies
- many custom lists per user
- many `ListMovie` rows with intentional same-user overlap

Benchmark admin credentials:

- email: `admin@benchmark.local`
- password: `benchmark123`

## Clean Test Database

Before any benchmark run, reset the test database:

```powershell
cd backend
$env:NODE_ENV='test'
npm.cmd exec prisma migrate reset -- --force
```

That gives you the schema defined by the current branch migrations.

## Scenario A: Test DB Without The New Overlap Indexes

This is the easiest way to benchmark the endpoints before the added overlap indexes:

```powershell
cd backend
$env:NODE_ENV='test'
npm.cmd exec prisma migrate reset -- --force
npm.cmd run db:benchmark:indexes:drop
npm.cmd run db:seed:benchmark
```

After that, benchmark:

- `/api/statistics/list-overlaps-naive`
- `/api/statistics/list-overlaps`

This keeps the branch code, but removes the new benchmark indexes from the test DB.

## Scenario B: Test DB With The New Overlap Indexes

If you already ran Scenario A, just apply the indexes:

```powershell
cd backend
npm.cmd run db:benchmark:indexes:apply
```

If you want a fully clean indexed run from scratch:

```powershell
cd backend
$env:NODE_ENV='test'
npm.cmd exec prisma migrate reset -- --force
npm.cmd run db:seed:benchmark
```

The reset command recreates the schema with the current branch migrations, including the overlap indexes.

## Start The Backend Against The Test Database

```powershell
cd backend
$env:NODE_ENV='test'
npm.cmd run dev
```

The API will be available over HTTPS, usually at:

- `https://localhost:4000`

## What To Benchmark

Run the same JMeter scenario against:

1. `/api/statistics/list-overlaps-naive`
2. `/api/statistics/list-overlaps`