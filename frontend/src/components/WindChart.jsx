import { formatNumber, formatTime } from "../utils/formatters.js";

export default function WindChart({ intervals }) {
  const width = 900;
  const height = 265;
  const padding = { top: 20, right: 18, bottom: 36, left: 62 };
  const rows = intervals.filter(
    (item) => item.actual !== null || item.forecast !== null,
  );
  const values = rows
    .flatMap((item) => [item.actual, item.forecast])
    .filter(Number.isFinite);

  if (!values.length) {
    return (
      <div className="chart-empty">
        No matched forecast and actual intervals for this day.
      </div>
    );
  }

  const maxY = Math.max(1000, Math.ceil(Math.max(...values) / 5000) * 5000);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const x = (index) =>
    padding.left +
    (rows.length <= 1 ? 0 : (index / (rows.length - 1)) * plotWidth);
  const y = (value) =>
    padding.top + plotHeight - (value / maxY) * plotHeight;
  const makePath = (key) =>
    rows
      .map((row, index) => {
        const value = row[key];
        return Number.isFinite(value)
          ? `${index ? "L" : "M"}${x(index)},${y(value)}`
          : "";
      })
      .filter(Boolean)
      .join(" ");

  return (
    <div className="chart-wrap">
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Wind generation forecast compared with actual output"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const value = maxY * fraction;
          return (
            <g key={fraction}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y(value)}
                y2={y(value)}
                className="grid-line"
              />
              <text
                x={padding.left - 10}
                y={y(value) + 4}
                textAnchor="end"
                className="axis-label"
              >
                {formatNumber(value / 1000)}k
              </text>
            </g>
          );
        })}
        <path d={makePath("forecast")} className="line-forecast" />
        <path d={makePath("actual")} className="line-actual" />
        {[0, 12, 24, 36, 47]
          .filter((index) => index < rows.length)
          .map((index) => (
            <text
              key={index}
              x={x(index)}
              y={height - 10}
              textAnchor="middle"
              className="axis-label"
            >
              {formatTime(rows[index].startTime)}
            </text>
          ))}
      </svg>
    </div>
  );
}
