import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/apiClient";

export default function AdminPermissions() {
  const { userId } = useParams();

  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadPermissions() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await api.get(`/admin/users/${userId}/permissions`);
      setPermissions(res);
    } catch (err) {
      setError(err.message || "Failed to load permissions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPermissions();
  }, [userId]);

  async function handleTogglePermission() {
    try {
      setUpdating(true);
      setError("");
      setMessage("");

      await api.patch(`/admin/users/${userId}/permissions`);
      await loadPermissions();
      setMessage("Permissions updated.");
    } catch (err) {
      setError(err.message || "Failed to update permissions.");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <p>Loading permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !permissions) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>Permissions not available</h2>
            <p>{error}</p>
            <Link
              to={`/admin/users/${userId}`}
              className="btn btn-primary"
              style={{ marginTop: "1rem" }}
            >
              Back to User
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const avatarUrl =
    permissions?.pfp_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      permissions?.username || "User"
    )}&background=5865f2&color=fff&size=120`;

  const currentRole = permissions?.role || "unknown";
  const nextRole =
    currentRole === "admin"
      ? "user"
      : "admin";

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
                  Admin Permissions
                </p>
                <h1 className="page-title" style={{ margin: "0.35rem 0 0 0" }}>
                  {permissions?.username || "User"}
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

          <div
            style={{
              display: "grid",
              gap: "1.5rem",
              gridTemplateColumns: "1.2fr 1fr",
              alignItems: "start",
            }}
          >
            <section className="profile-section">
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <img
                  src={avatarUrl}
                  alt={permissions?.username || "User"}
                  style={{
                    width: "96px",
                    height: "96px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "#1f2125",
                  }}
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      permissions?.username || "User"
                    )}&background=5865f2&color=fff&size=120`;
                  }}
                />

                <div style={{ flex: 1, minWidth: "240px" }}>
                  <h2 className="profile-section-title" style={{ marginBottom: "0.75rem" }}>
                    Permission Details
                  </h2>

                  <div
                    style={{
                      display: "grid",
                      gap: "0.6rem",
                      color: "#b5bac1",
                    }}
                  >
                    <div>
                      <strong>Username:</strong> {permissions?.username}
                    </div>
                    <div>
                      <strong>Current Role:</strong> {currentRole}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="profile-section">
              <h2 className="profile-section-title" style={{ marginBottom: "0.75rem" }}>
                Actions
              </h2>

              <p style={{ color: "#b5bac1", marginBottom: "1rem" }}>
                This backend route toggles the user's permission level.
              </p>

              <button
                className="btn btn-primary"
                onClick={handleTogglePermission}
                disabled={updating}
              >
                {updating ? "Updating..." : `Change role to ${nextRole}`}
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}