# Sonoteca — Music Library (FastAPI + React)

**EN**: Sonoteca is a portfolio‑ready music library to manage **songs**, build **playlists**, search/filter your catalog, and view **stats**. Built as a fullstack monorepo with **FastAPI** + **PostgreSQL** + **Alembic** + **JWT auth (RBAC)** and a **React (Vite)** frontend. Designed to be deployed on **Render** (API + Postgres + Static Site).

**ES**: Sonoteca es una biblioteca musical lista para portfolio para gestionar **canciones**, armar **playlists**, buscar/filtrar tu catálogo y ver **estadísticas**. Hecha como monorepo fullstack con **FastAPI** + **PostgreSQL** + **Alembic** + **auth JWT (RBAC)** y frontend **React (Vite)**. Pensada para deploy en **Render** (API + Postgres + Static Site).

---

## Features / Funcionalidades (Deezer‑first)

- **Auth JWT + RBAC** (roles: `owner`, `editor`, `viewer`)
- **Real catalog (no mocks)**:
  - **Deezer API** (primary): **charts**, **new releases**, **search**, covers + durations + **official 30s previews**
  - **Spotify Web API** (optional): extra metadata only when configured (never required)
- **Playlists**: CRUD + add/remove tracks + **reorder**
- **Public share link** for playlists (read‑only)
- **Real preview player (Spotify‑style)**: play/pause, seek, volume, next/prev, queue (HTML5 `<audio>`)
- **Catalog API**: `/catalog/search`, `/catalog/charts`, `/catalog/new-releases`, `/catalog/track/{ref}`...
- **OpenAPI/Swagger** docs on `/docs`

---

## Monorepo structure / Estructura

- `backend/` — FastAPI API
- `frontend/` — React (Vite) web app
- `render.yaml` — Render IaC (API service + Postgres + static site)

---

## Local development / Desarrollo local

### 1) Backend (FastAPI)

Requirements: Python 3.11+ and Postgres (Docker or local).

1. Create env file:

```bash
cd backend
copy .env.example .env
```

2. Install deps:

```bash
python -m venv backend\.venv
backend\.venv\Scripts\activate
pip install -r backend\requirements.txt
```

3. Run migrations:

```bash
alembic upgrade head
```

4. Run API:

```bash
uvicorn app.main:app --reload --port 8000
```

API:
- `http://localhost:8000/health`
- `http://localhost:8000/docs`

### Quick smoke test (after login)

- `GET /catalog/charts`
- `GET /catalog/search?q=daft&type=track&provider=deezer`
- `GET /me/favorites`
- Playlists: create → add item `{"ref":"deezer:<id>","type":"track"}`

### 2) Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Web:
- `http://localhost:5173`

> Set `VITE_API_BASE_URL` in `frontend/.env` if needed.

### Real providers setup / Configuración de proveedores reales

Set these env vars in `backend/.env` (and on your deploy host):

- `DEEZER_BASE_URL` (default: `https://api.deezer.com`)

Optional (Spotify metadata only):

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

---

## Render deployment / Deploy en Render

This repo ships with `render.yaml`.

**EN**: Create a new Render “Blueprint” from this repo. Render will create:
- Postgres database
- API Web Service (FastAPI)
- Static Site (React build)

**ES**: Creá un “Blueprint” en Render desde este repo. Render crea:
- Base Postgres
- Web Service para API (FastAPI)
- Static Site para React

Environment variables you must set (Render):
- `JWT_SECRET`
- `CORS_ORIGINS`
- `SPOTIFY_CLIENT_ID` (optional but recommended)
- `SPOTIFY_CLIENT_SECRET` (optional but recommended)

### Deezer‑first deploy (Vercel + Render/Railway)

**Backend (Render o Railway)**

- **Env mínimas**:
  - `DATABASE_URL` (Postgres)
  - `JWT_SECRET` (>= 32 chars)
  - `CORS_ORIGINS` (ej: `https://<tu-vercel-app>.vercel.app`)
  - `DEEZER_BASE_URL` (opcional, default `https://api.deezer.com`)
- **Start command**:

```bash
python -m alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Frontend (Vercel)**

- Importá `frontend/` como proyecto.
- **Build**: `npm run build`
- **Output**: `dist`
- **Env**:
  - `VITE_API_BASE_URL` = URL pública del backend (Render/Railway)

**Migraciones**

- En Render/Railway, se corren al boot via start command (alembic).

---

## Security / Seguridad

- No secrets committed. Use `.env` locally and Render env vars in production.
- Passwords are hashed with `bcrypt`.

