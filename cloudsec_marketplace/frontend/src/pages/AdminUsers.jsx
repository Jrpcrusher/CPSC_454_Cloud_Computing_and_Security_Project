import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/apiClient";

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/admin/users");
      setUsers(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleSearch(e) {
    e.preventDefault();

    if (!search.trim()) {
      loadUsers();
      return;
    }

    try {
      setSearching(true);
      setError("");

      const res = await api.get(`/admin/users/search?q=${encodeURIComponent(search)}`);
      setUsers(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function handleDelete(userId) {
    const confirm = window.confirm("Are you sure you want to delete this user?");
    if (!confirm) return;

    try {
      setDeletingId(userId);
      setError("");

      await api.delete(`/admin/users/${userId}`);

      // remove from UI
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
    } catch (err) {
      setError(err.message || "Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <section className="profile-section">
            <h1 className="page-title" style={{ marginBottom: "1rem" }}>
              Admin: Users
            </h1>

            {error && <p className="form-error">{error}</p>}

            {/* Search */}
            <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.75rem" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="btn btn-primary" type="submit" disabled={searching}>
                {searching ? "Searching..." : "Search"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearch("");
                  loadUsers();
                }}
              >
                Reset
              </button>
            </form>
          </section>

          {/* User list */}
          <section className="profile-section">
            <h2 className="profile-section-title">All Users</h2>

            {loading ? (
              <div className="empty-state">
                <p>Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="empty-state">
                <p>No users found.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
                {users.map((user) => (
                  <div key={user.user_id} className="request-card">
                    <div className="request-card-header">
                      <div>
                        <h3 className="request-card-title">
                          {user.username}
                        </h3>
                        <p className="request-card-subtitle">
                          {user.email}
                        </p>
                      </div>

                      <span className={`request-status request-status--${user.role}`}>
                        {user.role}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: "1rem",
                        display: "grid",
                        gap: "0.4rem",
                        color: "#b5bac1",
                        fontSize: "0.9rem",
                      }}
                    >
                      <div>
                        <strong>User ID:</strong> {user.user_id}
                      </div>
                      <div>
                        <strong>Registered:</strong> {formatDate(user.register_date)}
                      </div>
                      {user.description && (
                        <div>
                          <strong>Description:</strong> {user.description}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: "1rem",
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <Link
                        to={`/admin/users/${user.user_id}`}
                        className="btn btn-secondary btn-small"
                      >
                        View
                      </Link>

                      <Link
                        to={`/admin/users/${user.user_id}/permissions`}
                        className="btn btn-secondary btn-small"
                      >
                        Permissions
                      </Link>

                      <Link
                        to={`/admin/users/${user.user_id}/images`}
                        className="btn btn-secondary btn-small"
                      >
                        Images
                      </Link>

                      <Link
                        to={`/admin/users/${user.user_id}/orders`}
                        className="btn btn-secondary btn-small"
                      >
                        Orders
                      </Link>

                      <button
                        className="btn btn-secondary btn-small"
                        style={{ background: "#ed4245", color: "#fff" }}
                        onClick={() => handleDelete(user.user_id)}
                        disabled={deletingId === user.user_id}
                      >
                        {deletingId === user.user_id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}