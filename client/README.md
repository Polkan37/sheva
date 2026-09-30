# Sheva dashboard

React dashboard for the local-first home environment monitoring system.

## Run locally

```bash
npm install
npm run dev
```

During development, Vite forwards `/api` requests to the LAN backend. To use another API origin (with CORS enabled), create `.env.local`:


## Source layout

- `src/app` — application entry point;
- `src/pages` — composed screens;
- `src/features` — devices, measurements, device status, and floor plan;
- `src/shared` — API client, formatting helpers, and reusable UI.

The floor-plan layout is intentionally isolated in `features/floor-plan/plan.config.ts`; replace it with server data once rooms and plan geometry become configurable.
