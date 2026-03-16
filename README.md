# Study League MVP

Study League is a student-run, gamified university study platform MVP built with Next.js, TypeScript, Tailwind CSS, Prisma, and SQLite.

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
- SQLite: local MVP database with no external infrastructure.

## Dependency rationale

- `@prisma/client`: runtime ORM client for typed database access.
- `prisma`: schema validation and client generation.
- `bcryptjs`: password hashing without native compilation.
- `zod`: server-side validation for mutating actions.
- `pdf-parse`: PDF text extraction for quizable study content when the file is readable.

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
```

`OPENAI_API_KEY` is optional. If it is blank, quiz generation falls back automatically to a deterministic local generator. Prisma is configured to load `.env.local` first and `.env` second.

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

## Deploy on Railway

Railway is the best first hosted option for this repo because the app still uses SQLite and local file storage, and Railway supports both GitHub deploys and persistent volumes with a public URL. Official docs:

- Volumes: https://docs.railway.com/reference/volumes
- Deployments from GitHub: https://docs.railway.com/guides/github
- Public networking and generated domains: https://docs.railway.com/guides/public-networking

### One-time Railway setup

1. Push this repo to GitHub.
2. In Railway, create a new project from the GitHub repo and select the branch you want to deploy.
3. Add a volume to the app service and mount it at `/data`.
4. In the service variables, set:

```env
DATABASE_URL="file:/data/dev.db"
STORAGE_ROOT="/data/storage"
SESSION_COOKIE_NAME="study_league_session"
SESSION_TTL_DAYS="30"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5-mini"
SITE_URL="https://your-app.up.railway.app"
```

5. In Railway networking, generate a public domain for the service.
6. Redeploy once after the volume and variables are set.

This repo includes [`railway.toml`](./railway.toml), a production start script, and a `/health` route so Railway can build, boot, and health-check the app without extra platform code.

### Railway behavior in this repo

- `npm run start` automatically ensures the SQLite schema exists before starting Next.js.
- The production server binds to `0.0.0.0` so the app is reachable through Railway networking.
- Uploaded documents are stored under the mounted persistent volume instead of ephemeral container storage.
- If `OPENAI_API_KEY` is not set, quiz generation still works through the fallback generator.
- Users can sign up directly on the deployed app, so seeding is optional in production.
- `SITE_URL` drives canonical metadata, `robots.txt`, and `sitemap.xml` for the public site.

### First production launch

If you want demo content on the hosted app, seed locally first and deploy the resulting code only for structure, not for data. Railway volumes are runtime state, so the hosted database starts empty unless you import or seed it in the deployed environment.

For a clean public launch, deploy first and create the first account through `/signup`.

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
- Documents are de-duplicated per classroom by SHA-256 content hash.
- Uploader ownership is stored in the database for permission checks, but not shown in the classroom document list.

## Known MVP limitations

- There is no classroom deletion flow yet.
- Friend requests are immediate accepts in V1 to keep the social loop thin.
- The fallback quiz generator is deterministic and demoable, but much simpler than the OpenAI path.
- PDF extraction is best-effort; if the runtime worker setup or extractable text fails, upload `txt` or `md` instead.
- `npm run db:push` bootstraps the SQLite schema directly for this MVP rather than using full Prisma migrations.
- No realtime transport is included; chat and messages refresh on navigation/form submits.
- Minimal automated test coverage was not added in this pass.
- Railway is the easiest production path for the current architecture, but Railway volumes support only one volume per service and cannot be used with replicas, so true higher-scale production should move to Postgres and object storage instead of SQLite plus local disk.

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
