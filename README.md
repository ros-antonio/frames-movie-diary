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

## Core Features

- Private movie diary with ratings, reviews, and watch dates
- Custom lists with create, edit, search, add/remove movie, and delete flows
- Movie detail pages with saved scene captures
- Direct video URL support for built-in frame capture
- Manual PNG frame upload with timestamp and caption
- Authentication with session cookies, MFA, password reset, and admin tools

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
CORS_ALLOWED_ORIGINS=""
TRUST_PROXY="false"
AUTH_ISSUER="Frames Movie Diary"
APP_BASE_URL="https://localhost:5173"
SMTP_HOST=""
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""
EXPOSE_RECOVERY_TOKENS="true"
```

Notes:

- `AUTH_ISSUER` is used for MFA authenticator app labels and OTP metadata.
- `APP_BASE_URL` should point to the frontend origin used by your users, for example `https://your-app.example.com`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` are used to send password reset emails.
- `EXPOSE_RECOVERY_TOKENS` should stay `true` only for local/demo flows where you want password reset tokens returned in the API response instead of being delivered externally. Set it to `false` once SMTP delivery is configured.
- `CORS_ALLOWED_ORIGINS` can be a comma-separated allowlist for deployed frontend origins.
- `TRUST_PROXY` should be set to `true` when the backend runs behind a cloud proxy or load balancer.

### Frontend

Frontend env files live in `frontend/`.

Use `frontend/.env.example` as the template for `frontend/.env`.

Typical frontend env values:

```env
VITE_API_BASE_URL=/api
VITE_BACKEND_URL=https://localhost:4000
VITE_SESSION_IDLE_TIMEOUT_MINUTES=15
```

Movie link notes:

- movie links should use direct `http://` or `https://` video URLs
- browser-playable files such as `.mp4`, `.webm`, or `.ogg` are the intended capture sources

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
- the backend runs over HTTPS in development
- if `SSL_KEY_PATH` and `SSL_CERT_PATH` are empty, a temporary self-signed certificate is generated
- the generated development certificate includes `localhost`, `127.0.0.1`, detected LAN IPv4 addresses, and any extra hosts listed in `SSL_HOSTS`
- in production, if `SSL_KEY_PATH` and `SSL_CERT_PATH` are not set, the backend serves HTTP and should sit behind a TLS terminator such as Nginx, Caddy, or a cloud platform proxy that provides Let's Encrypt certificates

### Password reset email setup

To deliver password reset links by email, configure these backend env values:

```env
APP_BASE_URL="https://your-frontend-domain.example"
SMTP_HOST="smtp.your-provider.example"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="smtp-username"
SMTP_PASS="smtp-password"
SMTP_FROM="Frames Movie Diary <no-reply@your-domain.example>"
EXPOSE_RECOVERY_TOKENS="false"
```

Notes:

- `APP_BASE_URL` must be the public frontend origin that serves `/reset-password`.
- `SMTP_SECURE="true"` is usually used with port `465`.
- `SMTP_SECURE="false"` is usually used with port `587`.
- once SMTP is configured, the forgot-password page will only show a neutral success message and the reset link will be delivered by email.

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

## Frame Capture

- from a movie detail page, `Capture New Frame` opens a dedicated capture modal
- the modal accepts a direct video URL and loads it into a built-in browser player
- `Save Frame` captures the current video frame, stores it as a PNG data URL, records the playback timestamp automatically, and saves the caption you provide
- if a video source cannot be captured in-browser, users can still use `Upload PNG Frame` as a fallback

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
