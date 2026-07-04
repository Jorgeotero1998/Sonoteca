# Sonoteca — Music Library (FastAPI + React)

**EN**: Sonoteca is a portfolio‑ready music library to manage **songs**, build **playlists**, search/filter your catalog, and view **stats**. Built as a fullstack monorepo with **FastAPI** + **PostgreSQL** + **Alembic** + **JWT auth (RBAC)** and a **React (Vite)** frontend. Designed to be deployed on **Render** (API + Postgres + Static Site).

**ES**: Sonoteca es una biblioteca musical lista para portfolio para gestionar **canciones**, armar **playlists**, buscar/filtrar tu catálogo y ver **estadísticas**. Hecha como monorepo fullstack con **FastAPI** + **PostgreSQL** + **Alembic** + **auth JWT (RBAC)** y frontend **React (Vite)**. Pensada para deploy en **Render** (API + Postgres + Static Site).

---

## Features / Funcionalidades

- **Auth JWT + RBAC** (roles: `owner`, `editor`, `viewer`)
- **Songs**: CRUD + search + filters (artist, album, genre, bpm range, key, tags)
- **Playlists**: CRUD + add/remove songs + **reorder**
- **Public share link** for playlists (read‑only)
- **Stats**: total songs, total playlists, duration totals, top genres/artists
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

### 2) Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Web:
- `http://localhost:5173`

> Set `VITE_API_BASE_URL` in `frontend/.env` if needed.

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

---

## Security / Seguridad

- No secrets committed. Use `.env` locally and Render env vars in production.
- Passwords are hashed with `bcrypt`.

