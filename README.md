# ZINGSA CORS Intelligence Lab

Operational web app for Zimbabwe's ZimCORS network: station health, RINEX archives, ionospheric monitoring, space weather, and observatory tools.

## Quick start

```bash
npm install
cp .env.example .env    # optional — NTRIP, telemetry, NASA key
npm run dev             # http://localhost:5174
```

The Vite dev server includes a mock API (`mock-api.mjs`) for all `/api/*` routes defined in `lib/corsApiConfig.js`.

## Routes

| Path | Page |
|------|------|
| `/` | Operations dashboard |
| `/cors` | National CORS Services (map, NTRIP, RINEX analysis) |
| `/alerts` | CORS Alert System |
| `/alerts?tab=data-centre` | RINEX Data Centre |
| `/weather` | Space Weather (NOAA + NASA DONKI) |
| `/ionosphere` | Ionospheric Conditions (24 ZimCORS stations) |
| `/observatory` | Mazowe Observatory hub (Stellarium, telescope sim, night sky — Open-Meteo sky state) |

## RINEX index & scans

Archive health is driven by `data/cors-index.json`, built from local Spider and TEC folders.

```bash
# Scan only (no ingest)
npm run cors:scan-gnss    # Leica Spider GNSS-Data/APPS
npm run cors:scan         # TEC Analysis archives

# Scan + update index
npm run cors:ingest-gnss
npm run cors:ingest
```

Override data paths with `ZINGSA_CORS_DATA_ROOT` (semicolon-separated) in `.env` or the shell. Defaults are in `lib/corsApiConfig.js`.

## Environment variables

Copy `.env.example` to `.env`:

| Variable | Purpose |
|----------|---------|
| `VITE_ZIMCORS_NTRIP_*` | NTRIP host, port, mount pattern (National CORS → Service Access) |
| `ZINGSA_HEALTH_TELEMETRY_URL` | Live receiver telemetry JSON for station-health API |
| `ZINGSA_HEALTH_TELEMETRY_SAMPLE=1` | Blend sample telemetry in dev (`data/zimcors-telemetry-sample.json`) |
| `ZINGSA_CORS_DATA_ROOT` | Custom RINEX source paths |
| `VITE_NASA_API_KEY` | NASA DONKI (Space Weather solar panels) |

## Production build

```bash
npm run build
npm run preview
```

Deploy `dist/` with serverless handlers under `api/` (see `vercel.json`).

## Observatory modes

| Component | Data source |
|-----------|-------------|
| Stellarium map | Stellarium Web embed + Open-Meteo sky state |
| Telescope simulator | Local southern-sky catalog (`mode: simulated`) |
| Night sky viewer | Local bright-star ephemeris (`mode: local-ephemeris`) |

## Station deep links

Cross-page navigation preserves the selected station where supported:

| URL | Opens |
|-----|--------|
| `/cors?station=HARA&app=cors-health` | National CORS for Harare |
| `/alerts?tab=stations&station=HARA` | CORS Alerts — Stations tab, highlighted row |
| `/alerts?tab=alerts&station=HARA` | CORS Alerts — Alert Management, highlighted row |
| `/ionosphere?station=HARA` | Ionosphere monitor for Harare |
| `/weather?region=southern` | Space Weather — Southern Africa sector |

## Shared health snapshot

`OpsHealthProvider` (in `App.jsx`) polls `GET /api/gnss/station-health` every 5 minutes for the Dashboard, top-nav attention badge, CORS Alerts, and Ionosphere CORS health panels — one request instead of per-page duplicates.

## Data honesty

- **Live mode** (National CORS): NOAA Kp + station-health API; persisted in `localStorage` (`zingsa-cors-live-mode`).
- **Demo mode**: RINEX archive analysis for selected date/time.
- **CORS Alerts**: API-driven by default; enable **Demo scenarios** for training overlays only.
- Charts labeled *illustrative* or *model* are not live telemetry time-series.

## Stack

React 19 · Vite 6 · React Router 7 · Leaflet · Lucide
