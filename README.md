# Book Club Web App

A private full-stack book club application with ranked-choice voting, URL metadata import, and monthly finalization.

---

## Tech Stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| Frontend     | React 18 + Vite + TypeScript + Tailwind CSS |
| State / Data | TanStack Query v5 + React Hook Form         |
| Drag & Drop  | dnd-kit                                     |
| Routing      | React Router v6                             |
| Backend      | Node.js + Express + TypeScript              |
| ORM          | Prisma                                      |
| Database     | PostgreSQL                                  |
| Auth         | bcrypt + httpOnly cookie sessions           |

---

## Project Structure

```
book-club/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── index.ts              # Express entry point
│       ├── lib/prisma.ts         # Prisma singleton
│       ├── middleware/
│       │   ├── auth.ts           # requireAuth middleware
│       │   └── validate.ts       # Zod validation middleware
│       ├── controllers/          # Business logic
│       │   ├── authController.ts
│       │   ├── memberController.ts
│       │   ├── monthController.ts
│       │   ├── bookOptionController.ts
│       │   ├── dateOptionController.ts
│       │   ├── voteController.ts
│       │   └── metadataController.ts
│       ├── routes/               # Route definitions
│       │   ├── auth.ts
│       │   ├── members.ts
│       │   ├── months.ts
│       │   ├── bookOptions.ts
│       │   ├── dateOptions.ts
│       │   ├── votes.ts
│       │   └── metadata.ts
│       └── utils/
│           └── fetchBookMetadata.ts  # URL scraping utility
└── frontend/
    └── src/
        ├── main.tsx
        ├── App.tsx               # Router setup
        ├── index.css             # Tailwind + component classes
        ├── lib/api.ts            # Fetch wrapper
        ├── types/index.ts        # Shared TypeScript types
        ├── hooks/
        │   ├── useAuth.ts
        │   └── useBookClub.ts    # All TanStack Query hooks
        ├── components/           # Reusable UI components
        │   ├── Layout.tsx
        │   ├── MonthStatusBadge.tsx
        │   ├── HostSelector.tsx
        │   ├── BookProposalForm.tsx
        │   ├── BookLinkImportForm.tsx
        │   ├── DateProposalForm.tsx
        │   ├── RankedBookVote.tsx
        │   ├── DateAvailabilityVote.tsx
        │   ├── BookResults.tsx
        │   ├── DateResults.tsx
        │   ├── RevealResultsButton.tsx
        │   └── FinalizeMonthButton.tsx
        └── pages/
            ├── LoginPage.tsx
            ├── RegisterPage.tsx
            ├── DashboardPage.tsx
            ├── ArchiveListPage.tsx
            ├── ArchiveDetailPage.tsx
            └── ProfilePage.tsx
```

---

## Prerequisites

- Node.js ≥ 18
- PostgreSQL ≥ 14 running locally (or a hosted instance)

---

## Setup

### 1. Clone and install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure the backend environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/bookclub"
SESSION_SECRET="a-long-random-secret-string"
PORT=3001
CLIENT_ORIGIN="http://localhost:5173"
NODE_ENV=development
```

### 3. Create the database

```bash
# Create the database in psql (or via pgAdmin)
createdb bookclub

# Push the schema to the database
cd backend
npm run db:push

# Or use migrations (recommended for production)
npm run db:migrate
```

### 4. Generate the Prisma client

```bash
cd backend
npm run db:generate
```

### 5. Seed example data

```bash
cd backend
npm run db:seed
```

This creates three test members (all with password `password123`):

| Email             | Role               |
| ----------------- | ------------------ |
| alice@example.com | Current month host |
| bob@example.com   | Regular member     |
| carol@example.com | Regular member     |

---

## Running the App

### Backend (runs on port 3001)

```bash
cd backend
npm run dev
```

### Frontend (runs on port 5173)

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## API Overview

| Method  | Endpoint                              | Description                     |
| ------- | ------------------------------------- | ------------------------------- |
| POST    | `/api/auth/register`                  | Register                        |
| POST    | `/api/auth/login`                     | Login                           |
| POST    | `/api/auth/logout`                    | Logout                          |
| GET     | `/api/auth/me`                        | Current user                    |
| GET     | `/api/members`                        | All members (for host selector) |
| GET/PUT | `/api/members/me`                     | View/edit profile               |
| GET     | `/api/months`                         | List all months (archive)       |
| GET     | `/api/months/current`                 | Get/create current month        |
| GET     | `/api/months/:monthKey`               | Get specific month              |
| PUT     | `/api/months/:monthKey/host`          | Set host (any member)           |
| POST    | `/api/months/:monthKey/reveal`        | Reveal results (host only)      |
| POST    | `/api/months/:monthKey/finalize`      | Finalize month (host only)      |
| POST    | `/api/months/:monthKey/books`         | Add book proposal (host only)   |
| PUT     | `/api/months/:monthKey/books/:bookId` | Edit book (host only)           |
| DELETE  | `/api/months/:monthKey/books/:bookId` | Delete book (host only)         |
| POST    | `/api/months/:monthKey/dates`         | Add date option (host only)     |
| PUT     | `/api/months/:monthKey/dates/:dateId` | Edit date (host only)           |
| DELETE  | `/api/months/:monthKey/dates/:dateId` | Delete date (host only)         |
| POST    | `/api/months/:monthKey/votes/books`   | Submit ranked book ballot       |
| POST    | `/api/months/:monthKey/votes/dates`   | Submit date availability        |
| GET     | `/api/months/:monthKey/votes/me`      | My vote status                  |
| GET     | `/api/months/:monthKey/results/books` | Book rankings (Borda count)     |
| GET     | `/api/months/:monthKey/results/dates` | Date availability results       |
| POST    | `/api/metadata/fetch`                 | Fetch book metadata from URL    |

---

## Business Rules Summary

- **Host selection**: Any authenticated member can set or change the host for the current month.
- **Book/date proposals**: Only the current host can add, edit, or delete proposals (max 5 books, 4 dates).
- **Voting**: Each member can submit exactly one ranked book ballot and one date availability submission per month. Both are locked after submission.
- **Borda count**: With N books, rank 1 gets N points, rank 2 gets N–1, etc.
- **Result visibility**: Results are hidden from non-hosts by default. The host can reveal them manually.
- **Finalization**: Host selects the winning book and meeting date. Ties are broken by the host choosing manually. Finalization locks the month.
- **Archive**: Shows month, host name, proposed books, final book rankings, and winning book. Does NOT show host address, proposed dates, date vote totals, or final meeting date.

---

## Production Notes

- Replace the cookie-based session with a proper signed session (e.g., `express-session` with a secure store) or JWTs for production.
- Set `NODE_ENV=production` and use `npm run build` + `npm start` for the backend.
- Serve the Vite build (`npm run build`) via a static host or the same Express server.
- Add HTTPS — the `secure: true` cookie flag requires it.
