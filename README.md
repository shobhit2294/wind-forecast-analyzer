# wind-forecast-analyzer

Northstar | Wind Forecast Desk

A React and FastAPI pilot dashboard for reviewing UK national wind generation forecasts and measuring their accuracy against Elexon actuals for January 2026.

> Scope note: This prototype uses only Elexon's national wind datasets. It does not have consumer demand, portfolio positions, prices, or thermal availability, so it cannot calculate a complete procurement requirement. The forecast cutoff is an explicit pilot assumption and should be confirmed with the trading desk before operational use.

## What it does

- Select a January 2026 delivery date and a day-ahead decision cutoff (default: 10:00 UTC on the preceding day, matching the UK EPEX SPOT / Nord Pool auction preparation window).
- Supports delivery dates from 2026-01-01 through 2026-02-01 (covering all purchase decisions made in January 2026, through 2026-01-31).
- For each delivery interval, select the latest WINDFOR forecast published at or before that cutoff (guaranteeing zero lookahead bias).
- Match forecast intervals to FUELHH actuals by `startTime`.
- Report matched-interval count, MAE, RMSE, and signed bias; plot forecast and actual generation in MW.
- Export the selected day's matched intervals as CSV.

Metrics are calculated only for pairs with both an actual and a qualifying forecast. Bias is `forecast - actual`; positive bias indicates over-forecasting. No MAPE is shown because it becomes misleading or undefined for zero/very low generation.

## Files and directories

| Path | Purpose |
|---|---|
| `vercel.json` | Vercel deployment manifest: builds frontend and routes `/api` to Python serverless function. |
| `api/index.py` | Vercel serverless entrypoint importing the FastAPI application. |
| `requirements.txt` | Root Python dependencies for Vercel deployment (`fastapi`, `uvicorn`, `httpx`). |
| `frontend/src/App.jsx` | Dashboard state, API request, and the page-level component layout. |
| `frontend/src/components/` | One file per visible dashboard section: header, controls, error notice, metric cards, chart, trading insight, interval table, and footer. |
| `frontend/src/utils/formatters.js` | Shared number, time, and request-error formatting helpers. |
| `frontend/src/utils/exportCsv.js` | Creates and downloads the interval CSV file. |
| `frontend/src/styles.css` | Shared dashboard styles and responsive layouts for all components. |
| `frontend/src/main.jsx` | React application entry point. |
| `frontend/nginx.conf.template` | Proxies browser API requests to the configured backend service URL. |
| `frontend/` | Vite configuration, dependencies, and frontend Docker build. |
| `backend/app/main.py` | FastAPI routes, Elexon retrieval, in-memory caching, forecast selection, and error scoring. |
| `backend/tests/test_analysis.py` | Unit tests for forecast selection, metrics, Elexon request windows, caching, and date validation. |
| `Dockerfile` | Builds the combined production container image. |
| `.dockerignore` | Excludes local dependencies, builds, and secrets from the combined image. |
| `docker-compose.yml` | Starts separate frontend and backend containers for local development. |
| `backend/Dockerfile`, `frontend/Dockerfile` | Build frontend and backend separately for Compose or multi-service hosting. |
| `.env.example` | Example Elexon URL, frontend proxy URL, and local host ports. |

### Frontend component guide

- `DashboardHeader.jsx` — brand, pilot status, and page title.
- `DecisionControls.jsx` — delivery date, day-ahead cutoff (with clear D-1 decision date indicator), and scope note.
- `ForecastSummary.jsx` and `MetricCard.jsx` — data coverage and accuracy metrics.
- `ForecastChartPanel.jsx` and `WindChart.jsx` — chart heading, legend, and SVG plot.
- `InsightsPanel.jsx` — signed-bias trading context.
- `IntervalTable.jsx` — per-interval values and CSV export button.
- `ErrorBanner.jsx` — visible API error message.
- `PageFooter.jsx` — dashboard footer.

## Free Deployment on Vercel

