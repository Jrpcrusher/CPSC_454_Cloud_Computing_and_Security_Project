import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/apiClient";

export default function OnboardComplete() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api
      .get("/payments/artist/onboard/status")
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("unknown"));

    const timer = setTimeout(() => navigate("/dashboard"), 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="page">
      <div className="container">
        <div className="success-panel" style={{ textAlign: "center" }}>
          {status === "complete" ? (
            <>
              <div className="success-icon">✅</div>
              <h2 className="success-title">Payouts enabled!</h2>
              <p className="success-desc">
                Your Stripe account is connected. You'll receive payouts automatically when clients approve completed work.
              </p>
            </>
          ) : (
            <>
              <div className="success-icon">⏳</div>
              <h2 className="success-title">Almost there…</h2>
              <p className="success-desc">
                Stripe is still reviewing your account. Check back soon — it usually takes a few minutes.
              </p>
            </>
          )}
          <p style={{ fontSize: "0.85rem", color: "#888", marginTop: "1rem" }}>
            Redirecting you to your dashboard…
          </p>
        </div>
      </div>
    </div>
  );
}
