# Study League MVP

Study League is a student-run, gamified university study platform MVP built with Next.js, TypeScript, Tailwind CSS, Prisma, Supabase Postgres, and Supabase Storage.

## What is included

- Email/password signup, login, logout, hashed passwords, and cookie sessions.
- Classroom creation with one manager, permanent invite links, membership management, and classroom chat.
- Document uploads with hidden uploader identity in the UI, content-hash duplicate blocking, and Supabase Storage support.
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
- Supabase Postgres: hosted relational database for users, classrooms, quiz state, social features, and points.
- Supabase Storage: hosted bucket storage for uploaded study documents.

## Dependency Rationale

- `@prisma/client`: runtime ORM client for typed database access.
- `prisma`: schema validation and client generation.
- `@supabase/supabase-js`: server-side storage client for uploading and deleting study files.
- `bcryptjs`: password hashing without native compilation.
- `zod`: server-side validation for mutating actions.
- `pdf-parse`: PDF text extraction for quizable study content when the file is readable.

## Environment

Create `.env.local` with:

```env
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
SESSION_COOKIE_NAME="study_league_session"
SESSION_TTL_DAYS="30"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5-mini"
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY=""
SUPABASE_STORAGE_BUCKET="study-documents"
STORAGE_ROOT=""
SITE_URL="http://localhost:3000"
```

Notes:

- `OPENAI_API_KEY` is optional. If it is blank, quiz generation falls back automatically to the deterministic generator.
- `DATABASE_URL` should use the Supabase pooled connection string.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to the browser.
- If the Supabase storage variables are missing locally, document files fall back to `storage/documents/`.

## Exact Run Commands

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

## Supabase Setup

1. Create a Supabase project.
2. In `Project Settings -> Database`, copy:
   - a Postgres connection string into `DATABASE_URL`
3. In `Project Settings -> API`, copy:
   - `Project URL` into `SUPABASE_URL`
   - the `service_role` key into `SUPABASE_SERVICE_ROLE_KEY`
4. In `Storage`, create a bucket named `study-documents`, or set `SUPABASE_STORAGE_BUCKET` to your bucket name.
5. Push the Prisma schema:

```powershell
npm.cmd run db:push
```

6. Seed demo data:

```powershell
npm.cmd run db:seed
```

## Recommended Deployment

The simplest hosted stack after this migration is:

- Vercel for the Next.js app
- Supabase for Postgres and Storage

Set the same environment variables from `.env.local` in your hosting provider.

## Demo Credentials

- `alice@student.test` / `Password123!`
- `ben@student.test` / `Password123!`
- `chloe@student.test` / `Password123!`
- Classroom invite code: `bio101-sprint`
- Join URL after seeding: `http://localhost:3000/join/bio101-sprint`

## Main Routes

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

## Data Model

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

- Uploaded files are stored in the Supabase Storage bucket configured by `SUPABASE_STORAGE_BUCKET`.
- If Supabase storage credentials are not configured locally, files fall back to `storage/documents/`.
- Documents are de-duplicated per classroom by SHA-256 content hash.
- Uploader ownership is stored in the database for permission checks, but not shown in the classroom document list.

## Known MVP Limitations

- There is no classroom deletion flow yet.
- Friend requests are immediate accepts in V1 to keep the social loop thin.
- The fallback quiz generator is deterministic and demoable, but much simpler than the OpenAI path.
- PDF extraction is best-effort; if extractable text fails, upload `txt` or `md` instead.
- `npm run db:push` uses Prisma schema push for the MVP rather than a full migration history.
- No realtime transport is included; chat and messages refresh on navigation and form submits.
- Minimal automated test coverage was not added in this pass.

## Suggested Demo Flow

1. Sign in as `alice@student.test`.
2. Open `BIO101 Semester Sprint` from the dashboard classroom list.
3. Review the seeded documents and classroom leaderboard.
4. Generate a quiz from the selected documents.
5. Like or dislike questions after answering.
6. Visit `/friends` and `/messages` to inspect the seeded social data.

## Project Structure

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
storage/
types/
```
