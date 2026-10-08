# Book Club

A private, invite-only web app for running a book club: the host proposes books and dates, members rank the books and pick the dates they can make, and the app works out the winners.

## How it works

- **Meetings, not months.** Each meeting is one round: the host proposes up to 5 books and 4 dates, opens voting, members vote, and the host finalizes. The club doesn't have to meet on any fixed schedule.
- **One meeting is planned at a time.** Any member can start planning the next one (they become host, and anyone can reassign the host).
- **Drafts are private.** During setup only the host sees the book and date options, so they can revise freely. Everyone sees them once voting opens.
- **Voting.** Each member submits one vote: a full drag-and-drop ranking of the books plus the dates they're available. It's locked once submitted. Once anyone votes, the books and dates are locked too.
- **Scoring.** Books use a Borda count: with N books, a first choice earns N points, second earns N−1, and so on. Dates are ranked by how many members can make them.
- **Results.** Hidden from everyone but the host until the host reveals them.
- **Finalizing.** The top book and best-attended date win automatically. If options tie for first, the host picks between the tied options. Finalizing locks the meeting and saves a snapshot of the ranking.
- **Home page.** Shows each finalized meeting that hasn't happened yet (book, date, host's address) above the meeting being planned.
- **Archive.** Past meetings with the host and final book ranking. It doesn't show proposed dates, date votes, or the host's address.
- **Invite-only.** The club has one reusable join link, shown on the Members page. Any member can copy it or reset it if it leaks.
- **Password reset.** Self-service by email from the sign-in page. Changing or resetting a password signs out all other sessions.

## Tech stack

| Layer    | Technology                                               |
| -------- | -------------------------------------------------------- |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, React Router   |
| Data     | TanStack Query, React Hook Form, dnd-kit (ranked voting) |
| Backend  | Node.js, Express, TypeScript, Zod (validation)           |
| Database | PostgreSQL with Prisma                                   |
| Auth     | bcrypt passwords, signed httpOnly session cookie         |
| Email    | Nodemailer over Gmail (password resets, feedback)        |
| Books    | Open Library search (no API key needed)                  |
| Tests    | Vitest                                                   |

## Project layout

```
book-club/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Data model
│   │   ├── migrations/          # Schema history (apply with db:migrate / db:deploy)
│   │   ├── seed.ts, reset.ts    # Sample data / wipe and reseed
│   │   └── invite.ts, reset-password.ts   # Admin commands (see below)
│   └── src/
│       ├── index.ts             # Express app
│       ├── routes/              # URL → controller wiring
│       ├── controllers/         # Request handling and business rules
│       ├── services/            # Shared logic: results/scoring, join link, password reset
│       ├── middleware/          # Auth, validation, error handling
│       └── lib/                 # Prisma client, session cookie, tokens, mailer
└── frontend/
    └── src/
        ├── pages/               # One file per route
        ├── components/          # Dashboard pieces, voting, results, forms
        ├── hooks/               # TanStack Query hooks (useBookClub.ts, useAuth.ts)
        └── lib/, types/         # Fetch wrapper, helpers, shared types
```

## Local setup

**Prerequisites:** Node.js 18+ and PostgreSQL 14+.

```bash
# 1. Install dependencies (from the repo root)
npm install

# 2. Configure the backend
cp backend/.env.example backend/.env
#    then edit backend/.env — at minimum DATABASE_URL and SESSION_SECRET.
#    Generate a secret with: openssl rand -base64 32

# 3. Create the database and apply the schema
createdb bookclub
cd backend
npm run db:migrate

# 4. (Optional) Load sample data
npm run db:seed
```

The seed creates three members, all with password `password123`: `alice@example.com` (hosting the upcoming meeting), `bob@example.com`, and `carol@example.com` (hosting the meeting being planned).

## Running

In two terminals:

```bash
cd backend && npm run dev     # API on http://localhost:3001
cd frontend && npm run dev    # App on http://localhost:5173
```

Open http://localhost:5173. The frontend forwards `/api` requests to the backend, so there's nothing else to configure.

**After changing `backend/.env`, restart the backend.** Settings (including email) are only read when the server starts.

### Email

Password reset and feedback emails go through Gmail. Set `GMAIL_USER` and `GMAIL_APP_PASSWORD` in `backend/.env`. The password is a Google **app password**, not your normal one: create it at https://myaccount.google.com/apppasswords (requires 2-Step Verification). Google revokes app passwords if you change your Google password, so make a new one if emails stop arriving.

