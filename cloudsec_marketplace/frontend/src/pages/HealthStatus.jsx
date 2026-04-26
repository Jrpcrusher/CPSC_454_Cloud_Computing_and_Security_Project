import { useEffect, useState } from "react";
import api from "../services/apiClient";

function StatusPill({ status }) {
  const normalized = String(status || "unknown").toLowerCase();
  const className =
    normalized === "ok"
      ? "health-pill health-pill--ok"
      : normalized === "degraded"
      ? "health-pill health-pill--warn"
      : "health-pill health-pill--error";

  return <span className={className}>{normalized}</span>;
}

export default function HealthStatus() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function loadHealth(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      setError("");
      const res = await api.get("/health/status");
      setHealth(res);
    } catch (err) {
      setError(err.message || "Failed to load system status.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadHealth(false);
  }, []);

  const overallStatus = health?.status || "unknown";

  return (
    <div className="page">
      <div className="container health-page">
        <div className="health-hero">
          <div>
            <p className="health-eyebrow">System Check</p>
            <h1 className="page-title">Platform Health</h1>
            <p className="health-subtitle">
              Current backend status from the existing health endpoint.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadHealth(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh Status"}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="empty-state">Loading platform status...</div>
        ) : health ? (
          <div className="health-summary-card">
            <div>
              <p className="health-label">Overall Status</p>
              <div className="health-summary-row">
                <h2 className="health-summary-title">Marketplace Backend</h2>
                <StatusPill status={overallStatus} />
              </div>
              <p className="health-meta">
                The backend health route is responding successfully.
              </p>
            </div>
          </div>
        ) : (
          <div className="empty-state">No health data returned.</div>
        )}
      </div>
    </div>
  );
}