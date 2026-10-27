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
| `frontend/` | React/Vite dashboard, SVG visualization, styles, and Nginx production configuration. |
| `backend/app/` | FastAPI routes and Elexon retrieval, selection, and scoring logic. |
| `backend/tests/` | Unit tests for forecast-vintage selection and error calculations. |
| `docker-compose.yml` | Starts the backend API and production frontend. |
| `Dockerfile` files | Build the frontend and backend containers. |
| `.env.example` | Optional Elexon API base URL configuration. |

## Start the application

### Docker (recommended)

From the repository root:

```powershell
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). The API health check is at [http://localhost:8000/api/health](http://localhost:8000/api/health).

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

AI tools were used to assist with creating this prototype. The code and data interpretation should be reviewed and validated before operational use.

## Deployment and submission

No hosted deployment URL, public GitHub repository, or video has been created from this workspace. They require account access and actions outside the local project. Before submission:

1. Publish the repository under an anonymous name if required.
2. Deploy the Dockerized app to a host that supports the backend and frontend containers (for example, Heroku); add the hosted URL here.
3. Record a video of no more than 10 minutes: a client walkthrough (up to 5 minutes), followed by an internal technical walkthrough (up to 5 minutes).
4. Open every submitted URL in a private/incognito browser window and verify access.
5. Submit the repository, deployed app, and video links in the provided form.
