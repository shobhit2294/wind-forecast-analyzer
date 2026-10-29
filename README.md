# UK Wind Forecast Analyzer

A pilot web app built for UK energy trading desks to evaluate day-ahead wind forecasts against actual generation from Elexon BMRS for January 2026.

- **Live Demo**: [https://wind-forecast-analyzer-tuu4.vercel.app](https://wind-forecast-analyzer-tuu4.vercel.app)
- **API Health**: [https://wind-forecast-analyzer-tuu4.vercel.app/api/health](https://wind-forecast-analyzer-tuu4.vercel.app/api/health)

---

## What this does

In the UK electricity market, suppliers buy power on the day-ahead wholesale market to cover whatever consumer demand isn't met by wind and other renewables. The main day-ahead auctions close around 11:00 UTC, so traders have to lock in purchase volumes on the morning before the delivery day.

Because wind generation is weather-dependent, buying decisions rely heavily on whatever forecasts are available that morning. Over-forecasting wind means you under-buy day-ahead and face expensive balancing cashout penalties; under-forecasting means you over-buy and have to dump surplus power at a discount.

This app lets trading teams:
- **Replay what was knowable**: Select any delivery day in January 2026 and set a decision cutoff (default: 10:00 UTC on D-1). The app pulls the latest forecast published *before* that cutoff—no future data leaks in.
- **Quantify the error**: Calculates Mean Absolute Error (MAE), Root Mean Square Error (RMSE), and signed Forecast Bias (Forecast minus Actual in MW) to see whether the forecast was running hot or cold.
- **Inspect and export intervals**: View an hourly chart and interval ledger, and download the reconciled day's data as CSV.

---

## Project Structure

```text
├── api/
│   └── index.py            # Vercel serverless entry point (FastAPI)
├── backend/
│   ├── app/
│   │   └── main.py         # FastAPI routes, Elexon fetching, caching & metrics
│   └── tests/
│       └── test_analysis.py # Unit tests
├── frontend/
│   ├── src/
│   │   ├── components/     # UI components (controls, metrics, SVG chart, table)
│   │   ├── utils/          # Formatting & CSV export helpers
│   │   ├── App.jsx         # Main dashboard view
│   │   └── styles.css      # Custom dashboard styles
│   ├── package.json
│   └── vite.config.js
├── Dockerfile              # Production multi-stage build (Node + Python)
├── docker-compose.yml      # Local dev setup
└── vercel.json             # Vercel deployment config
```

---

## Quick Start

### Option 1: Docker (Easiest)

From the project root:

```bash
docker compose up --build
```

- Web App: [http://localhost:8080](http://localhost:8080)
- Backend API: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

*(If port 8000 or 8080 is taken on your machine, copy `.env.example` to `.env` and set `BACKEND_HOST_PORT` or `FRONTEND_HOST_PORT` to something like 18000 / 18080).*

---

### Option 2: Running Locally

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs at `http://localhost:5173` and automatically proxies `/api` calls to `http://localhost:8000`.

---

## Tests

To run the unit test suite:

```bash
cd backend
python -m unittest discover -s tests -v
```

The tests cover:
- Correct vintage selection before cutoff (ensuring no lookahead bias)
- Metric calculations (MAE, RMSE, signed bias)
- Handling empty / unmatched intervals
- Elexon 7-day query batching
- In-memory dataset caching

---

## About the Data & Resolutions

- **Actuals (`FUELHH`)**: Pulled from Elexon's `FUELHH` stream filtered by `fuelType == "WIND"`. Actuals arrive in 30-minute settlement periods (48 intervals/day).
- **Forecasts (`WINDFOR`)**: Pulled from Elexon's `WINDFOR` stream. The day-ahead forecast is published on an hourly basis (24 intervals/day), which directly matches the UK Day-Ahead hourly auction contracts.
- **Matching**: We match records on exact `startTime`. This gives 24 cleanly matched hourly pairs. Rather than inventing numbers through linear interpolation for the :30 half-hours, we keep the actuals in the ledger marked as unmatched so traders have an honest picture of data coverage.
- **Dates**: Supports purchase decisions made throughout January 2026 (including 1 February 2026 delivery for decisions made on 31 January).

---

## AI Disclosure

I used AI tools (Claude / ChatGPT) to help with boilerplate setup, CSS styling, and initial test drafting. All Elexon API integrations, business logic, and error calculations were verified and tested manually against live data.
