import { formatNumber, formatTime } from "../utils/formatters.js";
import { downloadIntervalsCsv } from "../utils/exportCsv.js";

export default function IntervalTable({
  deliveryDate,
  intervals,
  loading,
  error,
}) {
  return (
    <section className="panel table-panel">
      <div className="panel-heading table-heading">
        <div>
          <div className="panel-eyebrow">INTERVAL DETAIL</div>
          <h3>Decision-time forecast ledger</h3>
        </div>
        <button
          className="export-button"
          type="button"
          disabled={!intervals.length}
          onClick={() => downloadIntervalsCsv(intervals, deliveryDate)}
        >
          <span>↓</span> Export CSV
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>DELIVERY · UTC</th>
              <th>FORECAST VINTAGE</th>
              <th>FORECAST MW</th>
              <th>ACTUAL MW</th>
              <th>ERROR MW</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {intervals.map((row) => (
              <tr key={row.startTime}>
                <td className="time-cell">{formatTime(row.startTime)}</td>
                <td className="muted-cell">
                  {row.publishTime ? formatTime(row.publishTime) : "—"}
                </td>
                <td>{formatNumber(row.forecast)}</td>
                <td>{formatNumber(row.actual)}</td>
                <td
                  className={
                    row.error == null
                      ? ""
                      : row.error > 0
                        ? "error-positive"
                        : "error-negative"
                  }
                >
                  {row.error == null
                    ? "—"
                    : `${row.error > 0 ? "+" : ""}${formatNumber(row.error)}`}
                </td>
                <td>
                  <span
                    className={`row-status ${row.error == null ? "status-missing" : "status-matched"}`}
                  >
                    {row.error == null ? "NO MATCH" : "MATCHED"}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && !error && !intervals.length && (
              <tr>
                <td className="empty-row" colSpan="6">
                  No interval records are available for this delivery date.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>Showing all available delivery intervals</span>
        <span>All times shown in UTC</span>
      </div>
    </section>
  );
}
