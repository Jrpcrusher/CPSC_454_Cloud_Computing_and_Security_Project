import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/apiClient";

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [order, setOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [acting, setActing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [refunding, setRefunding] = useState(false);

  async function loadOrderDetail() {
    try {
      setLoading(true);
      setPageError("");
      setActionError("");

      const detail = await api.get(`/user/me/orders/${orderId}`);
      setOrder(detail);

      if (detail?.transaction_id) {
        try {
          const payment = await api.get(`/payments/${orderId}/status`);
          setPaymentStatus(payment);
        } catch {
          setPaymentStatus(null);
        }
      } else {
        setPaymentStatus(null);
      }
    } catch (err) {
      setPageError(err.message || "Failed to load order.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

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

  if (pageError || !order) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>Order not found</h2>
            <p>{pageError || "We could not load that order."}</p>
            <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isArtist = user?.user_id === order.artist?.user_id;
  const isClient = user?.user_id === order.client?.user_id;

  async function handleAccept() {
    try {
      setActing(true);
      setActionError("");
      setActionMessage("");
      await api.patch(`/user/me/orders/${orderId}/accept`);
      setActionMessage("Order accepted.");
      await loadOrderDetail();
    } catch (err) {
      setActionError(err.message || "Failed to accept order.");
    } finally {
      setActing(false);
    }
  }

  async function handleDecline() {
    try {
      setActing(true);
      setActionError("");
      setActionMessage("");
      await api.patch(`/user/me/orders/${orderId}/decline`);
      setActionMessage("Order declined.");
      await loadOrderDetail();
    } catch (err) {
      setActionError(err.message || "Failed to decline order.");
    } finally {
      setActing(false);
    }
  }

  async function handleApprove() {
    try {
      setActing(true);
      setActionError("");
      setActionMessage("");
      await api.post(`/user/me/orders/${orderId}/approve`);
      setActionMessage("Approval submitted.");
      await loadOrderDetail();
    } catch (err) {
      setActionError(err.message || "Failed to approve order.");
    } finally {
      setActing(false);
    }
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setActionError("");
      setActionMessage("");

      const formData = new FormData();
      formData.append("image", file);

      await api.post(`/user/me/orders/${orderId}/upload`, formData);
      setActionMessage("Artwork uploaded.");
      await loadOrderDetail();
    } catch (err) {
      setActionError(err.message || "Failed to upload artwork.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDownload() {
    try {
      setDownloading(true);
      setActionError("");
      setActionMessage("");

      const data = await api.get(`/user/me/orders/${orderId}/download`);

      if (data?.download_url) {
        window.open(data.download_url, "_blank", "noopener,noreferrer");
      } else {
        setActionError("No download URL available.");
      }
    } catch (err) {
      setActionError(err.message || "Failed to download artwork.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleRefund() {
    try {
      setRefunding(true);
      setActionError("");
      setActionMessage("");

      await api.post(`/payments/${orderId}/refund`);
      setActionMessage("Refund requested.");
      await loadOrderDetail();
    } catch (err) {
      setActionError(err.message || "Failed to refund payment.");
    } finally {
      setRefunding(false);
    }
  }

  const canArtistAcceptOrDecline = isArtist && order.status === "received";
  const canArtistUpload = isArtist && order.status === "accepted";
  const canArtistApprove = isArtist && order.status === "accepted" && !order.artist_approval;

  const canClientApprove =
    isClient &&
    order.status === "accepted" &&
    order.artist_approval === true &&
    !order.client_approval;

  const canClientDownload = isClient && order.status === "completed";
  const canClientRefund = isClient && !!order.transaction_id;

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
        <div className="profile-section" style={{ marginBottom: "1.5rem" }}>
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
              <h1 className="page-title" style={{ marginBottom: "0.5rem" }}>
                Order Detail
              </h1>
              <p style={{ color: "#888", margin: 0 }}>Order ID: {order.order_id}</p>
            </div>

            <Link to="/dashboard" className="btn btn-secondary btn-small">
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "2fr 1fr",
          }}
        >
          <div style={{ display: "grid", gap: "1.5rem" }}>
            <section className="profile-section">
              <h2 className="profile-section-title">Request Description</h2>
              <p style={{ whiteSpace: "pre-wrap", marginTop: "1rem" }}>
                {order.order_details}
              </p>
            </section>

            <section className="profile-section">
              <h2 className="profile-section-title">Artwork</h2>

              {order.watermarked_url ? (
                <div style={{ marginTop: "1rem" }}>
                  <p style={{ fontSize: "0.9rem", color: "#888" }}>
                    Watermarked preview
                  </p>
                  <img
                    src={order.watermarked_url}
                    alt="Watermarked artwork preview"
                    style={{
                      maxWidth: "100%",
                      borderRadius: "10px",
                      border: "1px solid #333",
                      marginTop: "0.75rem",
                    }}
                  />
                </div>
              ) : (
                <div className="empty-state" style={{ marginTop: "1rem" }}>
                  No artwork uploaded yet.
                </div>
              )}

              {canClientDownload && (
                <div style={{ marginTop: "1rem" }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleDownload}
                    disabled={downloading}
                  >
                    {downloading ? "Getting download..." : "Download Artwork"}
                  </button>
                </div>
              )}
            </section>

            <section className="profile-section">
              <h2 className="profile-section-title">Actions</h2>

              {actionError && (
                <p className="form-error" style={{ marginTop: "1rem" }}>
                  {actionError}
                </p>
              )}

              {actionMessage && (
                <p style={{ color: "#4caf50", marginTop: "1rem" }}>
                  {actionMessage}
                </p>
              )}

              <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {canArtistAcceptOrDecline && (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={handleAccept}
                      disabled={acting}
                    >
                      {acting ? "Working..." : "Accept Order"}
                    </button>

                    <button
                      className="btn btn-secondary"
                      onClick={handleDecline}
                      disabled={acting}
                    >
                      {acting ? "Working..." : "Decline Order"}
                    </button>
                  </>
                )}

                {canArtistUpload && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleFileSelected}
                    />

                    <button
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    >
                    {uploading
                        ? "Uploading..."
                        : order.watermarked_url
                        ? "Replace Artwork"
                        : "Upload Artwork"}
                    </button>
                  </>
                )}

                {canArtistApprove && (
                  <button
                    className="btn btn-primary"
                    onClick={handleApprove}
                    disabled={acting}
                  >
                    {acting ? "Submitting..." : "Artist Approve"}
                  </button>
                )}

                {canClientApprove && (
                  <button
                    className="btn btn-primary"
                    onClick={handleApprove}
                    disabled={acting}
                  >
                    {acting ? "Submitting..." : "Client Approve"}
                  </button>
                )}

                {canClientRefund && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleRefund}
                    disabled={refunding}
                  >
                    {refunding ? "Refunding..." : "Refund Payment"}
                  </button>
                )}
              </div>
            </section>
          </div>

          <div style={{ display: "grid", gap: "1.5rem" }}>
            <section className="profile-section">
              <h2 className="profile-section-title">Order Info</h2>

              <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
                <div>
                  <strong>Status:</strong> {order.status}
                </div>
                <div>
                  <strong>Created:</strong> {formatDate(order.creation_date)}
                </div>
                <div>
                  <strong>Transaction attached:</strong> {order.transaction_id ? "Yes" : "No"}
                </div>
                <div>
                  <strong>Client approval:</strong> {order.client_approval ? "Yes" : "No"}
                </div>
                <div>
                  <strong>Artist approval:</strong> {order.artist_approval ? "Yes" : "No"}
                </div>
              </div>
            </section>

            <section className="profile-section">
              <h2 className="profile-section-title">People</h2>

              <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
                <div>
                  <strong>Client:</strong> {order.client?.username || "Unknown"}
                </div>
                <div>
                  <strong>Artist:</strong> {order.artist?.username || "Unknown"}
                </div>
              </div>
            </section>

            {paymentStatus && (
              <section className="profile-section">
                <h2 className="profile-section-title">Payment</h2>

                <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
                  <div>
                    <strong>Status:</strong> {paymentStatus.status}
                  </div>
                  <div>
                    <strong>Amount:</strong> ${(paymentStatus.amount / 100).toFixed(2)}{" "}
                    {paymentStatus.currency?.toUpperCase()}
                  </div>
                  <div>
                    <strong>Created:</strong> {formatDate(paymentStatus.created_at)}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}