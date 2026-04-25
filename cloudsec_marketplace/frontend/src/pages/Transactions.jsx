import { useEffect, useState } from "react";
import api from "../services/apiClient";

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(amountCents, currency) {
  if (typeof amountCents !== "number") return "N/A";
  return `${(amountCents / 100).toFixed(2)} ${currency?.toUpperCase?.() || currency || ""}`.trim();
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/payments/my-transactions");

        if (!cancelled) {
          setTransactions(Array.isArray(res) ? res : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load transactions.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
        <div className="profile-section">
          <h1 className="page-title" style={{ marginBottom: "1rem" }}>
            Transactions
          </h1>

          {loading ? (
            <div className="empty-state">
              <p>Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p className="form-error">{error}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <p>No transactions yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {transactions.map((txn) => (
                <div
                  key={txn.transaction_id || `${txn.order_id}-${txn.created_at}`}
                  className="request-card"
                >
                  <div className="request-card-header">
                    <div>
                      <h3 className="request-card-title">Transaction</h3>
                      <p className="request-card-subtitle">
                        Order: {txn.order_id}
                      </p>
                    </div>

                    <span className={`request-status request-status--${txn.status}`}>
                      {txn.status}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "1rem",
                      display: "grid",
                      gap: "0.5rem",
                      color: "#b5bac1",
                    }}
                  >
                    <div>
                      <strong>Transaction ID:</strong> {txn.transaction_id}
                    </div>
                    <div>
                      <strong>Buyer ID:</strong> {txn.buyer_id}
                    </div>
                    <div>
                      <strong>Artist ID:</strong> {txn.artist_id}
                    </div>
                    <div>
                      <strong>Amount:</strong> {formatMoney(txn.amount, txn.currency)}
                    </div>
                    <div>
                      <strong>Created:</strong> {formatDate(txn.created_at)}
                    </div>
                    <div>
                      <strong>Updated:</strong> {formatDate(txn.updated_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}