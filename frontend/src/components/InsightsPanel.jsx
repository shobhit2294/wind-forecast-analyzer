import { formatNumber } from "../utils/formatters.js";

export default function InsightsPanel({ metrics }) {
  const bias = metrics?.bias;
  const biasLabel =
    bias == null
      ? "AWAITING MATCHED DATA"
      : bias > 0
        ? "OVER-FORECAST"
        : bias < 0
          ? "UNDER-FORECAST"
          : "ON AVERAGE ON TARGET";

  return (
    <article className="panel insight-panel">
      <div className="panel-eyebrow">TRADING CONTEXT</div>
      <h3>What the wind signal says</h3>
      <div className="insight-gauge">
        <div className="gauge-number">
          {bias == null
            ? "—"
            : `${bias > 0 ? "+" : ""}${formatNumber(bias)}`}
          <span> MW</span>
        </div>
        <div className="gauge-caption">average forecast error</div>
        <div className={`bias-pill ${bias > 0 ? "bias-high" : ""}`}>
          {biasLabel}
        </div>
      </div>
      <div className="insight-copy">
        <span className="insight-mark">↗</span>
        <p>
          Use this error profile as a quantified wind-risk input alongside your
          demand forecast, portfolio position and market view.
        </p>
      </div>
      <div className="context-footer">
        <span>DATA COVERAGE</span>
        <b>{formatNumber(metrics?.matchedIntervals)} intervals</b>
      </div>
    </article>
  );
}
