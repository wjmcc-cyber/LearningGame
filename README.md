# Study League MVP

Study League is a student-run, gamified university study platform MVP built with Next.js, TypeScript, Tailwind CSS, Prisma, and SQLite, with a Cloudflare deployment path using Workers, D1, and R2.

## What is included

- Email/password signup, login, logout, hashed passwords, and cookie sessions.
- Classroom creation with one manager, permanent invite links, membership management, and classroom chat.
- Document uploads with hidden uploader identity in the UI, content-hash duplicate blocking, and local file storage.
- Quiz generation from one document, many documents, or Select All.
- OpenAI-backed quiz generation when `OPENAI_API_KEY` is set, with a deterministic fallback generator when it is not.
- Points ledger with cached totals for both classroom and friend leaderboards.
- Friend search, instant friend adds, and direct messages.
- Seed data for demo users, classroom content, quiz history, points, friendships, and chat.

## Stack

- Next.js App Router: server-rendered UI, forms, and route structure.
- Tailwind CSS: utility styling without a separate component framework.
- Prisma Client: typed ORM access for all app queries and mutations.
- Prisma schema: single source of truth for the app data model.
- SQLite: local MVP database model that also maps to Cloudflare D1 for hosted deployment.

## Dependency rationale

- `@prisma/client`: runtime ORM client for typed database access.
- `prisma`: schema validation and client generation.
- `@prisma/adapter-d1`: Prisma adapter for Cloudflare D1 in the hosted runtime.
- `@opennextjs/cloudflare`: adapts the Next.js app to Cloudflare Workers.
- `wrangler`: Cloudflare CLI for D1, R2, local preview, and deploys.
- `bcryptjs`: password hashing without native compilation.
- `zod`: server-side validation for mutating actions.
- `pdf-parse`: PDF text extraction for quizable study content when the file is readable.
- `@prisma/adapter-libsql`: keeps local Prisma usage working with the JavaScript engine path.
- `@libsql/client`: local SQLite/libSQL client used by the Prisma adapter in local development.
- `@cloudflare/workers-types`: type definitions for Cloudflare bindings like D1 and R2.

## Environment

Create `.env.local` with:

```env
DATABASE_URL="file:./dev.db"
SESSION_COOKIE_NAME="study_league_session"
SESSION_TTL_DAYS="30"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5-mini"
STORAGE_ROOT=""
SITE_URL="http://localhost:3000"
TURSO_AUTH_TOKEN=""
```

`OPENAI_API_KEY` is optional. If it is blank, quiz generation falls back automatically to a deterministic local generator. Prisma is configured to load `.env.local` first and `.env` second.

For local Cloudflare-style secrets and vars, copy `.dev.vars.example` to `.dev.vars`.

## Exact run commands

Windows PowerShell in this repo:

```powershell
Copy-Item .env.example .env.local -Force
npm.cmd install
npx prisma generate
npm.cmd run db:push
npm.cmd run db:seed
npm.cmd run dev
```

Production verification:

```powershell
npm.cmd run lint
npm.cmd run build
```

## Deploy on Cloudflare

Cloudflare is the best low-cost or free-tier target for this repo after migration because the app can run on Workers, store relational data in D1, and store uploaded study documents in R2. Official docs:

- Next.js on Workers: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- D1: https://developers.cloudflare.com/d1/
- R2: https://developers.cloudflare.com/r2/
- OpenNext Cloudflare adapter: https://opennext.js.org/cloudflare/get-started
- Prisma with D1: https://www.prisma.io/docs/orm/overview/databases/cloudflare-d1

### Cloudflare files in this repo

- [`wrangler.jsonc`](./wrangler.jsonc): Worker, D1, and R2 binding config.
- [`open-next.config.ts`](./open-next.config.ts): OpenNext Cloudflare adapter config.
- [`cloudflare-env.d.ts`](./cloudflare-env.d.ts): Worker binding types.
- [`.github/workflows/deploy-cloudflare.yml`](./.github/workflows/deploy-cloudflare.yml): Linux-based GitHub Action deploy path.

### One-time Cloudflare setup

1. Create a Cloudflare account.
2. Create a D1 database:

```powershell
npx wrangler d1 create learning-game-db
```

3. Copy the returned `database_id` into [`wrangler.jsonc`](./wrangler.jsonc) for the `DB` binding.
4. Create the R2 buckets:

