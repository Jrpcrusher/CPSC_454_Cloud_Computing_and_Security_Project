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
    <div className="page-shell">
      <h1>Transactions</h1>

      {loading ? (
        <p>Loading transactions...</p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : transactions.length === 0 ? (
        <p>No transactions yet.</p>
      ) : (
        <div className="order-list">
          {transactions.map((txn) => (
            <div
              key={txn.transaction_id || `${txn.order_id}-${txn.created_at}`}
              className="card"
            >
              <p>
                <strong>Order:</strong> {txn.order_id}
              </p>
              <p>
                <strong>Status:</strong> {txn.status}
              </p>
              <p>
                <strong>Amount:</strong> {txn.amount}{" "}
                {txn.currency?.toUpperCase?.() || txn.currency}
              </p>
              <p>
                <strong>Created:</strong> {formatDate(txn.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}