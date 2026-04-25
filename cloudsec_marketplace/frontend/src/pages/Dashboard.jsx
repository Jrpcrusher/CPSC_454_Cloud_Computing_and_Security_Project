import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/apiClient";

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StripeOnboardingBanner() {
  const [status, setStatus] = useState(null);
  const [onboarding, setOnboarding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const res = await api.get("/payments/artist/onboard/status");
        if (!cancelled) {
          setStatus(res?.status || "not_started");
        }
      } catch {
        if (!cancelled) {
          setStatus("not_started");
        }
      }
    }

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleOnboard() {
    try {
      setOnboarding(true);
      setError("");

      const res = await api.post("/payments/artist/onboard");
      const onboardingUrl = res?.onboarding_url;

      if (onboardingUrl) {
        window.location.href = onboardingUrl;
        return;
      }

      setError("No onboarding URL returned.");
    } catch (err) {
      setError(err.message || "Failed to start onboarding.");
    } finally {
      setOnboarding(false);
    }
  }

  if (status === null || status === "complete") return null;

  return (
    <div
      className="become-creator-cta"
      style={{ background: "rgba(240,165,0,0.08)", borderColor: "rgba(240,165,0,0.3)" }}
    >
      <div className="bc-cta-text">
        <span className="bc-cta-icon">💳</span>
        <div>
          <strong>Set up payouts to get paid</strong>
          <p>Connect a Stripe account so you can receive payouts for completed commissions.</p>
          {error && (
            <p style={{ color: "#ed4245", marginTop: "0.25rem", fontSize: "0.85rem" }}>
              {error}
            </p>
          )}
        </div>
      </div>

      <button
        className="btn btn-primary btn-small"
        onClick={handleOnboard}
        disabled={onboarding}
      >
        {onboarding ? "Redirecting..." : "Set Up Payouts"}
      </button>
    </div>
  );
}

