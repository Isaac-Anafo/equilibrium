# Deployment Guide

This guide walks through deploying Equilibrium end to end:

- **Backend** (Spring Boot API) → **Render** (Docker web service)
- **Frontend** (React + Vite) → **Vercel**
- **Database** → Neon Postgres (already provisioned)

The repo already contains the deploy wiring: `render.yaml` (Render blueprint), `server/Dockerfile` (production image), `client/vercel.json` (SPA rewrites). This document is about filling in the platform-specific settings and env vars.

---

## 1. Prerequisites

- Git installed locally
- A GitHub (or GitLab) account
- A [Render](https://render.com) account
- A [Vercel](https://vercel.com) account
- A Neon Postgres database (connection details ready: host, database name, username, password)

> The repo is not a git repo yet — step 3 covers that.

---

## 2. Secret hygiene checklist

Read this before doing anything else:

- **Never commit** `.env` files or real credentials. The repo `.gitignore` already excludes `client/.env` and `server/.env`; only `.env.example` files (placeholders) are committed.
- **Rotate the JWT secret.** The previous `JWT_SECRET` was committed to the repo, so treat it as compromised. Generate a fresh one for production.
- No environment values are baked into the Docker image — every secret is injected at runtime by the platform.

### Generate a fresh JWT secret

The secret must be **at least 32 bytes** (the app refuses to start otherwise). Use one of:

PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

or OpenSSL:

```bash
openssl rand -base64 48
```

Save the output — you'll paste it into Render in step 4.

---

## 3. Initialize git and push

The folder is not a git repo yet, and both Render and Vercel deploy from a repository.

```bash
cd "Fintech Dashboard Design"
git init
git add .
git commit -m "Initial commit"
```

Create a new repository on GitHub (empty, no README), then:

```bash
git remote add origin https://github.com/<your-user>/<repo>.git
git branch -M main
git push -u origin main
```

Before pushing, sanity-check that no secrets are staged:

```bash
git ls-files | findstr /i "env"
```

Only `.env.example` files should appear (plus `run-local.ps1` and configs that no longer contain real values).

---

## 4. Deploy the backend to Render

### 4.1 Create the service

**Option A — Blueprint (recommended).** The repo includes `render.yaml`:

1. In Render: **New → Blueprint**.
2. Connect your GitHub repo. Render reads `render.yaml`, deploys the `server/` folder as a Docker web service, and sets the health check path to `/api/v1/health` automatically.

**Option B — Manual.** Create a **New Web Service**, connect the repo, and in the settings set:

- **Root Directory:** `server` (the `Dockerfile` lives here)
- **Runtime:** Docker
- **Health Check Path:** `/api/v1/health`

### 4.2 Environment variables

Render injects `PORT` automatically. Add the rest in **Environment** under the service:

| Variable | Required | Value |
| --- | --- | --- |
| `DB_URL` | yes | `jdbc:postgresql://<host>:5432/neondb?sslmode=require` |
| `DB_USERNAME` | yes | Neon database user (e.g. `neondb_owner`) |
| `DB_PASSWORD` | yes | Neon database password |
| `JWT_SECRET` | yes | The fresh secret you generated in step 2 (≥ 32 bytes) |
| `CORS_ORIGINS` | yes | `https://equilibrium-umber.vercel.app` — add the Vercel frontend domain; add `http://localhost:5173,http://localhost:8443` too if you want to test against production locally |
| `PRICE_SOURCE` | no | `fixture` (default). Leave unset unless you have a real price feed |

> In the blueprint, these are declared with `sync: false`, which means Render creates them blank and **you fill in the values in the dashboard** — no secrets live in `render.yaml`.

### 4.3 Deploy & first boot

- Trigger **Manual Deploy** or wait for auto-deploy.
- First boot does the heavy lifting:
  - Flyway runs migrations `V1`–`V5` automatically. This works whether you point at the existing Neon database or a fresh empty one.
  - The app starts on Render's `PORT`, then becomes healthy once the DB `SELECT 1` succeeds.
- **Free tier:** the service sleeps after ~15 min of no traffic. Cold starts take ~50–60 s, so the first request after idle may be slow.
- Note: the container's `HEALTHCHECK` is used by Docker; Render uses its own health-check path setting instead.

### 4.4 Copy the backend URL

After deploy you get a URL like `https://equilibrium-x5b4.onrender.com`. You'll use it in the frontend step.

---

## 5. Deploy the frontend to Vercel

1. In Vercel: **Add New → Project**, import your GitHub repo.
2. **Root Directory:** set to `client` (Vercel auto-detects it as a Vite project).
3. **Framework Preset:** Vite.
4. Set the environment variable (in **Settings → Environment Variables**):

   | Variable | Value |
   | --- | --- |
   | `VITE_API_BASE_URL` | `https://equilibrium-x5b4.onrender.com/api/v1` |

   > `VITE_` vars are inlined at **build time**, so set it before the first build. If it's missing, the client falls back to `http://localhost:8081/api/v1`, which won't work in production.
5. **Build Command:** `npm run build`
6. **Output Directory:** `dist`

`client/vercel.json` rewrites every route to `index.html`, so deep links like `/dashboard` or `/rebalance` don't 404 on refresh. No `/api` proxy is needed — the client calls the Render URL directly.

---

## 6. CORS wiring

The backend only accepts requests from origins listed in `CORS_ORIGINS`. After the frontend deploys, confirm:

- `CORS_ORIGINS` on Render includes `https://equilibrium-umber.vercel.app` (exactly, no trailing slash).

If you get CORS errors in the browser console, this is the first thing to check.

---

## 7. Post-deploy verification

Run these once the backend is live:

1. **Health check** — should return `200`:

   ```bash
   curl https://equilibrium-x5b4.onrender.com/api/v1/health
   # {"status":"UP","database":"UP"}
   ```

2. **API docs** — open `https://equilibrium-x5b4.onrender.com/swagger-ui.html` (public).

3. **Create an account** — sign up via the public endpoint:

   ```bash
   curl -X POST https://equilibrium-x5b4.onrender.com/api/v1/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"you@example.com","password":"a-strong-password-123","displayName":"You"}'
   ```

   > The seeded `demo@equilibrium.app` account **cannot log in in production** — its password hash is only set by the dev profile (`DemoDataSeeder`). Use your own signup.

4. **Frontend smoke test** — open the Vercel URL, sign in, and load the Dashboard. A brand-new account has no portfolio, so you'll see the onboarding state; the seeded demo portfolio belongs to the dev-only demo user.

---

## 8. Updating and tearing down

**Updates**

- Every push to `main` auto-deploys: Render (blueprint has `autoDeploy: true`) and Vercel.
- After changing backend env vars, trigger **Manual Deploy** (Render doesn't auto-restart on env changes).

**Teardown**

- Render: **Settings → Danger Zone → Delete Service**.
- Vercel: **Settings → Danger Zone → Delete Project**.
- Delete the Neon database or deactivate its connection from the Render env vars.

---

## Env var reference (quick)

**Backend — Render**

| Variable | Required | Notes |
| --- | --- | --- |
| `DB_URL` | yes | JDBC URL, `sslmode=require` for Neon |
| `DB_USERNAME` | yes | Neon user |
| `DB_PASSWORD` | yes | Neon password |
| `JWT_SECRET` | yes | ≥ 32 bytes; no default — boot fails without it |
| `CORS_ORIGINS` | yes | Comma-separated allowed origins (Vercel domain) |
| `PORT` | auto | Injected by Render |
| `PRICE_SOURCE` | no | Default `fixture` |

**Frontend — Vercel**

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_API_BASE_URL` | yes | `https://equilibrium-x5b4.onrender.com/api/v1`, inlined at build time |
