import { formatNumber } from "../utils/formatters.js";
import MetricCard from "./MetricCard.jsx";

export default function ForecastSummary({
  metrics,
  intervalCount,
  loading,
}) {
  const availability = loading
    ? "Loading Elexon data"
    : intervalCount
      ? `${metrics?.matchedIntervals || 0} of ${intervalCount} intervals matched`
      : "No interval data";

  return (
    <>
      <div className="section-title-row">
        <div>
          <div className="section-kicker">JANUARY 2026 · NATIONAL WIND</div>
          <h2>Forecast performance</h2>
        </div>
        <div className="availability">
          {loading && <span className="spinner" />}
          {availability}
        </div>
      </div>

      <section className="metric-grid" aria-live="polite">
        <MetricCard
          label="MEAN ABSOLUTE ERROR"
          value={formatNumber(metrics?.mae)}
          unit=" MW"
          detail="Typical miss per matched interval"
          accent="metric-primary"
        />
        <MetricCard
          label="ROOT MEAN SQUARE ERROR"
          value={formatNumber(metrics?.rmse)}
          unit=" MW"
          detail="Penalises larger forecast misses"
        />
        <MetricCard
          label="FORECAST BIAS"
          value={
            metrics?.bias == null
              ? "—"
              : `${metrics.bias > 0 ? "+" : ""}${formatNumber(metrics.bias)}`
          }
          unit=" MW"
          detail="Positive = over-forecast · negative = under"
        />
        <MetricCard
          label="MATCHED INTERVALS"
          value={formatNumber(metrics?.matchedIntervals)}
          unit=""
          detail={`Of ${intervalCount ?? "—"} observed intervals`}
        />
      </section>
    </>
  );
}
