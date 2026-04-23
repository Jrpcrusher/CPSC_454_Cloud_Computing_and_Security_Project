import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRequests } from "../context/RequestContext";
import RequestCard from "../components/RequestCard";
import api from "../services/apiClient";

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StripeOnboardingBanner({ userId }) {
  const [status, setStatus] = useState(null); // null | "complete" | "incomplete" | "not_started"
  const [onboarding, setOnboarding] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/payments/artist/onboard/status")
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("not_started"));
  }, [userId]);

  async function handleOnboard() {
    setOnboarding(true);
    setError(null);
    try {
      const data = await api.post("/payments/artist/onboard");
      if (data.onboarding_url) {
        window.location.href = data.onboarding_url;
      } else {
        setError("No onboarding URL returned. Please try again.");
        setOnboarding(false);
      }
    } catch (err) {
      setError(err.message || "Failed to start onboarding. Please try again.");
      setOnboarding(false);
    }
  }

  if (status === null) return null;

  if (status === "complete") {
    return (
      <div
        className="become-creator-cta"
        style={{ background: "rgba(59,165,92,0.1)", borderColor: "rgba(59,165,92,0.3)" }}
      >
        <div className="bc-cta-text">
          <span className="bc-cta-icon">✅</span>
          <div>
            <strong>Payouts enabled</strong>
            <p>Your Stripe account is connected. You'll receive payouts when clients approve completed work.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="become-creator-cta"
      style={{ background: "rgba(240,165,0,0.08)", borderColor: "rgba(240,165,0,0.3)" }}
    >
      <div className="bc-cta-text">
        <span className="bc-cta-icon">💳</span>
        <div>
          <strong>Set up payouts to get paid</strong>
          <p>Connect a Stripe account so you can receive funds when clients approve your work.</p>
          {error && <p style={{ color: "#ed4245", marginTop: "0.25rem", fontSize: "0.85rem" }}>{error}</p>}
        </div>
      </div>
      <button
        className="btn btn-primary btn-small"
        onClick={handleOnboard}
        disabled={onboarding}
      >
        {onboarding ? "Redirecting…" : "Set Up Payouts →"}
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { user, isCreator, loading: authLoading } = useAuth();
  const { getRequestsByUser, getRequestsByCreator, updateRequestStatus, loading: ordersLoading, refreshOrders } =
    useRequests();

  useEffect(() => {
    if (user) refreshOrders();
  }, [user?.user_id]);

  const tabs = [
    { id: "sent", label: "My Requests" },
    ...(isCreator ? [{ id: "received", label: "Received Requests" }] : []),
  ];
  const [activeTab, setActiveTab] = useState("sent");

  if (authLoading) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <p>Loading…</p>
          </div>
        </div>
      </div>
    );
  }

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

  const sentRequests = getRequestsByUser();
  const receivedRequests = isCreator ? getRequestsByCreator(user.creatorUsername) : [];

  return (
    <div className="page">
      <div className="container">

        {/* ── Profile card ────────────────────────────────────────── */}
        <div className="dashboard-profile-card">
          <div className="dpc-left">
            <div className="dpc-avatar-wrap">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="dpc-avatar" />
              ) : (
                <div className="dpc-avatar-placeholder">
                  {(user.displayName || user.username || "?")[0].toUpperCase()}
                </div>
              )}
            </div>

            <div className="dpc-info">
              <div className="dpc-name-row">
                <h2 className="dpc-name">{user.displayName || user.username}</h2>
                {isCreator && <span className="creator-role-badge">🎨 Creator</span>}
              </div>
              <p className="dpc-email">{user.email}</p>
              {user.bio && <p className="dpc-bio">{user.bio}</p>}
              <div className="dpc-dates">
                <span>Member since {formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>

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

        {/* ── Stripe Connect onboarding (creators only) ────────────── */}
        {isCreator && <StripeOnboardingBanner userId={user.user_id} />}

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
            {ordersLoading ? (
              <div className="empty-state"><p>Loading orders…</p></div>
            ) : sentRequests.length === 0 ? (
              <div className="empty-state">
                <p>You haven't submitted any requests yet.</p>
                <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>
                  Find a Creator
                </Link>
              </div>
            ) : (
              <div className="requests-list">
                {[...sentRequests].reverse().map((req) => (
                  <RequestCard key={req.id} request={req} isCreatorView={false} onStatusChange={updateRequestStatus} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Received Requests (creators only) ───────────────────── */}
        {activeTab === "received" && isCreator && (
          <div className="dashboard-content">
            {ordersLoading ? (
              <div className="empty-state"><p>Loading orders…</p></div>
            ) : receivedRequests.length === 0 ? (
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
