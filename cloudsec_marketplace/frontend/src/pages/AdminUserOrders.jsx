import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/apiClient";

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminUserOrders() {
  const { userId } = useParams();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await api.get(`/admin/users/${userId}/orders`);
      setOrders(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || "Failed to load user orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [userId]);

  async function handleDelete(orderId) {
    const confirmed = window.confirm("Are you sure you want to delete this order?");
    if (!confirmed) return;

    try {
      setDeletingId(orderId);
      setError("");
      setMessage("");

      await api.delete(`/admin/users/${userId}/orders/${orderId}`);
      setOrders((prev) => prev.filter((order) => order.order_id !== orderId));
      setMessage("Order deleted.");
    } catch (err) {
      setError(err.message || "Failed to delete order.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <section className="profile-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#888",
                    fontSize: "0.9rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Admin User Orders
                </p>
                <h1 className="page-title" style={{ margin: "0.35rem 0 0 0" }}>
                  User Orders
                </h1>
              </div>

              <Link
                to={`/admin/users/${userId}`}
                className="btn btn-secondary btn-small"
              >
                Back to User
              </Link>
            </div>
          </section>

          {error && <p className="form-error">{error}</p>}
          {message && <p style={{ color: "#4caf50" }}>{message}</p>}

          <section className="profile-section">
            <h2 className="profile-section-title">Orders</h2>

            {loading ? (
              <div className="empty-state" style={{ marginTop: "1rem" }}>
                <p>Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="empty-state" style={{ marginTop: "1rem" }}>
                <p>This user has no orders.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
                {orders.map((order) => (
                  <div key={order.order_id} className="request-card">
                    <div className="request-card-header">
                      <div>
                        <h3 className="request-card-title">Order</h3>
                        <p className="request-card-subtitle">
                          Order ID: {order.order_id}
                        </p>
                      </div>

                      <span className={`request-status request-status--${order.status}`}>
                        {order.status}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: "1rem",
                        display: "grid",
                        gap: "0.5rem",
                        color: "#b5bac1",
                        fontSize: "0.9rem",
                      }}
                    >
                      <div>
                        <strong>Client:</strong> {order.client?.username || "Unknown"}
                      </div>
                      <div>
                        <strong>Artist:</strong> {order.artist?.username || "Unknown"}
                      </div>
                      <div>
                        <strong>Created:</strong> {formatDate(order.creation_date)}
                      </div>
                      <div>
                        <strong>Client approval:</strong> {order.client_approval ? "Yes" : "No"}
                      </div>
                      <div>
                        <strong>Artist approval:</strong> {order.artist_approval ? "Yes" : "No"}
                      </div>
                      <div>
                        <strong>Transaction attached:</strong> {order.transaction_id ? "Yes" : "No"}
                      </div>
                    </div>

                    <p
                      style={{
                        marginTop: "1rem",
                        color: "#b5bac1",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {order.order_details}
                    </p>

                    <div
                      style={{
                        marginTop: "1rem",
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <Link
                        to={`/admin/users/${userId}/orders/${order.order_id}`}
                        className="btn btn-secondary btn-small"
                      >
                        View
                      </Link>

                      <button
                        className="btn btn-secondary btn-small"
                        style={{ background: "#ed4245", color: "#fff" }}
                        onClick={() => handleDelete(order.order_id)}
                        disabled={deletingId === order.order_id}
                      >
                        {deletingId === order.order_id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}