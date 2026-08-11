# Equilibrium Frontend

React + Vite frontend for the Equilibrium portfolio dashboard.

## Local development

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Example `.env`:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

## Production deployment (Vercel)

1. Import the `client` folder into Vercel.
2. Set the environment variable:
   - `VITE_API_BASE_URL=https://equilibrium-x5b4.onrender.com/api/v1`
3. Build command:
   - `npm run build`
4. Output directory:
   - `dist`

`client/vercel.json` rewrites all routes to `index.html`, so SPA deep links (e.g. `/dashboard`, `/rebalance`) work when a page is refreshed.

## Notes

- Do not commit `.env` files.
- The frontend should talk to the Render backend URL only.
- Keep all secrets in Vercel environment variables, not in code or Git.
