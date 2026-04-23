import { useEffect, useState } from "react";
import api from "../services/apiClient";

export default function OnboardRefresh() {
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .post("/payments/artist/onboard/refresh")
      .then((data) => {
        if (data.onboarding_url) {
          window.location.href = data.onboarding_url;
        } else {
          setError("Could not get a new onboarding link. Please go to your dashboard and try again.");
        }
      })
      .catch((err) => setError(err.message || "Failed to refresh onboarding link."));
  }, []);

  return (
    <div className="page">
      <div className="container">
        <div className="success-panel" style={{ textAlign: "center" }}>
          {error ? (
            <>
              <div className="success-icon">⚠️</div>
              <h2 className="success-title">Something went wrong</h2>
              <p className="success-desc">{error}</p>
            </>
          ) : (
            <>
              <div className="success-icon">🔄</div>
              <h2 className="success-title">Refreshing your onboarding link…</h2>
              <p className="success-desc">You'll be redirected to Stripe in a moment.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
