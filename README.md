# Equilibrium

Equilibrium is a fintech portfolio dashboard with a React + Vite frontend and a Spring Boot backend.

## Project structure

- client/ - Vite + React frontend
- server/ - Spring Boot backend API

## Frontend

### Local development

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Set your local frontend env in `.env`:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

### Production deployment (Vercel)

- Import the `client` folder as the app root in Vercel.
- Set environment variable:
  - `VITE_API_BASE_URL=https://equilibrium-x5b4.onrender.com/api/v1`
- Build command: `npm run build`
- Output directory: `dist`

## Backend

### Local development

```bash
cd server
cp .env.example .env
./mvnw spring-boot:run
```

Set your local backend env in `.env`:

```env
DB_URL=jdbc:postgresql://<host>:5432/<database>?sslmode=require
DB_USERNAME=<db-user>
DB_PASSWORD=<db-password>
JWT_SECRET=<random-long-secret>
PORT=8080
CORS_ORIGINS=http://localhost:5173,http://localhost:8443,https://equilibrium-umber.vercel.app
```

### Production deployment (Render / Docker)

The repo includes a `render.yaml` blueprint (`rootDir: server`, Docker runtime, health check on `/api/v1/health`) and a production-only `server/Dockerfile` (multi-stage Temurin 21 build, non-root user). No environment values are baked into the image.

Deploy steps:

1. Commit everything and push to GitHub/GitLab (the repo is not a git repo yet — Render deploys from one).
2. In Render: **New → Blueprint**, connect the repo. It reads `render.yaml`, deploys the `server` folder as a Docker web service, and sets the health check path to `/api/v1/health`.
3. Fill in the env vars in the Render dashboard (declared in the blueprint with `sync: false` so no secrets live in the repo):
   - `DB_URL`
   - `DB_USERNAME`
   - `DB_PASSWORD`
   - `JWT_SECRET` (required — no default; the app refuses to start without a secret >= 32 bytes)
   - `CORS_ORIGINS=https://equilibrium-umber.vercel.app`
   - `PRICE_SOURCE` (optional, default `fixture`)
   - `PORT` is injected by Render automatically.
4. For manual (non-blueprint) deploys, set **Root Directory = `server`** and **Health Check Path = `/api/v1/health`** in the service settings.

Docker local build/run: `docker build -t equilibrium-server ./server` then `docker run -p 8080:8080 --env-file .env equilibrium-server`.

Free-tier note: Render web services sleep after ~15 min idle; cold start is ~50–60 s.

## Important: what not to commit

Never commit real secrets or local `.env` files.

Keep these local only:
- `client/.env`
- `server/.env`

The repo includes `.env.example` files as safe templates.

## Deployment notes

- Frontend is stateless and should be deployed to Vercel. `client/vercel.json` rewrites all routes to `index.html` so SPA deep links (`/dashboard`, `/rebalance`, ...) work on refresh.
- Backend is the API layer and should be deployed to Render (via the production `server/Dockerfile` / `render.yaml`).
- The frontend must use the Render backend URL via `VITE_API_BASE_URL`.
- CORS on the backend must include the Vercel domain.

## Default local setup

- Frontend: `http://localhost:8443`
- Backend: `http://localhost:8080`
