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

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const date = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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

      {isCreatorView && onStatusChange && status === "in_progress" && (
        <div className="request-card-actions">
          <button
            className="btn btn-small"
            style={{ background: "#3ba55c", color: "#fff" }}
            onClick={() => onStatusChange(id, "completed")}
          >
            Mark Completed
          </button>
        </div>
      )}
    </div>
  );
}
