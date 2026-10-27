import { useEffect, useMemo, useState } from "react";

const INITIAL_DATE = "2026-01-15";

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getErrorMessage(error) {
  if (error?.name === "AbortError") return "";
  return error?.message || "Unable to load Elexon data.";
}

function MetricCard({ label, value, unit, detail, accent }) {
  return (
    <article className={`metric-card ${accent || ""}`}>
      <p className="metric-label">{label}</p>
      <div className="metric-value">{value}<span>{unit}</span></div>
      <p className="metric-detail">{detail}</p>
    </article>
  );
}

function WindChart({ intervals }) {
  const width = 900;
  const height = 265;
  const padding = { top: 20, right: 18, bottom: 36, left: 62 };
  const rows = intervals.filter((item) => item.actual !== null || item.forecast !== null);
  const values = rows.flatMap((item) => [item.actual, item.forecast]).filter(Number.isFinite);
  if (!values.length) {
    return <div className="chart-empty">No matched forecast and actual intervals for this day.</div>;
  }
  const maxY = Math.max(1000, Math.ceil(Math.max(...values) / 5000) * 5000);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const x = (index) => padding.left + (rows.length <= 1 ? 0 : (index / (rows.length - 1)) * plotWidth);
  const y = (value) => padding.top + plotHeight - (value / maxY) * plotHeight;
  const makePath = (key) => rows.map((row, index) => {
    const value = row[key];
    return Number.isFinite(value) ? `${index ? "L" : "M"}${x(index)},${y(value)}` : "";
  }).filter(Boolean).join(" ");

  return (
    <div className="chart-wrap">
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Wind generation forecast compared with actual output">
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const value = maxY * fraction;
          return (
            <g key={fraction}>
              <line x1={padding.left} x2={width - padding.right} y1={y(value)} y2={y(value)} className="grid-line" />
              <text x={padding.left - 10} y={y(value) + 4} textAnchor="end" className="axis-label">{formatNumber(value / 1000)}k</text>
            </g>
          );
        })}
        <path d={makePath("forecast")} className="line-forecast" />
        <path d={makePath("actual")} className="line-actual" />
        {[0, 12, 24, 36, 47].filter((index) => index < rows.length).map((index) => (
          <text key={index} x={x(index)} y={height - 10} textAnchor="middle" className="axis-label">{formatTime(rows[index].startTime)}</text>
        ))}
      </svg>
    </div>
  );
}

