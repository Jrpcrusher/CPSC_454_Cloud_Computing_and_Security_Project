import { useRef, useState, useEffect } from "react";
import api from "../services/apiClient";
import { useRequests } from "../context/RequestContext";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "#f0a500", bg: "rgba(240,165,0,0.1)" },
  in_progress: { label: "In Progress", color: "#5865f2", bg: "rgba(88,101,242,0.1)" },
  completed: { label: "Completed", color: "#3ba55c", bg: "rgba(59,165,92,0.1)" },
  declined: { label: "Declined", color: "#ed4245", bg: "rgba(237,66,69,0.1)" },
};

export default function RequestCard({ request, onStatusChange, isCreatorView = false }) {
  const {
    id,
    creatorUsername,
    requesterEmail,
    title,
    description,
    tier,
    referenceLinks,
    deadline,
    status,
    createdAt,
    artist_approval,
    client_approval,
  } = request;

  const { cancelRequest, refreshOrders } = useRequests();

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadDone, setUploadDone] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [transactionId, setTransactionId] = useState(null);

  useEffect(() => {
    if (isCreatorView || status !== "in_progress") return;
    let cancelled = false;
    api.get(`/user/me/orders/${id}`).then((data) => {
      if (cancelled) return;
      if (data.watermarked_url) setPreviewUrl(data.watermarked_url);
      if (data.transaction_id) setTransactionId(data.transaction_id);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [id, isCreatorView, status]);

  async function handlePreviewError() {
    try {
      const data = await api.get(`/user/me/orders/${id}`);
      setPreviewUrl(data.watermarked_url || null);
    } catch {
      setPreviewUrl(null);
    }
  }

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const date = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      await api.post(`/user/me/orders/${id}/upload`, fd);
      setUploadDone(true);
    } catch (err) {
      setUploadError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const data = await api.get(`/user/me/orders/${id}/download`);
      if (data.download_url) {
        const a = document.createElement("a");
        a.href = data.download_url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      } else {
        setDownloadError("No download link available.");
      }
    } catch (err) {
      setDownloadError(err.message || "Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="request-card">
      <div className="request-card-top">
        <div className="request-card-info">
          <h3 className="request-card-title">{title}</h3>
          <div className="request-card-meta-row">
            {isCreatorView ? (
              <span className="request-card-sub">From: {requesterEmail}</span>
            ) : (
              <span className="request-card-sub">Creator: @{creatorUsername}</span>
            )}
            <span className="request-card-sub">Tier: {tier}</span>
            <span className="request-card-sub">Submitted: {date}</span>
          </div>
        </div>
        <span
          className="request-status-badge"
          style={{ color: statusCfg.color, background: statusCfg.bg }}
        >
          {statusCfg.label}
        </span>
      </div>

      {description && (
        <p className="request-card-desc">{description}</p>
      )}

      {referenceLinks && (
        <p className="request-card-refs">
          <strong>References:</strong> {referenceLinks}
        </p>
      )}

      {deadline && (
        <p className="request-card-deadline">
          <strong>Requested deadline:</strong> {deadline}
        </p>
      )}

      {/* Creator: accept / decline pending requests */}
      {isCreatorView && onStatusChange && status === "pending" && (
        <div className="request-card-actions">
          <button
            className="btn btn-small"
            style={{ background: "#3ba55c", color: "#fff" }}
            onClick={() => onStatusChange(id, "in_progress")}
          >
            Accept
          </button>
          <button
            className="btn btn-small"
            style={{ background: "#ed4245", color: "#fff" }}
            onClick={() => onStatusChange(id, "declined")}
          >
            Decline
          </button>
        </div>
      )}

      {/* Creator: upload final artwork + mark completed */}
      {isCreatorView && onStatusChange && status === "in_progress" && !artist_approval && (
        <div className="request-card-actions" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileSelected}
            />
            {uploadDone ? (
              <span style={{ fontSize: "0.85rem", color: "#3ba55c" }}>✅ Artwork uploaded</span>
            ) : (
              <button
                className="btn btn-small"
                style={{ background: "#5865f2", color: "#fff" }}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "📎 Upload Final Artwork"}
              </button>
            )}
            <button
              className="btn btn-small"
              style={{ background: "#3ba55c", color: "#fff" }}
              onClick={async () => {
                setCompleting(true);
                await onStatusChange(id, "completed");
                setCompleting(false);
              }}
              disabled={completing}
            >
              {completing ? "Submitting…" : "Mark Completed"}
            </button>
          </div>
          {uploadError && (
            <p style={{ fontSize: "0.8rem", color: "#ed4245", margin: 0 }}>{uploadError}</p>
          )}
        </div>
      )}

      {/* Client: watermarked preview during in_progress */}
      {!isCreatorView && status === "in_progress" && previewUrl && (
        <div style={{ margin: "0.75rem 0" }}>
          <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.4rem" }}>
            Watermarked preview — full resolution delivered on approval.
          </p>
          <img
            src={previewUrl}
            alt="Watermarked preview"
            onError={handlePreviewError}
            style={{ maxWidth: "100%", borderRadius: "8px", border: "1px solid #333" }}
          />
        </div>
      )}

      {/* Client: approve completed work (artist has marked done, client's turn) */}
      {!isCreatorView && onStatusChange && status === "in_progress" && artist_approval === true && !client_approval && (
        <div className="request-card-actions">
          <button
            className="btn btn-small"
            style={{ background: "#3ba55c", color: "#fff" }}
            onClick={async () => {
              setApproving(true);
              await onStatusChange(id, "completed");
              setApproving(false);
            }}
            disabled={approving}
          >
            {approving ? "Approving…" : "Approve & Release"}
          </button>
        </div>
      )}

      {/* Client: cancel request (pending) or cancel & refund (in_progress) */}
      {!isCreatorView && (status === "pending" || status === "in_progress") && (
        <div className="request-card-actions" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.5rem" }}>
          <button
            className="btn btn-small"
            style={{ background: "#ed4245", color: "#fff" }}
            disabled={canceling}
            onClick={async () => {
              const hasEscrow = status === "in_progress" && !!transactionId;
              const confirmMsg = hasEscrow
                ? "Cancel this order and refund your payment? You will not receive the artwork."
                : "Cancel this request?";
              if (!window.confirm(confirmMsg)) return;
              setCanceling(true);
              setCancelError(null);
              const result = await cancelRequest(id);
              if (!result.success) {
                setCancelError(result.error);
                await refreshOrders();
              }
              setCanceling(false);
            }}
          >
            {canceling
              ? "Canceling…"
              : status === "in_progress" && !!transactionId
              ? "Cancel & Refund"
              : "Cancel Request"}
          </button>
          {cancelError && (
            <p style={{ fontSize: "0.8rem", color: "#ed4245", margin: 0 }}>{cancelError}</p>
          )}
        </div>
      )}

      {/* Client: download finished artwork on completed orders */}
      {!isCreatorView && status === "completed" && (
        <div className="request-card-actions" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.5rem" }}>
          <button
            className="btn btn-small"
            style={{ background: "#3ba55c", color: "#fff" }}
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? "Getting link…" : "⬇ Download Artwork"}
          </button>
          {downloadError && (
            <p style={{ fontSize: "0.8rem", color: "#ed4245", margin: 0 }}>{downloadError}</p>
          )}
        </div>
      )}
    </div>
  );
}
