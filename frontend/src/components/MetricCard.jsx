export default function MetricCard({ label, value, unit, detail, accent }) {
  return (
    <article className={`metric-card ${accent || ""}`}>
      <p className="metric-label">{label}</p>
      <div className="metric-value">
        {value}
        <span>{unit}</span>
      </div>
      <p className="metric-detail">{detail}</p>
    </article>
  );
}
