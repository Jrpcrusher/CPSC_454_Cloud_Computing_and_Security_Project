import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRequests } from "../context/RequestContext";
import RequestCard from "../components/RequestCard";

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Dashboard() {
  const { user, isCreator } = useAuth();
  const { getRequestsByUser, getRequestsByCreator, updateRequestStatus } = useRequests();

  const tabs = [
    { id: "sent", label: "My Requests" },
    ...(isCreator ? [{ id: "received", label: "Received Requests" }] : []),
  ];
  const [activeTab, setActiveTab] = useState("sent");

  if (!user) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>You're not logged in</h2>
            <p>Please log in to view your dashboard.</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Log In / Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sentRequests = getRequestsByUser(user.email);
  const receivedRequests = isCreator ? getRequestsByCreator(user.creatorUsername) : [];

  return (
    <div className="page">
      <div className="container">

        {/* ── Profile card ────────────────────────────────────────── */}
        <div className="dashboard-profile-card">
          <div className="dpc-left">
            {/* Avatar */}
            <div className="dpc-avatar-wrap">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="dpc-avatar" />
              ) : (
                <div className="dpc-avatar-placeholder">
                  {(user.displayName || user.email)[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="dpc-info">
              <div className="dpc-name-row">
                <h2 className="dpc-name">{user.displayName || user.email.split("@")[0]}</h2>
                {isCreator && <span className="creator-role-badge">🎨 Creator</span>}
              </div>
              <p className="dpc-email">{user.email}</p>
              {user.bio && <p className="dpc-bio">{user.bio}</p>}
              <div className="dpc-dates">
                <span>Member since {formatDate(user.createdAt)}</span>
                {user.updatedAt && user.updatedAt !== user.createdAt && (
                  <span>· Updated {formatDate(user.updatedAt)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="dpc-actions">
            <Link to="/profile/edit" className="btn btn-secondary btn-small">
              ✏️ Edit Profile
            </Link>
            {isCreator && (
              <Link to={`/creator/${user.creatorUsername}`} className="btn btn-secondary btn-small">
                My Creator Page
              </Link>
            )}
          </div>
        </div>

        {/* ── Become a Creator CTA (non-creators only) ────────────── */}
        {!isCreator && (
          <div className="become-creator-cta">
            <div className="bc-cta-text">
              <span className="bc-cta-icon">🎨</span>
              <div>
                <strong>Want to accept commissions?</strong>
                <p>Set up a creator profile and start receiving art requests from clients.</p>
              </div>
            </div>
            <Link to="/become-creator" className="btn btn-primary btn-small">
              Become a Creator →
            </Link>
          </div>
        )}

        {/* ── Stats row ───────────────────────────────────────────── */}
        <div className="dashboard-stats">
          <div className="dashboard-stat-card">
            <span className="dashboard-stat-value">{sentRequests.length}</span>
            <span className="dashboard-stat-label">Requests Sent</span>
          </div>
          <div className="dashboard-stat-card">
            <span className="dashboard-stat-value">
              {sentRequests.filter((r) => r.status === "completed").length}
            </span>
            <span className="dashboard-stat-label">Completed</span>
          </div>
          <div className="dashboard-stat-card">
            <span className="dashboard-stat-value">
              {sentRequests.filter((r) => r.status === "in_progress").length}
            </span>
            <span className="dashboard-stat-label">In Progress</span>
          </div>
          {isCreator ? (
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-value">{receivedRequests.length}</span>
              <span className="dashboard-stat-label">Requests Received</span>
            </div>
          ) : (
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-value">
                {sentRequests.filter((r) => r.status === "pending").length}
              </span>
              <span className="dashboard-stat-label">Pending</span>
            </div>
          )}
        </div>

        {/* ── Tabs ────────────────────────────────────────────────── */}
        <div className="dashboard-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`dashboard-tab ${activeTab === tab.id ? "dashboard-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              <span className="dashboard-tab-count">
                {tab.id === "sent" ? sentRequests.length : receivedRequests.length}
              </span>
            </button>
          ))}
        </div>

        {/* ── My Requests ─────────────────────────────────────────── */}
        {activeTab === "sent" && (
          <div className="dashboard-content">
            {sentRequests.length === 0 ? (
              <div className="empty-state">
                <p>You haven't submitted any requests yet.</p>
                <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>
                  Find a Creator
                </Link>
              </div>
            ) : (
              <div className="requests-list">
                {[...sentRequests].reverse().map((req) => (
                  <RequestCard key={req.id} request={req} isCreatorView={false} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Received Requests (creators only) ───────────────────── */}
        {activeTab === "received" && isCreator && (
          <div className="dashboard-content">
            {receivedRequests.length === 0 ? (
              <div className="empty-state">
                <p>No requests yet. Share your profile to start getting commissions!</p>
                <Link
                  to={`/creator/${user.creatorUsername}`}
                  className="btn btn-primary"
                  style={{ marginTop: "1rem" }}
                >
                  View My Profile
                </Link>
              </div>
            ) : (
              <div className="requests-list">
                {[...receivedRequests].reverse().map((req) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    isCreatorView={true}
                    onStatusChange={updateRequestStatus}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