```powershell
npx wrangler r2 bucket create learning-game-opennext-cache
npx wrangler r2 bucket create learning-game-documents
```

5. Generate SQL for the Prisma schema:

```powershell
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/d1-init.sql
```

6. Apply the schema to D1:

```powershell
npx wrangler d1 execute learning-game-db --remote --file=prisma/d1-init.sql
```

7. In Cloudflare Workers, add these vars and secrets:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
SESSION_COOKIE_NAME=study_league_session
SESSION_TTL_DAYS=30
SITE_URL=https://your-worker-domain.workers.dev
```

8. Deploy from Linux, WSL, or GitHub Actions using:

```powershell
npm.cmd run cf:deploy
```

### GitHub Actions deploy

This repo includes a Linux GitHub Actions workflow so you do not need to build OpenNext on Windows locally.

Add these GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Then either:

- push to `main`, or
- run the `Deploy Cloudflare` workflow manually from the Actions tab

### Cloudflare behavior in this repo

- Cloudflare Workers host the Next.js app through OpenNext.
- D1 replaces the hosted SQLite file for application data.
- R2 stores uploaded study documents.
- `SITE_URL` drives canonical metadata, `robots.txt`, and `sitemap.xml`.
- If `OPENAI_API_KEY` is not set, quiz generation still falls back automatically.

## Demo credentials

- `alice@student.test` / `Password123!`
- `ben@student.test` / `Password123!`
- `chloe@student.test` / `Password123!`
- Classroom invite code: `bio101-sprint`
- Join URL after seeding: `http://localhost:3000/join/bio101-sprint`

## Main routes

- `/`
- `/login`
- `/signup`
- `/dashboard`
- `/classrooms/new`
- `/classrooms/[id]`
- `/classrooms/[id]/quiz/[attemptId]`
- `/join/[inviteCode]`
- `/profile`
- `/friends`
- `/messages`
- `/leaderboards/classroom/[id]`
- `/leaderboards/friends`

## Data model

The Prisma schema includes all requested MVP entities:

- `User`
- `Session`
- `Classroom`
- `ClassroomMember`
- `ClassroomInvite`
- `Document`
- `QuizDocument` as the quiz/document linkage model
- `Quiz`
- `QuizQuestion`
- `QuizAttempt`
- `QuizResponse`
- `QuestionFeedback`
- `Friendship`
- `DirectMessageThread`
- `DirectMessage`
- `ClassroomMessage`
- `PointsLedger`

## Storage

- Uploaded files are stored locally in `storage/documents/`.
- In the Cloudflare deployment path, uploaded files are stored in the `STUDY_DOCUMENTS_BUCKET` R2 bucket.
- Documents are de-duplicated per classroom by SHA-256 content hash.
- Uploader ownership is stored in the database for permission checks, but not shown in the classroom document list.

## Known MVP limitations

- There is no classroom deletion flow yet.
- Friend requests are immediate accepts in V1 to keep the social loop thin.
- The fallback quiz generator is deterministic and demoable, but much simpler than the OpenAI path.
- PDF extraction is best-effort; if the runtime worker setup or extractable text fails, upload `txt` or `md` instead.
- `npm run db:push` bootstraps the SQLite schema directly for this MVP rather than using full Prisma migrations.
- Cloudflare D1 support uses Prisma's D1 adapter, but D1 does not provide full transaction semantics the same way a traditional server database does, so multi-step writes remain an MVP tradeoff.
- No realtime transport is included; chat and messages refresh on navigation/form submits.
- Minimal automated test coverage was not added in this pass.
- OpenNext on Windows can fail during local bundling because of symlink restrictions; use WSL, a Linux machine, or the included GitHub Action for Cloudflare deploys.

## Suggested demo flow

1. Sign in as `alice@student.test`.
2. Open `BIO101 Semester Sprint` from the dashboard classroom list.
3. Review the seeded documents and classroom leaderboard.
4. Generate a quiz from the selected documents.
5. Like or dislike questions after answering.
6. Visit `/friends` and `/messages` to inspect the seeded social data.

## Project structure

```text
app/
components/
lib/
  actions/
  auth/
  permissions/
  quiz/
  storage/
prisma/
public/
scripts/
storage/
types/
```