function downloadCsv(intervals, deliveryDate) {
  const headings = ["startTime_UTC", "forecast_MW", "actual_MW", "error_MW", "forecast_publishTime_UTC"];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = [
    headings.join(","),
    ...intervals.map((row) => [row.startTime, row.forecast, row.actual, row.error, row.publishTime].map(escape).join(",")),
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wind-analysis-${deliveryDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [deliveryDate, setDeliveryDate] = useState(INITIAL_DATE);
  const [cutoffTime, setCutoffTime] = useState("10:00");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/analysis?deliveryDate=${deliveryDate}&cutoffTime=${cutoffTime}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.detail || "The analysis request failed.");
        return body;
      })
      .then(setData)
      .catch((requestError) => {
        const message = getErrorMessage(requestError);
        if (message) {
          setData(null);
          setError(message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [deliveryDate, cutoffTime]);

  const metrics = data?.metrics;
  const availability = useMemo(() => {
    if (!data?.intervals?.length) return "No interval data";
    const matched = metrics?.matchedIntervals || 0;
    return `${matched} of ${data.intervals.length} intervals matched`;
  }, [data, metrics]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Northstar home">
          <span className="brand-mark">N</span>
          <span>NORTHSTAR <b>ENERGY</b></span>
        </a>
        <div className="topbar-right">
          <span className="env-chip"><span className="status-dot" /> PILOT ANALYTICS</span>
          <span className="topbar-divider" />
          <span className="market-label">GB · DAY-AHEAD</span>
        </div>
      </header>

      <section className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> RENEWABLE INTELLIGENCE</div>
          <h1>Wind forecast desk</h1>
          <p>See the wind signal that shaped tomorrow’s buying decision.</p>
        </div>
        <div className="source-badge"><span className="source-icon">↗</span> ELEXON BMRS <span className="live-tag">LIVE SOURCE</span></div>
      </section>

      <section className="control-panel">
        <div className="control-copy">
          <div className="control-icon">◷</div>
          <div><h2>Decision replay</h2><p>Reconstruct what was knowable before delivery</p></div>
        </div>
        <label className="field-control">
          <span>DELIVERY DATE</span>
          <input type="date" min="2026-01-01" max="2026-01-31" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
        </label>
        <label className="field-control">
          <span>DAY-AHEAD CUTOFF · UTC</span>
          <input type="time" value={cutoffTime} onChange={(event) => setCutoffTime(event.target.value)} />
        </label>
        <div className="decision-hint"><span className="hint-arrow">↳</span> Forecast published by <b>{deliveryDate ? new Date(`${deliveryDate}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }) : "—"} {cutoffTime} UTC</b> on the preceding day</div>
      </section>

      <div className="data-note"><span className="note-icon">i</span><span>Wind generation is one input to procurement, not a net-position forecast. Consumer demand and portfolio data are outside this pilot’s scope. Metrics use exact timestamp matches; unmatched intervals are excluded, not interpolated.</span></div>

      {error && <section className="error-banner" role="alert"><strong>Data unavailable</strong><span>{error}</span></section>}

      <div className="section-title-row">
        <div><div className="section-kicker">JANUARY 2026 · NATIONAL WIND</div><h2>Forecast performance</h2></div>
        <div className="availability">{loading ? <><span className="spinner" /> Loading Elexon data</> : availability}</div>
      </div>

      <section className="metric-grid" aria-live="polite">
        <MetricCard label="MEAN ABSOLUTE ERROR" value={formatNumber(metrics?.mae)} unit=" MW" detail="Typical miss per matched interval" accent="metric-primary" />
        <MetricCard label="ROOT MEAN SQUARE ERROR" value={formatNumber(metrics?.rmse)} unit=" MW" detail="Penalises larger forecast misses" />
        <MetricCard label="FORECAST BIAS" value={metrics?.bias == null ? "—" : `${metrics.bias > 0 ? "+" : ""}${formatNumber(metrics.bias)}`} unit=" MW" detail="Positive = over-forecast · negative = under" />
        <MetricCard label="MATCHED INTERVALS" value={formatNumber(metrics?.matchedIntervals)} unit="" detail={`Of ${data?.intervals?.length ?? "—"} observed intervals`} />
      </section>

      <section className="analysis-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div><div className="panel-eyebrow">GENERATION PROFILE</div><h3>Forecast vs actual</h3></div>
            <div className="legend"><span><i className="legend-forecast" /> Forecast</span><span><i className="legend-actual" /> Actual</span></div>
          </div>
          <div className="chart-meta"><span>MW · UTC delivery intervals</span><span>{deliveryDate}</span></div>
          {loading && !data ? <div className="loading-chart"><span className="spinner" /> Loading interval data…</div> : <WindChart intervals={data?.intervals || []} />}
          <div className="chart-footnote">Forecasts are the latest vintage published before the selected cutoff. Actuals are FUELHH WIND.</div>
        </article>
        <article className="panel insight-panel">
          <div className="panel-eyebrow">TRADING CONTEXT</div>
          <h3>What the wind signal says</h3>
          <div className="insight-gauge">
            <div className="gauge-number">{metrics?.bias == null ? "—" : `${metrics.bias > 0 ? "+" : ""}${formatNumber(metrics.bias)}`}<span> MW</span></div>
            <div className="gauge-caption">average forecast error</div>
            <div className={`bias-pill ${metrics?.bias > 0 ? "bias-high" : ""}`}>{metrics?.bias == null ? "AWAITING MATCHED DATA" : metrics.bias > 0 ? "OVER-FORECAST" : metrics.bias < 0 ? "UNDER-FORECAST" : "ON AVERAGE ON TARGET"}</div>
          </div>
          <div className="insight-copy"><span className="insight-mark">↗</span><p>Use this error profile as a quantified wind-risk input alongside your demand forecast, portfolio position and market view.</p></div>
          <div className="context-footer"><span>DATA COVERAGE</span><b>{formatNumber(metrics?.matchedIntervals)} intervals</b></div>
        </article>
      </section>

      <section className="panel table-panel">
        <div className="panel-heading table-heading">
          <div><div className="panel-eyebrow">INTERVAL DETAIL</div><h3>Decision-time forecast ledger</h3></div>
          <button className="export-button" type="button" disabled={!data?.intervals?.length} onClick={() => downloadCsv(data.intervals, deliveryDate)}><span>↓</span> Export CSV</button>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>DELIVERY · UTC</th><th>FORECAST VINTAGE</th><th>FORECAST MW</th><th>ACTUAL MW</th><th>ERROR MW</th><th>STATUS</th></tr></thead>
            <tbody>
              {(data?.intervals || []).map((row) => (
                <tr key={row.startTime}>
                  <td className="time-cell">{formatTime(row.startTime)}</td>
                  <td className="muted-cell">{row.publishTime ? formatTime(row.publishTime) : "—"}</td>
                  <td>{formatNumber(row.forecast)}</td>
                  <td>{formatNumber(row.actual)}</td>
                  <td className={row.error == null ? "" : row.error > 0 ? "error-positive" : "error-negative"}>{row.error == null ? "—" : `${row.error > 0 ? "+" : ""}${formatNumber(row.error)}`}</td>
                  <td><span className={`row-status ${row.error == null ? "status-missing" : "status-matched"}`}>{row.error == null ? "NO MATCH" : "MATCHED"}</span></td>
                </tr>
              ))}
              {!loading && !error && !data?.intervals?.length && <tr><td className="empty-row" colSpan="6">No interval records are available for this delivery date.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>Showing all available delivery intervals</span><span>All times shown in UTC</span></div>
      </section>

      <footer className="page-footer"><span>NORTHSTAR ENERGY · WIND FORECAST DESK</span><span>Historical replay · January 2026 · Elexon BMRS</span></footer>
    </main>
  );
}
