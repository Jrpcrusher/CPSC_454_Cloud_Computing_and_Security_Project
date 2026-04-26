import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/apiClient";

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminUserImages() {
  const { userId } = useParams();

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadImages() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await api.get(`/admin/users/${userId}/images`);
      setImages(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || "Failed to load user images.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadImages();
  }, [userId]);

  async function handleDelete(imageId) {
    const confirmed = window.confirm("Are you sure you want to delete this image?");
    if (!confirmed) return;

    try {
      setDeletingId(imageId);
      setError("");
      setMessage("");

      await api.delete(`/admin/users/${userId}/images/${imageId}`);
      setImages((prev) => prev.filter((img) => img.image_id !== imageId));
      setMessage("Image deleted.");
    } catch (err) {
      setError(err.message || "Failed to delete image.");
    } finally {
      setDeletingId(null);
    }
  }

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
                  Admin User Images
                </p>
                <h1 className="page-title" style={{ margin: "0.35rem 0 0 0" }}>
                  User Images
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

          <section className="profile-section">
            <h2 className="profile-section-title">Images</h2>

            {loading ? (
              <div className="empty-state" style={{ marginTop: "1rem" }}>
                <p>Loading images...</p>
              </div>
            ) : images.length === 0 ? (
              <div className="empty-state" style={{ marginTop: "1rem" }}>
                <p>This user has no images.</p>
              </div>
            ) : (
              <div className="portfolio-grid" style={{ marginTop: "1rem" }}>
                {images.map((img) => {
                  const imageId = img.image_id;
                  const src =
                    img.image_url || `/admin/users/${userId}/images/${imageId}`;

                  return (
                    <div className="portfolio-item" key={imageId}>
                      <Link to={`/admin/users/${userId}/images/${imageId}`}>
                        <img
                          src={src}
                          alt={img.description || "User image"}
                          className="portfolio-img"
                          style={{ cursor: "pointer" }}
                        />
                      </Link>

                      <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.35rem" }}>
                        {img.description && (
                          <p style={{ margin: 0, color: "#b5bac1" }}>{img.description}</p>
                        )}

                        <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
                          Uploaded: {formatDate(img.upload_date)}
                        </p>

                        <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
                          Artist: {img.artist?.username || "Unknown"}
                        </p>

                        <div
                          style={{
                            marginTop: "0.5rem",
                            display: "flex",
                            gap: "0.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <Link
                            to={`/admin/users/${userId}/images/${imageId}`}
                            className="btn btn-secondary btn-small"
                          >
                            View
                          </Link>

                          <button
                            className="btn btn-secondary btn-small"
                            style={{ background: "#ed4245", color: "#fff" }}
                            onClick={() => handleDelete(imageId)}
                            disabled={deletingId === imageId}
                          >
                            {deletingId === imageId ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}