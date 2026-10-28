export default function DecisionControls({
  deliveryDate,
  cutoffTime,
  onDeliveryDateChange,
  onCutoffTimeChange,
}) {
  const cutoffDate = deliveryDate
    ? new Date(new Date(`${deliveryDate}T00:00:00Z`).getTime() - 86400000)
    : null;
  const cutoffDayLabel = cutoffDate
    ? cutoffDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      })
    : "—";

  return (
    <>
      <section className="control-panel">
        <div className="control-copy">
          <div className="control-icon">◷</div>
          <div>
            <h2>Decision replay</h2>
            <p>Reconstruct what was knowable before delivery</p>
          </div>
        </div>
        <label className="field-control">
          <span>DELIVERY DATE</span>
          <input
            type="date"
            min="2026-01-01"
            max="2026-02-01"
            value={deliveryDate}
            onChange={(event) => onDeliveryDateChange(event.target.value)}
          />
        </label>
        <label className="field-control">
          <span>DAY-AHEAD CUTOFF · UTC</span>
          <input
            type="time"
            value={cutoffTime}
            onChange={(event) => onCutoffTimeChange(event.target.value)}
          />
        </label>
        <div className="decision-hint">
          <span className="hint-arrow">↳</span> Forecast published by{" "}
          <b>{cutoffDayLabel} {cutoffTime} UTC</b> (D-1 decision cutoff)
        </div>
      </section>

      <div className="data-note">
        <span className="note-icon">i</span>
        <span>
          Wind generation is one input to procurement, not a net-position
          forecast. Consumer demand and portfolio data are outside this pilot’s
          scope. Metrics use exact timestamp matches; unmatched intervals are
          excluded, not interpolated.
        </span>
      </div>
    </>
  );
}
