# Project Tracker

A project tracking web app for AE teams — manage projects across brands, track deadlines, collaborate via threads, and visualise workload in one place.

## Features

- **Project tracking** — manage projects with brand, assignee, priority, dual status, and deadlines
- **Project detail panel** — description editor, file attachments, and per-project threads
- **Overview & insights** — stat cards, workload charts, status distribution, and project calendar
- **Notes** — sticky notes with rich text and pinning
- **Spreadsheet** — custom columns, inline editing, and CSV/Excel export
- **Per-user workspace** — fully isolated data per account
- **Responsive** — desktop, tablet, and mobile

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
