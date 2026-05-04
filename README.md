# Project Tracker

A project tracking web app for AE teams — manage projects across brands, track deadlines, collaborate via threads, and visualise workload in one place.

## Features

- **Project tracking** — create, edit, and delete projects with brand, customer, assignee, priority, dual status (internal + client), and due date
- **Project detail panel** — ClickUp-style side panel with full metadata, inline description editor, file attachments, and threaded chat per project
- **Threads** — per-project chat with file attachments; images show inline preview, other files as download chips; files staged before send
- **File attachments** — upload files (max 10 MB each) stored per project; embedded inline in description as download links
- **Brand & status management** — custom brands, internal statuses, client statuses, assignees, and priorities with colour coding
- **Overview dashboard** — stat cards, status distribution, brand workload, assignee workload, and a project calendar
- **Insight charts** — created vs completed trend, aging tasks, workload per assignee, completion rate per brand, and more
- **Notes canvas** — Google Keep-style sticky notes with rich text, pinning, and colour coding
- **Spreadsheet** — per-user sheets with custom columns, inline editing, and CSV/Excel export
- **Per-user data** — each account has isolated projects, config, notes, threads, and attachments
- **Responsive** — works on desktop, tablet, and mobile

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Charts | Recharts |
| Backend | FastAPI + asyncpg |
| Database | PostgreSQL 16 |
| Auth | JWT via httpOnly cookies |
| File storage | PostgreSQL BYTEA (max 10 MB per file) |
| Dev environment | Docker Compose |

## Getting Started (Local with Docker)

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose

### 1. Clone the repo

```bash
git clone https://github.com/aongxsss/project-tracker.git
cd project-tracker
```

### 2. Create environment file

```bash
cp .env.example .env.local
```

The default values in `.env.example` work out of the box for local development.

### 3. Start all services

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

### 4. Register an account

Open http://localhost:5173 and create an account. Each account gets its own isolated workspace with default brands, statuses, and priorities pre-loaded.

## Deployment

Frontend → [Vercel](https://vercel.com) · Backend + Database → [Railway](https://railway.app)

### Backend (Railway)

1. Create a new project on Railway
2. Add a **PostgreSQL** database service
3. Deploy from this repo with **Root Directory** set to `backend`
4. Set environment variables:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
SECRET_KEY=<long-random-string>
ALLOWED_ORIGINS=https://your-app.vercel.app
```

### Frontend (Vercel)

1. Import this repo on Vercel
2. Set **Root Directory** to `frontend`
3. Set environment variable:

```
VITE_API_URL=https://your-backend.up.railway.app
```

## Project Structure

```
project-tracker/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── projects.py
│   │   │   ├── threads.py       # per-project chat
│   │   │   ├── attachments.py   # file upload/download (BYTEA)
│   │   │   ├── notes.py
│   │   │   ├── sheets.py
│   │   │   └── config.py        # brands, statuses, assignees, priorities
│   │   ├── auth.py              # JWT + bcrypt
│   │   ├── database.py          # asyncpg + auto-migration
│   │   ├── models.py
│   │   └── main.py
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProjectDetail.tsx  # ClickUp-style detail panel
│   │   │   ├── ProjectModal.tsx   # add/edit form
│   │   │   ├── Tracking.tsx       # project table + mobile cards
│   │   │   ├── Overview.tsx
│   │   │   ├── Notes.tsx
│   │   │   ├── Sheet.tsx
│   │   │   ├── InsightCharts.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── hooks/
│   │   │   ├── useProjects.ts
│   │   │   ├── useProjectThreads.ts
│   │   │   ├── useProjectAttachments.ts
│   │   │   ├── useNotes.ts
│   │   │   ├── useSheets.ts
│   │   │   ├── useConfig.ts
│   │   │   └── useAuth.ts
│   │   └── types.ts
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── vite.config.ts
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SECRET_KEY` | JWT signing secret | `change-me-to-a-long-random-string` |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins | `https://your-app.vercel.app` |
| `VITE_API_URL` | Backend API base URL (frontend only) | `https://your-backend.up.railway.app` |
