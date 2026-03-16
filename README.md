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
- PDF extraction is best-effort; if a PDF has poor extractable text, upload `txt` or `md` instead.
- `npm run db:push` bootstraps the SQLite schema directly for this MVP rather than using full Prisma migrations.
- No realtime transport is included; chat and messages refresh on navigation/form submits.
- Minimal automated test coverage was not added in this pass.

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
