# FurniHouse CRM

Furniture shop CRM with a React frontend and an Express API. Live data is stored in Neon PostgreSQL. Empty modules show empty states instead of fake business data.

The dashboard opens directly — there is no login page.

## Folders

- `frontend` — React, Vite, TypeScript, Tailwind CSS
- `backend` — Express, Prisma, Neon PostgreSQL
- `api` — Vercel serverless entry that serves the Express API

## Run locally

Create `backend/.env` from `backend/.env.example` with your Neon URLs.

```bash
cd backend
npm install
npx prisma db push
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Deploy

The GitHub repo deploys on Vercel. Set these project environment variables:

- `DATABASE_URL` — Neon pooled connection string
- `DIRECT_URL` — Neon direct connection string
