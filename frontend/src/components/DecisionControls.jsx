export default function DecisionControls({
  deliveryDate,
  cutoffTime,
  onDeliveryDateChange,
  onCutoffTimeChange,
}) {
  const deliveryDayLabel = deliveryDate
    ? new Date(`${deliveryDate}T00:00:00`).toLocaleDateString("en-GB", {
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
            max="2026-01-31"
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
          <b>{deliveryDayLabel} {cutoffTime} UTC</b> on the preceding day
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
