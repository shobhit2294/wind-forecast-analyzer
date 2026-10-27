import { formatTime } from "../utils/formatters.js";
import WindChart from "./WindChart.jsx";

export default function ForecastChartPanel({ deliveryDate, intervals, loading }) {
  return (
    <article className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-eyebrow">GENERATION PROFILE</div>
          <h3>Forecast vs actual</h3>
        </div>
        <div className="legend">
          <span><i className="legend-forecast" /> Forecast</span>
          <span><i className="legend-actual" /> Actual</span>
        </div>
      </div>
      <div className="chart-meta">
        <span>MW · UTC delivery intervals</span>
        <span>{deliveryDate}</span>
      </div>
      {loading && !intervals.length ? (
        <div className="loading-chart">
          <span className="spinner" /> Loading interval data…
        </div>
      ) : (
        <WindChart intervals={intervals} />
      )}
      <div className="chart-footnote">
        Forecasts are the latest vintage published before the selected cutoff.
        Actuals are FUELHH WIND.
      </div>
    </article>
  );
}
