import { useEffect, useState } from "react";
import DashboardHeader from "./components/DashboardHeader.jsx";
import DecisionControls from "./components/DecisionControls.jsx";
import ErrorBanner from "./components/ErrorBanner.jsx";
import ForecastChartPanel from "./components/ForecastChartPanel.jsx";
import ForecastSummary from "./components/ForecastSummary.jsx";
import InsightsPanel from "./components/InsightsPanel.jsx";
import IntervalTable from "./components/IntervalTable.jsx";
import PageFooter from "./components/PageFooter.jsx";
import { getErrorMessage } from "./utils/formatters.js";

const INITIAL_DATE = "2026-01-15";

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

    fetch(
      `/api/analysis?deliveryDate=${deliveryDate}&cutoffTime=${cutoffTime}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.detail || "The analysis request failed.");
        }
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

  const intervals = data?.intervals || [];

  return (
    <main className="app-shell">
      <DashboardHeader />
      <DecisionControls
        deliveryDate={deliveryDate}
        cutoffTime={cutoffTime}
        onDeliveryDateChange={setDeliveryDate}
        onCutoffTimeChange={setCutoffTime}
      />
      <ErrorBanner message={error} />

      <ForecastSummary
        metrics={data?.metrics}
        intervalCount={intervals.length}
        loading={loading}
      />

      <section className="analysis-grid">
        <ForecastChartPanel
          deliveryDate={deliveryDate}
          intervals={intervals}
          loading={loading}
        />
        <InsightsPanel metrics={data?.metrics} />
      </section>

      <IntervalTable
        deliveryDate={deliveryDate}
        intervals={intervals}
        loading={loading}
        error={error}
      />
      <PageFooter />
    </main>
  );
}
