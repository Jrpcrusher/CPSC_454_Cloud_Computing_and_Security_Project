import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/apiClient";

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminOrderDetail() {
  const { userId, orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      try {
        setLoading(true);
        setError("");
        setMessage("");

        const res = await api.get(`/admin/users/${userId}/orders/${orderId}`);

        if (!cancelled) {
          setOrder(res);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load order.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [userId, orderId]);

  async function handleDelete() {
    const confirmed = window.confirm("Are you sure you want to delete this order?");
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");
      setMessage("");

      await api.delete(`/admin/users/${userId}/orders/${orderId}`);
      navigate(`/admin/users/${userId}/orders`);
    } catch (err) {
      setError(err.message || "Failed to delete order.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <p>Loading order...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>Order not found</h2>
            <p>{error || "We could not load that order."}</p>
            <Link
              to={`/admin/users/${userId}/orders`}
              className="btn btn-primary"
              style={{ marginTop: "1rem" }}
            >
              Back to User Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div
        className="container"
        style={{
          paddingTop: "2rem",
          paddingBottom: "3rem",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: "1100px" }}>
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <section className="profile-section">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
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
                    Admin Order Detail
                  </p>
                  <h1 className="page-title" style={{ margin: "0.35rem 0 0 0" }}>
                    Order
                  </h1>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <Link
                    to={`/admin/users/${userId}/orders`}
                    className="btn btn-secondary btn-small"
                  >
                    Back to Orders
                  </Link>

                  <button
                    className="btn btn-secondary btn-small"
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{ background: "#ed4245", color: "#fff" }}
                  >
                    {deleting ? "Deleting..." : "Delete Order"}
                  </button>
                </div>
              </div>
            </section>

            {error && <p className="form-error">{error}</p>}
            {message && <p style={{ color: "#4caf50" }}>{message}</p>}

            <div
              style={{
                display: "grid",
                gap: "1.5rem",
                gridTemplateColumns: "1.6fr 1fr",
                alignItems: "start",
              }}
            >
              <div style={{ display: "grid", gap: "1.5rem" }}>
                <section className="profile-section">
                  <h2 className="profile-section-title">Order Details</h2>

                  <div
                    style={{
                      marginTop: "1rem",
                      color: "#b5bac1",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.7,
                    }}
                  >
                    {order.order_details || "No order details provided."}
                  </div>
                </section>

                {(order.watermarked_url || order.watermarked_key || order.unwatermarked_key) && (
                  <section className="profile-section">
                    <h2 className="profile-section-title">Artwork</h2>

                    {order.watermarked_url ? (
                      <div style={{ marginTop: "1rem" }}>
                        <img
                          src={order.watermarked_url}
                          alt="Watermarked preview"
                          style={{
                            width: "100%",
                            maxWidth: "850px",
                            maxHeight: "65vh",
                            objectFit: "contain",
                            borderRadius: "12px",
                            border: "1px solid #333",
                            background: "#1f2125",
                            display: "block",
                            margin: "0 auto",
                          }}
                        />
                      </div>
                    ) : (
                      <div className="empty-state" style={{ marginTop: "1rem" }}>
                        <p>No preview image available.</p>
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: "1rem",
                        display: "grid",
                        gap: "0.5rem",
                        color: "#b5bac1",
                      }}
                    >
                      {order.watermarked_key && (
                        <div>
                          <strong>Watermarked Key:</strong> {order.watermarked_key}
                        </div>
                      )}
                      {order.unwatermarked_key && (
                        <div>
                          <strong>Unwatermarked Key:</strong> {order.unwatermarked_key}
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>

              <div style={{ display: "grid", gap: "1.5rem" }}>
                <section className="profile-section">
                  <h2 className="profile-section-title">Order Info</h2>

                  <div
                    style={{
                      marginTop: "1rem",
                      display: "grid",
                      gap: "0.75rem",
                      color: "#b5bac1",
                    }}
                  >
                    <div>
                      <strong>Order ID:</strong> {order.order_id}
                    </div>
                    <div>
                      <strong>Status:</strong> {order.status}
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
                </section>

                <section className="profile-section">
                  <h2 className="profile-section-title">Client</h2>

                  <div
                    style={{
                      marginTop: "1rem",
                      display: "grid",
                      gap: "0.75rem",
                      color: "#b5bac1",
                    }}
                  >
                    <div>
                      <strong>Username:</strong> {order.client?.username || "Unknown"}
                    </div>
                    <div>
                      <strong>Email:</strong> {order.client?.email || "Unknown"}
                    </div>
                    <div>
                      <strong>User ID:</strong> {order.client?.user_id || "Unknown"}
                    </div>
                  </div>
                </section>

                <section className="profile-section">
                  <h2 className="profile-section-title">Artist</h2>

                  <div
                    style={{
                      marginTop: "1rem",
                      display: "grid",
                      gap: "0.75rem",
                      color: "#b5bac1",
                    }}
                  >
                    <div>
                      <strong>Username:</strong> {order.artist?.username || "Unknown"}
                    </div>
                    <div>
                      <strong>Email:</strong> {order.artist?.email || "Unknown"}
                    </div>
                    <div>
                      <strong>User ID:</strong> {order.artist?.user_id || "Unknown"}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}