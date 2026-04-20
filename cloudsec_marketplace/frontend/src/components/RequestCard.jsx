import { useRef, useState } from "react";
import api from "../services/apiClient";

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
  } = request;

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadDone, setUploadDone] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

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
      {isCreatorView && onStatusChange && status === "in_progress" && (
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
              onClick={() => onStatusChange(id, "completed")}
            >
              Mark Completed
            </button>
          </div>
          {uploadError && (
            <p style={{ fontSize: "0.8rem", color: "#ed4245", margin: 0 }}>{uploadError}</p>
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
