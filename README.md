# Frames Movie Diary

Full-stack movie diary application with a React frontend and an Express + Prisma backend.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Express, TypeScript, Prisma, PostgreSQL
- Authentication: JWT, bcrypt, `HttpOnly` cookies
- Testing: Vitest, Supertest, Playwright

## Project Structure

```text
frames-movie-diary/
|- frontend/
|- backend/
|- design/
`- docs/
```

## Environment Files

### Backend

Backend env files live in `backend/`.

- `.env` is used for normal development
- `.env.test` is used when `NODE_ENV=test`

The backend loads env files in this order:

1. `backend/.env`
2. `backend/.env.<NODE_ENV>` if `NODE_ENV` is not `development`

Use `backend/.env.example` as the template for `backend/.env`.

Typical backend env values:

```env
DATABASE_URL="postgresql://frames_user:frames_pass@localhost:5432/frames_dev"
JWT_SECRET="replace_with_a_long_random_secret"
SESSION_IDLE_TIMEOUT_MINUTES="15"
SSL_KEY_PATH=""
SSL_CERT_PATH=""
SSL_HOSTS=""
```

### Frontend

Frontend env files live in `frontend/`.

Use `frontend/.env.example` as the template for `frontend/.env`.

Typical frontend env values:

```env
VITE_API_BASE_URL=/api
VITE_BACKEND_URL=https://localhost:4000
VITE_SESSION_IDLE_TIMEOUT_MINUTES=15
```

## Setup

### 1. Install dependencies

Run in `backend/`:

```powershell
npm install
```

Run in `frontend/`:

```powershell
npm install
```

### 2. Create the databases

Create:

- one PostgreSQL database for development
- one PostgreSQL database for tests

### 3. Create env files

- `backend/.env`
- `backend/.env.test`
- optionally `frontend/.env`

### 4. Run Prisma migrations

Run in `backend/`:

```powershell
npm exec prisma migrate dev
```

### 5. Seed the development database

Run in `backend/`:

```powershell
npm run db:seed
```

## Run the Project

### Start the backend

Run in `backend/`:

```powershell
npm run dev
```

Notes:

- default port: `4000`
- the backend runs over HTTPS
- if `SSL_KEY_PATH` and `SSL_CERT_PATH` are empty, a temporary self-signed certificate is generated
- the generated development certificate includes `localhost`, `127.0.0.1`, detected LAN IPv4 addresses, and any extra hosts listed in `SSL_HOSTS`

If port `4000` is already in use:

Run in `backend/`:

```powershell
$env:PORT=4001
npm run dev
```

### Start the frontend

Run in `frontend/`:

```powershell
npm run dev
```

Notes:

- default URL: `https://localhost:5173`
- by default, the frontend proxies `/api` to `https://localhost:4000`
- to use a backend running on a different machine, set `VITE_BACKEND_URL=https://<server-lan-ip>:4000`

## Tests

### Frontend tests

Run in `frontend/`:

```powershell
npm test
```

### Backend tests

Run in `backend/`:

```powershell
npm test
```

### End-to-end tests

Run in `frontend/`:

```powershell
npm run e2e
```

## Build

### Backend build

Run in `backend/`:

```powershell
npm run build
```

### Frontend build

Run in `frontend/`:

```powershell
npm run build
```
