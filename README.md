# wind-forecast-analyzer

Northstar | Wind Forecast Desk

A React and FastAPI pilot dashboard for reviewing UK national wind generation forecasts and measuring their accuracy against Elexon actuals for January 2026.

> Scope note: This prototype uses only Elexon's national wind datasets. It does not have consumer demand, portfolio positions, prices, or thermal availability, so it cannot calculate a complete procurement requirement. The forecast cutoff is an explicit pilot assumption and should be confirmed with the trading desk before operational use.

## What it does

- Select a January 2026 delivery date and a day-ahead decision cutoff (default: 10:00 UTC on the preceding day).
- For each delivery interval, select the latest WINDFOR forecast published at or before that cutoff.
- Match forecast intervals to FUELHH actuals by `startTime`.
- Report matched-interval count, MAE, RMSE, and signed bias; plot forecast and actual generation in MW.
- Export the selected day's matched intervals as CSV.

Metrics are calculated only for pairs with both an actual and a qualifying forecast. Bias is `forecast - actual`; positive bias indicates over-forecasting. No MAPE is shown because it becomes misleading or undefined for zero/very low generation.

## Files and directories

| Path | Purpose |
|---|---|
| `frontend/src/App.jsx` | Dashboard state, API request, and the page-level component layout. |
| `frontend/src/components/` | One file per visible dashboard section: header, controls, error notice, metric cards, chart, trading insight, interval table, and footer. |
| `frontend/src/utils/formatters.js` | Shared number, time, and request-error formatting helpers. |
| `frontend/src/utils/exportCsv.js` | Creates and downloads the interval CSV file. |
| `frontend/src/styles.css` | Shared dashboard styles and responsive layouts for all components. |
| `frontend/src/main.jsx` | React application entry point. |
| `frontend/nginx.conf.template` | Proxies browser API requests to the configured backend service URL. |
| `frontend/` | Vite configuration, dependencies, and frontend Docker build. |
| `backend/app/main.py` | FastAPI routes, Elexon retrieval, forecast selection, and error scoring. |
| `backend/tests/test_analysis.py` | Tests for forecast selection, metrics, and Elexon request windows. |
| `docker-compose.yml` | Starts the backend API and production frontend. |
| `Dockerfile` files | Build the frontend and backend containers. |
| `.env.example` | Optional Elexon API base URL configuration. |

### Frontend component guide

- `DashboardHeader.jsx` — brand, pilot status, and page title.
- `DecisionControls.jsx` — delivery date, day-ahead cutoff, and scope note.
- `ForecastSummary.jsx` and `MetricCard.jsx` — data coverage and accuracy metrics.
- `ForecastChartPanel.jsx` and `WindChart.jsx` — chart heading, legend, and SVG plot.
- `InsightsPanel.jsx` — signed-bias trading context.
- `IntervalTable.jsx` — per-interval values and CSV export button.
- `ErrorBanner.jsx` — visible API error message.
- `PageFooter.jsx` — dashboard footer.

## Start the application

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

## Data sources and interpretation

- Actual generation: [Elexon FUELHH](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream), filtered to `fuelType=WIND`.
- Forecast generation: [Elexon WINDFOR](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream).
- API host: `https://data.elexon.co.uk/bmrs/api/v1/datasets`.
- The backend requests FUELHH actuals published on the selected delivery date and WINDFOR forecasts published from 31 December 2025 through the decision cutoff. Forecast history is split into Elexon's maximum seven-day request windows. It filters records locally to the selected `startTime` date and selects the latest forecast vintage separately for each delivery interval using `publishTime <= decision cutoff`.
- Live checks for 1, 15, and 31 January returned 48 FUELHH half-hour actual intervals and 24 WINDFOR forecast intervals per day. The sources therefore have different time resolutions in the retrieved data.
- Forecast and actual values are paired only on exact `startTime` matches. The 24 unmatched half-hour actual intervals in those checks are excluded from error metrics rather than interpolated or duplicated; the matched-interval count indicates coverage. Confirm with the client whether hourly forecast values should be applied to both associated half-hours before using the scores for operational decisions.
- All displayed times are UTC. Confirm market publication cadence, the business decision cutoff, and data revision policy with the client before using the analysis operationally.

If Elexon has no matching historical forecast vintage or the service is unavailable, the dashboard reports an error or missing match. It does not substitute synthetic or current forecast values for January history.

## Architecture and review notes

The browser calls a same-origin `/api` route. FastAPI fetches only the two Elexon datasets, validates and filters records, chooses a qualifying forecast vintage per interval, and computes metrics. The React layer renders the response and does not calculate alternate metrics. The Docker frontend serves a built static bundle with Nginx and proxies `/api` to the backend service.

### Connecting frontend and backend on Northflank

Deploy the backend and frontend as separate services from the same repository:

1. Deploy the backend with build context `/backend` and Dockerfile `/backend/Dockerfile`. Expose container port `8000` as HTTP and wait until the deployment is healthy.
2. Copy the backend's public HTTP(S) domain from the backend service's **Networking / Ports** settings. The public domain should open the API service root and show JSON links; check `/api/health` and confirm it returns `{"status":"ok"}`.
3. Deploy the frontend with build context `/frontend` and Dockerfile `/frontend/Dockerfile`. Expose container port `80` as HTTP.
4. In the frontend service's environment variables, set `BACKEND_URL` to the backend domain including `https://`, for example `https://your-backend-domain`. Do not add a path such as `/api` or a trailing slash.
5. Redeploy the frontend after setting the variable. Open the frontend's public URL; its same-origin `/api` requests will be proxied to the backend.

The local Docker Compose setup defaults `BACKEND_URL` to `http://backend:8000`, which uses the Compose service network. On Northflank, use the backend service's reachable domain instead of the local Compose hostname. If the frontend loads but shows a data error, first verify the backend's `/api/health` URL, then confirm `BACKEND_URL` is set on the frontend and redeploy it.

AI tools were used to assist with creating this prototype. The code and data interpretation should be reviewed and validated before operational use.

## Deployment and submission

Repository: [github.com/shobhit2294/wind-forecast-analyzer](https://github.com/shobhit2294/wind-forecast-analyzer).

The backend has been configured as a Northflank service, but its public URL previously returned a connection-refused error. Treat the hosted app as **not yet verified** until the backend `/api/health` endpoint responds with `{"status":"ok"}` and the frontend dashboard successfully loads data through it. The frontend service, working hosted app URL, and demo video still need to be completed or verified before final submission.

1. Make both Northflank services healthy and verify the frontend against the deployed backend.
2. Record a video of no more than 10 minutes: a client walkthrough (up to 5 minutes), followed by an internal technical walkthrough (up to 5 minutes).
3. Open every submitted URL in a private/incognito browser window and verify access.
4. Submit the repository, deployed app, and video links in the provided form.
