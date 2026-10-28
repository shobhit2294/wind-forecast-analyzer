from __future__ import annotations

import asyncio
import os
from datetime import date, datetime, time, timedelta, timezone
from math import sqrt
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

UTC = timezone.utc
ELEXON_API_BASE = os.getenv(
    "ELEXON_API_BASE", "https://data.elexon.co.uk/bmrs/api/v1/datasets"
).rstrip("/")
FRONTEND_DIST = Path(
    os.getenv("FRONTEND_DIST", str(Path(__file__).resolve().parents[2] / "static"))
)
FRONTEND_INDEX = FRONTEND_DIST / "index.html"

_DATASET_CACHE: dict[str, list[dict[str, Any]]] = {}

app = FastAPI(title="Northstar Wind Forecast API", version="1.0.0")
if (FRONTEND_DIST / "assets").is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="frontend-assets",
    )
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def parse_timestamp(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def records_from_payload(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict):
        payload = payload.get("data")
    if not isinstance(payload, list):
        raise ValueError("Unexpected Elexon response: expected a list of records.")
    return [record for record in payload if isinstance(record, dict)]


def select_forecast_vintages(
    forecast_records: list[dict[str, Any]],
    actual_records: list[dict[str, Any]],
    delivery_day: date,
    cutoff: datetime,
) -> list[dict[str, Any]]:
    actuals: dict[datetime, tuple[datetime, float]] = {}
    for record in actual_records:
        if record.get("fuelType") != "WIND":
            continue
        start = parse_timestamp(record.get("startTime"))
        published = parse_timestamp(record.get("publishTime"))
        generation = record.get("generation")
        if (
            start is not None
            and published is not None
            and start.date() == delivery_day
            and isinstance(generation, (int, float))
        ):
            current = actuals.get(start)
            if current is None or published > current[0]:
                actuals[start] = (published, float(generation))

    latest: dict[datetime, tuple[datetime, float]] = {}
    for record in forecast_records:
        start = parse_timestamp(record.get("startTime"))
        published = parse_timestamp(record.get("publishTime"))
        generation = record.get("generation")
        if (
            start is None
            or start.date() != delivery_day
            or published is None
            or published > cutoff
            or not isinstance(generation, (int, float))
        ):
            continue
        current = latest.get(start)
        if current is None or published > current[0]:
            latest[start] = (published, float(generation))

    intervals: list[dict[str, Any]] = []
    for start in sorted(actuals.keys() | latest.keys()):
        forecast = latest.get(start)
        actual = actuals.get(start)
        intervals.append(
            {
                "startTime": start.isoformat().replace("+00:00", "Z"),
                "actual": actual[1] if actual else None,
                "forecast": forecast[1] if forecast else None,
                "publishTime": (
                    forecast[0].isoformat().replace("+00:00", "Z")
                    if forecast
                    else None
                ),
                "error": forecast[1] - actual[1]
                if forecast is not None and actual is not None
                else None,
            }
        )
    return intervals


def calculate_metrics(intervals: list[dict[str, Any]]) -> dict[str, float | int | None]:
    pairs = [
        (item["forecast"], item["actual"])
        for item in intervals
        if item["forecast"] is not None and item["actual"] is not None
    ]
    if not pairs:
        return {"matchedIntervals": 0, "mae": None, "rmse": None, "bias": None}

    errors = [forecast - actual for forecast, actual in pairs]
    return {
        "matchedIntervals": len(pairs),
        "mae": sum(abs(error) for error in errors) / len(errors),
        "rmse": sqrt(sum(error * error for error in errors) / len(errors)),
        "bias": sum(errors) / len(errors),
    }


def build_publish_ranges(
    start: datetime, end: datetime, max_range: timedelta = timedelta(days=7)
) -> list[tuple[datetime, datetime]]:
    if start >= end:
        return [(start, end)]
    ranges: list[tuple[datetime, datetime]] = []
    current = start
    while current < end:
        range_end = min(current + max_range, end)
        ranges.append((current, range_end))
        current = range_end
    return ranges


async def fetch_dataset(
    client: httpx.AsyncClient,
    dataset: str,
    publish_from: datetime,
    publish_to: datetime,
) -> list[dict[str, Any]]:
    cache_key = f"{dataset}:{publish_from.isoformat()}:{publish_to.isoformat()}"
    if cache_key in _DATASET_CACHE:
        return _DATASET_CACHE[cache_key]

    try:
        response = await client.get(
            f"{ELEXON_API_BASE}/{dataset}",
            params={
                "PublishDateTimeFrom": publish_from.isoformat(),
                "PublishDateTimeTo": publish_to.isoformat(),
            },
        )
        response.raise_for_status()
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502,
            detail=f"Elexon {dataset} request failed: {error}",
        ) from error
    try:
        records = records_from_payload(response.json())
        _DATASET_CACHE[cache_key] = records
        return records
    except (ValueError, TypeError) as error:
        raise HTTPException(
            status_code=502, detail=f"Invalid Elexon {dataset} response: {error}"
        ) from error


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/", response_model=None)
async def root() -> dict[str, Any] | FileResponse:
    if FRONTEND_INDEX.is_file():
        return FileResponse(FRONTEND_INDEX)
    return {
        "service": "Northstar Wind Forecast API",
        "status": "ok",
        "health": "/api/health",
        "analysis": "/api/analysis?deliveryDate=2026-01-15&cutoffTime=10:00",
        "documentation": "/docs",
    }


