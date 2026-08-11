# Equilibrium Backend

Spring Boot backend for the Equilibrium portfolio dashboard.

## Local development

```bash
cd server
cp .env.example .env
./mvnw spring-boot:run
```

Example `.env`:

```env
DB_URL=jdbc:postgresql://<host>:5432/<database>?sslmode=require
DB_USERNAME=<db-user>
DB_PASSWORD=<db-password>
JWT_SECRET=<random-long-secret>
PORT=8080
CORS_ORIGINS=http://localhost:5173,http://localhost:8443,https://equilibrium-umber.vercel.app
```

## Production deployment (Render / Docker)

The repo-level `render.yaml` deploys this folder as a Docker web service (`rootDir: server`, runtime `docker`, health check on `/api/v1/health`). The `server/Dockerfile` is a production-only multi-stage build (Temurin 21, non-root user). No environment values are baked into the image — supply them at runtime:

1. Push the repo to GitHub/GitLab.
2. In Render: **New → Blueprint** → connect the repo.
3. Fill in the env vars in the dashboard (blueprint declares them with `sync: false`):
   - `DB_URL`
   - `DB_USERNAME`
   - `DB_PASSWORD`
   - `JWT_SECRET` (required — no default; the app refuses to start without a secret >= 32 bytes)
   - `CORS_ORIGINS` (must include the Vercel frontend origin)
   - `PRICE_SOURCE` (optional, default `fixture`)
   - `PORT` is injected by Render automatically.

For manual deploys, set **Root Directory = `server`** and **Health Check Path = `/api/v1/health`**.

Local Docker build/run: `docker build -t equilibrium-server .` then `docker run -p 8080:8080 --env-file .env equilibrium-server`.

`GET /api/v1/health` is public (permit-all) and returns `200`/`503` based on a DB `SELECT 1`; the container `HEALTHCHECK` and Render's health check both use it.

## Important

- Never commit `.env` files; keep real secrets out of committed files (`run-local.ps1` loads `server/.env` instead of hardcoding values).
- `server/.env.example` contains placeholders only.
- Rotate any secret that was ever committed; production secrets live in platform environment variables only.
- The backend must allow the Vercel frontend origin in `CORS_ORIGINS`.
