## Database setup (Prisma + PostgreSQL)

### Development Database
1. Create a PostgreSQL database and set `DATABASE_URL` in `.env` to your development database.
2. Generate Prisma client and apply migrations:

    ```powershell
    Set-Location -Path 'C:\Tony\Computer_Science\frames-movie-diary\backend'
    npx prisma generate
    npx prisma migrate dev --name init
    ```

### Test Database
3. Create a separate test database and set `DATABASE_URL` in `.env.test` to your test database.
   - Tests **always** use `.env.test` (via `NODE_ENV=test`) and run in isolation on the test database.
   - The development database is never affected by test runs.

### Running Server & Tests
4. (Optional) Seed a demo user in development:

    ```powershell
    Set-Location -Path 'C:\Tony\Computer_Science\frames-movie-diary\backend'
    npm run db:seed
    ```

5. Run tests (requires PostgreSQL running):

    ```powershell
    Set-Location -Path 'C:\Tony\Computer_Science\frames-movie-diary\backend'
    npm test
    ```
   - Tests automatically set `NODE_ENV=test` and use the `.env.test` database.

6. Run the development server:

    ```powershell
    Set-Location -Path 'C:\Tony\Computer_Science\frames-movie-diary\backend'
    npm run dev
    ```
   - Server uses the `.env` database (development).

## Main endpoints

- `GET /api/health`
- `GET /api/movies?page=1&pageSize=10`
- `POST /api/movies`
- `GET /api/movies/:movieId`
- `PUT /api/movies/:movieId`
- `DELETE /api/movies/:movieId`
- `POST /api/movies/:movieId/frames`
- `DELETE /api/movies/:movieId/frames/:frameId`
- `GET /api/lists?page=1&pageSize=10`
- `POST /api/lists`
- `GET /api/lists/:listId`
- `PUT /api/lists/:listId`
- `DELETE /api/lists/:listId`
- `POST /api/lists/:listId/movies/:movieId`
- `DELETE /api/lists/:listId/movies/:movieId`
- `GET /api/statistics/overview`
- `POST /api/auth/register`
- `POST /api/auth/login`