Without email configured, the app still runs. In development, reset links are printed in the backend terminal instead.

## Admin commands

Run these from `backend/`. They talk directly to the database in `DATABASE_URL`, so they only work for someone with that connection string — they aren't reachable through the website.

| Command                             | What it does                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run invite`                    | Prints the club's join link (creating one if needed). Use it to get the first member in.         |
| `npm run reset-password -- <email>` | Prints a one-time reset link for that member without emailing it — for when their email bounces. |

**Once the app is live,** these need to run against the production database: temporarily set `DATABASE_URL` (and `CLIENT_ORIGIN`, so links point at the real site) to the production values when you run them.

## Other scripts (backend)

| Command              | What it does                                                               |
| -------------------- | -------------------------------------------------------------------------- |
| `npm run dev`        | Start the API with auto-reload                                             |
| `npm test`           | Run tests (Borda scoring and winner/tie-break rules)                       |
| `npm run build`      | Compile TypeScript to `dist/`                                              |
| `npm run db:migrate` | Apply migrations locally; after editing `schema.prisma`, creates a new one |
| `npm run db:deploy`  | Apply pending migrations in production (doesn't create new ones)           |
| `npm run db:seed`    | Add sample data (skips meetings if any exist)                              |
| `npm run db:reset`   | Delete **all** data and reseed — local use only                            |
| `npm run db:studio`  | Browse the database in Prisma Studio                                       |

## API overview

All routes are under `/api` and, except sign-in, registration, and password reset, require a signed-in member. Host-only actions are enforced on the server.

| Method              | Endpoint                                 | Description                                                    |
| ------------------- | ---------------------------------------- | -------------------------------------------------------------- |
| POST                | `/auth/register`                         | Register (requires the club's join token)                      |
| GET                 | `/auth/join/:token`                      | Check whether a join link is valid                             |
| POST                | `/auth/login`, `/auth/logout`            | Sign in / out                                                  |
| GET                 | `/auth/me`                               | Current member                                                 |
| POST                | `/auth/forgot-password`                  | Email a reset link (same response whether or not it matched)   |
| POST                | `/auth/reset-password`                   | Set a new password from a reset link                           |
| GET                 | `/members`                               | All members (id and name)                                      |
| GET / PUT / DELETE  | `/members/me`                            | View, edit, or delete your account                             |
| GET                 | `/members/join-link`                     | The club's join link                                           |
| POST                | `/members/join-link/reset`               | Replace the join link                                          |
| GET                 | `/meetings/current`                      | Dashboard: upcoming finalized meetings + the one being planned |
| GET                 | `/meetings`                              | Archive: meetings that have happened                           |
| POST                | `/meetings`                              | Start planning the next meeting                                |
| GET                 | `/meetings/:id`                          | One meeting                                                    |
| PUT                 | `/meetings/:id/host`                     | Set the host (any member)                                      |
| POST                | `/meetings/:id/open-voting`              | Host: open voting                                              |
| POST                | `/meetings/:id/reveal`                   | Host: show results to everyone                                 |
| POST                | `/meetings/:id/finalize`                 | Host: finalize (tie-break choices only when tied)              |
| POST / PUT / DELETE | `/meetings/:id/books[/:bookId]`          | Host: manage book options (max 5)                              |
| POST / PUT / DELETE | `/meetings/:id/dates[/:dateId]`          | Host: manage date options (max 4)                              |
| POST                | `/meetings/:id/votes`                    | Submit your vote (ranking + dates, once)                       |
| GET                 | `/meetings/:id/votes/me`                 | Whether you've voted                                           |
| GET                 | `/meetings/:id/results/books`, `/dates`  | Results (host, or everyone once revealed)                      |
| GET                 | `/metadata/books-search`, `/book-detail` | Open Library search for the book form                          |
| POST                | `/feedback`                              | Send feedback from the Help page                               |

## Deployment

Planned: Vercel (free Hobby plan) for the app and Neon (free Postgres) for the database. Before going live:

- Serve over HTTPS (required — the session cookie is secure-only in production).
- Set production values for `SESSION_SECRET` (new, long, random), `NODE_ENV=production`, `DATABASE_URL`, and `CLIENT_ORIGIN` (the real site address — join and reset links use it).
- Run `npm run db:deploy` against the production database.
