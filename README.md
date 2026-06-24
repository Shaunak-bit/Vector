# AeroFeed | High-Performance Keyset Paginated Catalog

AeroFeed is a full-stack, high-performance web application built with Next.js (App Router), TypeScript, Prisma, and PostgreSQL. It demonstrates fast, correct cursor-based (keyset) pagination over large datasets (example: 200k products).

Key features:
- Cursor-based keyset pagination sorted by `(createdAt DESC, id DESC)` to ensure stable, fast paging.
- Compound cursor (createdAt + id) to avoid duplicates/misses when new rows are inserted while paging.
- Efficient bulk seeding of large datasets via `prisma/seed.ts` using `createMany` in chunks.

Files of interest
- `prisma/schema.prisma` — data model, unique constraint and indexes.
- `prisma/seed.ts` — fast seeder; supports `SEED_COUNT` env var for test-sized datasets.
- `src/app/api/products/route.ts` — API implementing keyset pagination.

Getting started (local)
1. Install dependencies:
```bash
npm install
```
2. Provide a database and environment variables. For local Docker usage see the Docker section below. For an external DB, set in `.env`:
```
DATABASE_URL=postgresql://user:pass@host:5432/codevector
DIRECT_URL=postgresql://user:pass@host:5432/codevector
SEED_COUNT=1000
```
3. Push schema and seed (example):
```bash
npx prisma db push --url "$DIRECT_URL"
SEED_COUNT=1000 npx prisma db seed
```
4. Start dev server:
```bash
npm run dev
```

Docker (recommended for local testing)
1. Create `.env.docker` at project root with these example values:
```
DATABASE_URL=postgresql://postgres:postgres@db:5432/codevector
DIRECT_URL=postgresql://postgres:postgres@db:5432/codevector
SEED_COUNT=1000
NODE_ENV=production
PORT=3000
```
2. Build and start services (PowerShell / Bash):
```powershell
docker compose --env-file .env.docker up -d --build
```
3. Run the one-off seeder (wait for Postgres readiness first):
```powershell
docker compose --env-file .env.docker run --rm seeder
```
4. Tail app logs:
```powershell
docker compose --env-file .env.docker logs -f app
```
5. Tear down (remove volumes):
```powershell
docker compose down -v
```

Integration test (concurrency edge-case)
Purpose: prove keyset pagination does not duplicate or miss original items when new items are inserted while a client is paging.

Manual flow to reproduce and verify:
1. Seed a test database with a deterministic small dataset (e.g., `SEED_COUNT=1000`).
2. Begin paginating from the API (e.g., `GET /api/products?limit=20`) and collect IDs returned per page.
3. After the first page (or N pages), insert ~50 new products with `createdAt = now()` (these will be the newest).
4. Continue paginating using the last received cursor and collect remaining IDs until the original dataset is traversed.
5. Assert:
   - No duplicate IDs were observed across pages.
   - All original IDs (from before the insert) were seen exactly once.

Automating this test: create `tests/integration/paginationConcurrency.test.ts` to perform the above steps programmatically against a test DB. Use `SEED_COUNT=1000` for speed.

Notes & recommendations
- Add a global index `@@index([createdAt(sort: Desc), id(sort: Desc)])` in `schema.prisma` for fast queries when no `category` filter is used.
- Use a managed Postgres (Supabase/Neon) for public deployment; set `DIRECT_URL` to the direct schema-admin URL for seeding/migrations.
- Keep secrets out of the repository and use host secret managers in production.

Contact
If you submit this take-home, include the hosted URL, GitHub repo, and a short note describing choices, what you'd improve, and how you used AI during development. Send submissions or questions to siddharth@codevector.in.

