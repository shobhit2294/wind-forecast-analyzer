import asyncio
import unittest
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi.responses import FileResponse

from app.main import (
    build_publish_ranges,
    calculate_metrics,
    root,
    select_forecast_vintages,
)

UTC = timezone.utc


class AnalysisTests(unittest.TestCase):
    def test_root_explains_available_service_routes(self):
        response = asyncio.run(root())

        self.assertEqual(response["status"], "ok")
        self.assertEqual(response["health"], "/api/health")
        self.assertEqual(response["documentation"], "/docs")

    def test_root_serves_react_entry_when_frontend_is_bundled(self):
        with TemporaryDirectory() as directory:
            index_file = Path(directory) / "index.html"
            index_file.write_text("<html></html>", encoding="utf-8")
            with patch("app.main.FRONTEND_INDEX", index_file):
                response = asyncio.run(root())

        self.assertIsInstance(response, FileResponse)
        self.assertEqual(response.path, index_file)

    def test_selects_latest_forecast_published_before_cutoff(self):
        actuals = [
            {
                "fuelType": "WIND",
                "startTime": "2026-01-15T00:00:00Z",
                "publishTime": "2026-01-15T00:30:00Z",
                "generation": 100,
            },
            {"fuelType": "CCGT", "startTime": "2026-01-15T00:00:00Z", "generation": 900},
            {
                "fuelType": "WIND",
                "startTime": "2026-01-15T00:00:00Z",
                "publishTime": "2026-01-15T01:00:00Z",
                "generation": 105,
            },
        ]
        forecasts = [
            {
                "startTime": "2026-01-15T00:00:00Z",
                "publishTime": "2026-01-14T08:00:00Z",
                "generation": 80,
            },
            {
                "startTime": "2026-01-15T00:00:00Z",
                "publishTime": "2026-01-14T09:30:00Z",
                "generation": 95,
            },
            {
                "startTime": "2026-01-15T00:00:00Z",
                "publishTime": "2026-01-14T10:01:00Z",
                "generation": 120,
            },
        ]

        result = select_forecast_vintages(
            forecasts,
            actuals,
            date(2026, 1, 15),
            datetime.combine(date(2026, 1, 14), time(10), tzinfo=UTC),
        )

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["forecast"], 95)
        self.assertEqual(result[0]["actual"], 105)
        self.assertEqual(result[0]["error"], -10)
        self.assertEqual(result[0]["publishTime"], "2026-01-14T09:30:00Z")

    def test_metrics_use_only_matched_pairs(self):
        metrics = calculate_metrics(
            [
                {"forecast": 110, "actual": 100},
                {"forecast": 80, "actual": 100},
                {"forecast": None, "actual": 90},
            ]
        )

        self.assertEqual(metrics["matchedIntervals"], 2)
        self.assertEqual(metrics["mae"], 15)
        self.assertEqual(metrics["rmse"], 15.811388300841896)
        self.assertEqual(metrics["bias"], -5)

    def test_empty_matches_return_null_metrics(self):
        self.assertEqual(
            calculate_metrics([{"forecast": None, "actual": 10}]),
            {"matchedIntervals": 0, "mae": None, "rmse": None, "bias": None},
        )

    def test_publish_ranges_respect_elexon_seven_day_limit(self):
        start = datetime(2025, 12, 31, tzinfo=UTC)
        end = datetime(2026, 1, 15, 10, tzinfo=UTC)

        ranges = build_publish_ranges(start, end)

        self.assertEqual(ranges[0][0], start)
        self.assertEqual(ranges[-1][1], end)
        self.assertTrue(
            all(
                range_end - range_start <= timedelta(days=7)
                for range_start, range_end in ranges
            )
        )
        self.assertTrue(
            all(left[1] == right[0] for left, right in zip(ranges, ranges[1:]))
        )

    def test_publish_ranges_include_a_zero_length_cutoff(self):
        cutoff = datetime(2025, 12, 31, tzinfo=UTC)
        self.assertEqual(build_publish_ranges(cutoff, cutoff), [(cutoff, cutoff)])


if __name__ == "__main__":
    unittest.main()