function OrderList({ orders, emptyMessage, role }) {
  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <p>{emptyMessage}</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>
          Browse Creators
        </Link>
      </div>
    );
  }

  return (
    <div className="requests-list">
      {orders.map((order) => {
        const otherUser = role === "client" ? order.artist : order.client;

        return (
          <div key={order.order_id} className="request-card">
            <div className="request-card-header">
              <div>
                <h3 className="request-card-title">
                  {role === "client" ? "Commission Request" : "Incoming Request"}
                </h3>
                <p className="request-card-subtitle">
                  {role === "client" ? "Artist" : "Client"}: {otherUser?.username || "Unknown"}
                </p>
              </div>

              <span className={`request-status request-status--${order.status}`}>
                {order.status}
              </span>
            </div>

            <p
              className="request-card-description"
              style={{ marginTop: "0.75rem", whiteSpace: "pre-wrap" }}
            >
              {order.order_details}
            </p>

            <div
              style={{
                marginTop: "1rem",
                display: "grid",
                gap: "0.35rem",
                color: "#b5bac1",
                fontSize: "0.9rem",
              }}
            >
              <span>Created: {formatDate(order.creation_date)}</span>
              <span>Client approval: {order.client_approval ? "Yes" : "No"}</span>
              <span>Artist approval: {order.artist_approval ? "Yes" : "No"}</span>
              <span>Transaction: {order.transaction_id ? "Attached" : "None"}</span>
            </div>

            <div style={{ marginTop: "1rem" }}>
              <Link
                to={`/orders/${order.order_id}`}
                className="btn btn-secondary btn-small"
              >
                View Order
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState(null);
  const [clientOrders, setClientOrders] = useState([]);
  const [artistOrders, setArtistOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("client");

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoadingOrders(true);
        setError("");

        const [meRes, clientRes, artistRes] = await Promise.all([
          api.get("/user/me"),
          api.get("/user/me/orders/client"),
          api.get("/user/me/orders/artist").catch(() => []),
        ]);

        if (!cancelled) {
          setProfile(meRes);
          setClientOrders(Array.isArray(clientRes) ? clientRes : []);
          setArtistOrders(Array.isArray(artistRes) ? artistRes : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load dashboard.");
        }
      } finally {
        if (!cancelled) {
          setLoadingOrders(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <p>Loading...</p>
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
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const effectiveProfile = profile || user;
  const isCreator = effectiveProfile?.role === "creator" || effectiveProfile?.role === "admin";

  const displayName =
    effectiveProfile?.creator_username ||
    effectiveProfile?.username ||
    "User";

  const avatarUrl =
    effectiveProfile?.pfp_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5865f2&color=fff&size=80`;

  return (
    <div className="page">
      <div className="container">
        <div className="dashboard-profile-card">
          <div className="dpc-left">
            <div className="dpc-avatar-wrap">
              <img
                src={avatarUrl}
                alt={displayName}
                className="dpc-avatar"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5865f2&color=fff&size=80`;
                }}
              />
            </div>

            <div className="dpc-info">
              <div className="dpc-name-row">
                <h2 className="dpc-name">{displayName}</h2>
                {isCreator && <span className="creator-role-badge">Creator</span>}
              </div>
              <p className="dpc-email">{effectiveProfile?.email}</p>
              {effectiveProfile?.description && (
                <p className="dpc-bio">{effectiveProfile.description}</p>
              )}
              <div className="dpc-dates">
                <span>Member since {formatDate(effectiveProfile?.register_date)}</span>
              </div>
            </div>
          </div>

          <div className="dpc-actions">
            <Link to="/profile/edit" className="btn btn-secondary btn-small">
              Edit Profile
            </Link>

            {isCreator && effectiveProfile?.user_id && (
              <Link
                to={`/creator/${effectiveProfile.user_id}`}
                className="btn btn-secondary btn-small"
              >
                My Creator Page
              </Link>
            )}
          </div>
        </div>

        {isCreator && <StripeOnboardingBanner />}

        {!isCreator && (
          <div className="become-creator-cta">
            <div className="bc-cta-text">
              <span className="bc-cta-icon">🎨</span>
              <div>
                <strong>Want to accept commissions?</strong>
                <p>Set up a creator profile and start receiving requests.</p>
              </div>
            </div>

            <Link to="/become-creator" className="btn btn-primary btn-small">
              Become a Creator
            </Link>
          </div>
        )}

        <div className="dashboard-stats">
          <div className="dashboard-stat-card">
            <span className="dashboard-stat-value">{clientOrders.length}</span>
            <span className="dashboard-stat-label">Orders as Client</span>
          </div>

          <div className="dashboard-stat-card">
            <span className="dashboard-stat-value">
              {clientOrders.filter((o) => o.status === "completed").length}
            </span>
            <span className="dashboard-stat-label">Completed</span>
          </div>

          <div className="dashboard-stat-card">
            <span className="dashboard-stat-value">
              {clientOrders.filter((o) => o.status === "received").length}
            </span>
            <span className="dashboard-stat-label">Received</span>
          </div>

          {isCreator && (
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-value">{artistOrders.length}</span>
              <span className="dashboard-stat-label">Orders as Artist</span>
            </div>
          )}
        </div>

        <div className="dashboard-tabs">
          <button
            className={`dashboard-tab ${activeTab === "client" ? "dashboard-tab--active" : ""}`}
            onClick={() => setActiveTab("client")}
          >
            My Orders
            <span className="dashboard-tab-count">{clientOrders.length}</span>
          </button>

          {isCreator && (
            <button
              className={`dashboard-tab ${activeTab === "artist" ? "dashboard-tab--active" : ""}`}
              onClick={() => setActiveTab("artist")}
            >
              Received Orders
              <span className="dashboard-tab-count">{artistOrders.length}</span>
            </button>
          )}
        </div>

        <div className="dashboard-content">
          {loadingOrders ? (
            <div className="empty-state">
              <p>Loading orders...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p>{error}</p>
            </div>
          ) : activeTab === "client" ? (
            <OrderList
              orders={[...clientOrders].reverse()}
              role="client"
              emptyMessage="You have not submitted any requests yet."
            />
          ) : (
            <OrderList
              orders={[...artistOrders].reverse()}
              role="artist"
              emptyMessage="You have not received any orders yet."
            />
          )}
        </div>
      </div>
    </div>
  );
}