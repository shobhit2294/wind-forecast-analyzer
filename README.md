# UK Wind Forecast Analyzer

A web application built for UK energy trading desks to evaluate day-ahead wind generation forecasts against actual outturn from Elexon BMRS for January 2026.

**Live Application**: [https://wind-forecast-analyzer-tuu4.vercel.app](https://wind-forecast-analyzer-tuu4.vercel.app)  
**API Health**: [https://wind-forecast-analyzer-tuu4.vercel.app/api/health](https://wind-forecast-analyzer-tuu4.vercel.app/api/health)

---

## Overview

UK energy suppliers buying electricity on the wholesale day-ahead market must procure residual demand (total consumer demand minus available renewable generation). Because day-ahead auction order books close at 11:00 UTC on $D-1$, trading decisions rely heavily on wind generation forecasts available prior to gate closure.

This dashboard helps traders:
1. **Reconstruct the decision state**: For any delivery date in January 2026, view the latest wind forecast available at the day-ahead decision cutoff (default 10:00 UTC on $D-1$), eliminating lookahead bias.
2. **Quantify forecast error**: Measure Mean Absolute Error (MAE), Root Mean Square Error (RMSE), and signed Forecast Bias ($\text{Forecast} - \text{Actual}$) against Elexon outturn data.
3. **Inspect and export intervals**: Review interval-by-interval forecast vs actual values and export the reconciled ledger as CSV.

---

## Project Structure

| Path | Description |
| :--- | :--- |
| `frontend/` | React 18 frontend built with Vite and pure SVG charting (no heavy chart libraries). |
| `backend/app/main.py` | FastAPI application handling Elexon API retrieval, forecast vintage selection, in-memory caching, and error metrics. |
| `backend/tests/` | Unit test suite verifying vintage selection, cutoff boundaries, and metric calculations. |
| `api/index.py` | Serverless Python entrypoint for Vercel deployment. |
| `vercel.json` | Vercel routing configuration for the React SPA and Python serverless API. |
| `Dockerfile` | Multi-stage production container build (Vite frontend + FastAPI backend). |
| `docker-compose.yml` | Local development orchestration for frontend and backend containers. |

---

## How to Run

### 1. Using Docker (Recommended)

From the project root:

```bash
docker compose up --build
```

- Frontend: [http://localhost:8080](http://localhost:8080)
- Backend API: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

*(To change local host ports, copy `.env.example` to `.env` and set `BACKEND_HOST_PORT` or `FRONTEND_HOST_PORT`.)*

### 2. Local Development Without Docker

**Backend (Python 3.12):**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend (Node 20+):**
```bash
cd frontend
npm install
npm run dev
```

Open the local Vite URL (default: `http://localhost:5173`). Requests to `/api` are automatically proxied to the FastAPI server.

---

## Running Tests

Run the backend unit tests:

```bash
cd backend
python -m unittest discover -s tests -v
```

The 9 unit tests verify:
- Correct vintage selection before the cutoff timestamp.
- Strict enforcement of zero lookahead bias.
- Metric calculation formulas (MAE, RMSE, Bias).
- Handling of unmatched or missing intervals.
- 7-day query window partitioning for Elexon BMRS.
- In-memory dataset caching.

---

## Data & Methodology

- **Actual Generation**: [Elexon FUELHH](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream) filtered to `fuelType == "WIND"`. Data has half-hourly resolution (48 settlement periods/day).
- **Forecast Generation**: [Elexon WINDFOR](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream). Data has hourly resolution (24 points/day), matching the UK Day-Ahead hourly auction contracts.
- **Timestamp Matching**: Forecast and actual records are matched on exact UTC `startTime`. The 24 hourly points produce 24 matched pairs; the remaining half-hourly periods are retained in the ledger as coverage indicators without interpolation.
- **Decision Window**: Supports purchase decisions made throughout January 2026 (including 1 February 2026 delivery for the 31 January decision).

---

## AI Disclosure

AI development tools (Claude / ChatGPT / Gemini) were used to assist in drafting initial boilerplate, tests, and documentation for this prototype. All domain logic, calculations, and Elexon API integrations were verified against live data.
