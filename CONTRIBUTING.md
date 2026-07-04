# Contributing to Sonoteca

Thanks for contributing. This repo is a monorepo (FastAPI backend + Vite/React frontend) deployed together on Vercel.

## Conventions

### Branch naming

Use short, descriptive branch names:

- `feat/<topic>` (new feature)
- `fix/<topic>` (bug fix)
- `chore/<topic>` (tooling, deps, refactors)
- `docs/<topic>` (documentation only)

### Conventional Commits

We use **Conventional Commits**.

Examples:

- `feat(frontend): add playlist share UI`
- `fix(backend): normalize Neon SSL params`
- `chore(ci): run lint+tests on PRs`

Common scopes:

- `backend`, `frontend`, `ci`, `docker`, `docs`

## Local development

### Option A: Docker Compose (recommended)

Requirements: Docker Desktop.

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000` (health: `/health`, docs: `/docs`)
- Postgres: `localhost:5432`

Optional Redis:

```bash
docker compose --profile redis up --build
```

### Option B: Run services directly

Backend:

```bash
cd backend
cp .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm ci
cp .env.example .env
npm run dev
```

## Quality gates

### Backend

```bash
cd backend
python -m ruff check .
python -m ruff format --check .
python -m pytest -q
python -m mypy app
```

### Frontend

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

## Secrets

- Never commit `.env` files or credentials.
- Use `.env.example` as the template and set real values via local environment or Vercel environment variables.

