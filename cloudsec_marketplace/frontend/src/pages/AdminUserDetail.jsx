import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../services/apiClient";

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/admin/users/${userId}`);

        if (!cancelled) {
          setUser(res);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load user.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleDelete() {
    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      await api.delete(`/admin/users/${userId}`);
      navigate("/admin/users");
    } catch (err) {
      setError(err.message || "Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <p>Loading user...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>User not found</h2>
            <p>{error || "We could not load that user."}</p>
            <Link to="/admin/users" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Back to Admin Users
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const avatarUrl =
    user.pfp_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.username || "User"
    )}&background=5865f2&color=fff&size=120`;

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
                  Admin User Detail
                </p>
                <h1 className="page-title" style={{ margin: "0.35rem 0 0 0" }}>
                  {user.username}
                </h1>
              </div>

              <Link to="/admin/users" className="btn btn-secondary btn-small">
                Back to Users
              </Link>
            </div>
          </section>

          {error && <p className="form-error">{error}</p>}

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
                  alt={user.username}
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
                      user.username || "User"
                    )}&background=5865f2&color=fff&size=120`;
                  }}
                />

                <div style={{ flex: 1, minWidth: "240px" }}>
                  <h2 className="profile-section-title" style={{ marginBottom: "0.75rem" }}>
                    User Information
                  </h2>

                  <div
                    style={{
                      display: "grid",
                      gap: "0.6rem",
                      color: "#b5bac1",
                    }}
                  >
                    <div>
                      <strong>Username:</strong> {user.username}
                    </div>
                    <div>
                      <strong>Email:</strong> {user.email}
                    </div>
                    <div>
                      <strong>User ID:</strong> {user.user_id}
                    </div>
                    <div>
                      <strong>Role:</strong> {user.role}
                    </div>
                    <div>
                      <strong>Registered:</strong> {formatDate(user.register_date)}
                    </div>
                    <div>
                      <strong>Description:</strong> {user.description || "No description"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="profile-section">
              <h2 className="profile-section-title" style={{ marginBottom: "0.75rem" }}>
                Admin Actions
              </h2>

              <div style={{ display: "grid", gap: "0.75rem" }}>
                <Link
                  to={`/admin/users/${user.user_id}/permissions`}
                  className="btn btn-secondary"
                >
                  View Permissions
                </Link>

                <Link
                  to={`/admin/users/${user.user_id}/images`}
                  className="btn btn-secondary"
                >
                  View Images
                </Link>

                <Link
                  to={`/admin/users/${user.user_id}/orders`}
                  className="btn btn-secondary"
                >
                  View Orders
                </Link>

                <button
                  className="btn btn-secondary"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ background: "#ed4245", color: "#fff" }}
                >
                  {deleting ? "Deleting..." : "Delete User"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}