@app.get("/api/analysis")
async def analysis(
    delivery_date: date = Query(alias="deliveryDate"),
    cutoff_time: time = Query(default=time(10), alias="cutoffTime"),
) -> dict[str, Any]:
    is_jan_delivery = delivery_date.year == 2026 and delivery_date.month == 1
    is_jan_decision_for_feb = delivery_date == date(2026, 2, 1)
    if not (is_jan_delivery or is_jan_decision_for_feb):
        raise HTTPException(
            status_code=422,
            detail="Delivery date must be in January 2026 (or 2026-02-01 for decisions made on 2026-01-31).",
        )
    if cutoff_time.tzinfo is not None:
        raise HTTPException(
            status_code=422, detail="cutoffTime must be a UTC time without an offset."
        )

    cutoff_day = delivery_date - timedelta(days=1)
    cutoff = datetime.combine(cutoff_day, cutoff_time, tzinfo=UTC)
    actual_publish_from = datetime.combine(delivery_date, time.min, tzinfo=UTC)
    actual_publish_to = actual_publish_from + timedelta(days=1, minutes=30)
    forecast_publish_from = max(datetime(2025, 12, 31, tzinfo=UTC), cutoff - timedelta(days=4))
    async with httpx.AsyncClient(timeout=30.0) as client:
        actuals, *forecast_batches = await asyncio.gather(
            fetch_dataset(client, "FUELHH", actual_publish_from, actual_publish_to),
            *(
                fetch_dataset(client, "WINDFOR", start, end)
                for start, end in build_publish_ranges(
                    forecast_publish_from, cutoff
                )
            ),
        )
    forecasts = [record for batch in forecast_batches for record in batch]

    intervals = select_forecast_vintages(forecasts, actuals, delivery_date, cutoff)
    metrics = calculate_metrics(intervals)
    if not intervals:
        raise HTTPException(
            status_code=404,
            detail="Elexon returned no records for the selected delivery date.",
        )
    return {
        "deliveryDate": delivery_date.isoformat(),
        "decisionCutoff": cutoff.isoformat().replace("+00:00", "Z"),
        "timezone": "UTC",
        "dataSources": ["Elexon FUELHH (WIND)", "Elexon WINDFOR"],
        "metrics": metrics,
        "intervals": intervals,
    }
