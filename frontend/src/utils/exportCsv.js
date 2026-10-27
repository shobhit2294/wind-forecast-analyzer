export function downloadIntervalsCsv(intervals, deliveryDate) {
  const headings = [
    "startTime_UTC",
    "forecast_MW",
    "actual_MW",
    "error_MW",
    "forecast_publishTime_UTC",
  ];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = [
    headings.join(","),
    ...intervals.map((row) =>
      [row.startTime, row.forecast, row.actual, row.error, row.publishTime]
        .map(escape)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wind-analysis-${deliveryDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