The application is configured for free 1-click deployment on [Vercel](https://vercel.com):

1. Log in to [vercel.com](https://vercel.com) using your GitHub account.
2. Click **Add New...** → **Project**.
3. Import the `wind-forecast-analyzer` repository.
4. Keep the default settings (Vercel automatically detects `vercel.json` for both the Vite React build and Python API routes).
5. Click **Deploy**.
6. Once deployed, Vercel gives you a public `https://your-project.vercel.app` URL with both the frontend dashboard and `/api/analysis` live.

## Start the application locally

### Docker (recommended)

From the repository root:

```powershell
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). The backend service root explains its routes; the API health check is at [http://localhost:8000/api/health](http://localhost:8000/api/health), and interactive API documentation is at [http://localhost:8000/docs](http://localhost:8000/docs).

If a host port is already in use, copy `.env.example` to `.env` and change `BACKEND_HOST_PORT` or `FRONTEND_HOST_PORT`. For example, setting them to `18000` and `18080` makes the app available at [http://localhost:18080](http://localhost:18080), with backend health at [http://localhost:18000/api/health](http://localhost:18000/api/health). These host port settings do not change the internal `8000` backend and `80` frontend ports used between containers.

### Local development

Backend, in one terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend, in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal. The development server proxies `/api` requests to `http://localhost:8000`.

### Tests

```powershell
cd backend
python -m unittest discover -s tests -v
```

All 9 unit tests verify:
- Latest forecast vintage selection prior to cutoff
- Zero lookahead bias
- MAE, RMSE, and Signed Bias calculations
- Handling of null/empty matches
- Elexon 7-day API chunking
- January decision boundary enforcement (including Feb 1 for Jan 31 decisions)
- In-memory dataset caching

## Data sources and interpretation

- Actual generation: [Elexon FUELHH](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream), filtered to `fuelType=WIND`.
- Forecast generation: [Elexon WINDFOR](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream).
- API host: `https://data.elexon.co.uk/bmrs/api/v1/datasets`.
- The backend requests FUELHH actuals published on the selected delivery date and WINDFOR forecasts published in a rolling window up through the decision cutoff. Queries are cached in memory for sub-100ms response times on repeat requests.
- Live checks for January 2026 return 48 FUELHH half-hour actual intervals and 24 WINDFOR forecast intervals per day. This matches the UK market structure where the Day-Ahead Auction trades 24 hourly products, while settlement periods are half-hourly.
- Forecast and actual values are paired on exact `startTime` matches (24 matched intervals). Unmatched half-hours are preserved and highlighted in the ledger as coverage indicators.
- All displayed times are UTC.

## Architecture and review notes

The browser calls a same-origin `/api` route. On Vercel, requests to `/api/*` are handled by Python serverless functions via `api/index.py`, while frontend assets are served from `frontend/dist`. FastAPI fetches only the two Elexon datasets, validates and filters records, chooses a qualifying forecast vintage per interval, and computes metrics. The React layer renders the response and does not calculate alternate metrics.

AI tools were used to assist with creating this prototype. The code and data interpretation should be reviewed and validated before operational use.

## Deployment and submission

- **Live Application**: [https://wind-forecast-analyzer-tuu4.vercel.app](https://wind-forecast-analyzer-tuu4.vercel.app)
- **API Health Check**: [https://wind-forecast-analyzer-tuu4.vercel.app/api/health](https://wind-forecast-analyzer-tuu4.vercel.app/api/health)
- **Repository**: [https://github.com/shobhit2294/wind-forecast-analyzer](https://github.com/shobhit2294/wind-forecast-analyzer)

1. Verify `/api/health` and the dashboard in a private browser window.
2. Record a video of no more than 10 minutes: a client walkthrough (up to 5 minutes), followed by an internal technical walkthrough (up to 5 minutes).
3. Open every submitted URL in a private/incognito browser window and verify access.
4. Submit the repository, deployed app, and video links in the provided form.
