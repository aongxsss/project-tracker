# Project Tracker

A project tracking web app for AE teams — manage tasks across brands, track deadlines, and visualise workload in one place.

## Features

- **Task tracking** — create, edit, and delete tasks with brand, status, AE, and due date
- **Brand & status management** — add custom brands and statuses with colour coding
- **Overview dashboard** — stat cards, status distribution, brand workload, AE workload, and a task calendar
- **Insight charts** — 6 charts including created vs completed trend, aging tasks, workload per AE, and completion rate per brand
- **Notes canvas** — sticky notes with interactive checkboxes, auto-saved per user
- **Per-user data** — each account has its own isolated tasks, brands, and statuses
- **Responsive** — works on desktop, tablet, and mobile

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Charts | Recharts |
| Backend | FastAPI + asyncpg |
| Database | PostgreSQL 16 |
| Auth | JWT via httpOnly cookies |
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

The default values in `.env.example` work out of the box for local development — no changes needed.

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

Open http://localhost:5173 and create an account. Each account gets its own isolated workspace with default brands and statuses pre-loaded.

## Deployment

This project is split across two platforms:

- **Frontend → [Vercel](https://vercel.com)**
- **Backend + Database → [Railway](https://railway.app)**

### Backend (Railway)

1. Create a new project on Railway
2. Add a **PostgreSQL** database service
3. Deploy the backend from this repo with **Root Directory** set to `backend`
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
│   │   ├── routers/        # auth, projects, config
│   │   ├── auth.py         # JWT + bcrypt
│   │   ├── database.py     # asyncpg + auto-migration
│   │   └── main.py
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # Overview, Tracking, Sidebar, etc.
│   │   ├── hooks/          # useAuth, useProjects, useConfig
│   │   └── types.ts
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── vite.config.ts
├── db/
│   └── init.sql
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SECRET_KEY` | JWT signing secret (keep this private) | `change-me-to-a-long-random-string` |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins | `https://your-app.vercel.app` |
| `VITE_API_URL` | Backend API base URL (frontend only) | `https://your-backend.up.railway.app` |
