import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/apiClient";

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminImageDetail() {
  const { userId, imageId } = useParams();
  const navigate = useNavigate();

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      try {
        setLoading(true);
        setError("");
        setMessage("");

        const res = await api.get(`/admin/users/${userId}/images/${imageId}`);

        if (!cancelled) {
          setImage(res);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load image.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [userId, imageId]);

  async function handleDelete() {
    const confirmed = window.confirm("Are you sure you want to delete this image?");
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");
      setMessage("");

      await api.delete(`/admin/users/${userId}/images/${imageId}`);
      navigate(`/admin/users/${userId}/images`);
    } catch (err) {
      setError(err.message || "Failed to delete image.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <p>Loading image...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>Image not found</h2>
            <p>{error || "We could not load that image."}</p>
            <Link
              to={`/admin/users/${userId}/images`}
              className="btn btn-primary"
              style={{ marginTop: "1rem" }}
            >
              Back to User Images
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const imageSrc =
    image.image_url || `/admin/users/${userId}/images/${image.image_id}`;

  return (
    <div className="page">
      <div
        className="container"
        style={{
          paddingTop: "2rem",
          paddingBottom: "3rem",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: "1100px" }}>
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <section className="profile-section">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
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
                    Admin Image Detail
                  </p>
                  <h1 className="page-title" style={{ margin: "0.35rem 0 0 0" }}>
                    User Image
                  </h1>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <Link
                    to={`/admin/users/${userId}/images`}
                    className="btn btn-secondary btn-small"
                  >
                    Back to Images
                  </Link>

                  <button
                    className="btn btn-secondary btn-small"
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{ background: "#ed4245", color: "#fff" }}
                  >
                    {deleting ? "Deleting..." : "Delete Image"}
                  </button>
                </div>
              </div>
            </section>

            {error && <p className="form-error">{error}</p>}
            {message && <p style={{ color: "#4caf50" }}>{message}</p>}

            <div
              style={{
                display: "grid",
                gap: "1.5rem",
                gridTemplateColumns: "1.6fr 1fr",
                alignItems: "start",
              }}
            >
              <section className="profile-section">
                <h2 className="profile-section-title">Preview</h2>

                <div style={{ marginTop: "1rem" }}>
                  <img
                    src={imageSrc}
                    alt={image.description || "User image"}
                    style={{
                      width: "100%",
                      maxWidth: "900px",
                      maxHeight: "65vh",
                      objectFit: "contain",
                      borderRadius: "12px",
                      border: "1px solid #333",
                      background: "#1f2125",
                      display: "block",
                      margin: "0 auto",
                    }}
                  />
                </div>
              </section>

              <div style={{ display: "grid", gap: "1.5rem" }}>
                <section className="profile-section">
                  <h2 className="profile-section-title">Details</h2>

                  <div
                    style={{
                      marginTop: "1rem",
                      display: "grid",
                      gap: "0.75rem",
                      color: "#b5bac1",
                    }}
                  >
                    <div>
                      <strong>Description:</strong> {image.description || "No description"}
                    </div>

                    <div>
                      <strong>Uploaded:</strong> {formatDate(image.upload_date)}
                    </div>

                    <div>
                      <strong>Image ID:</strong> {image.image_id}
                    </div>
                  </div>
                </section>

                <section className="profile-section">
                  <h2 className="profile-section-title">Artist</h2>

                  <div
                    style={{
                      marginTop: "1rem",
                      display: "grid",
                      gap: "0.75rem",
                      color: "#b5bac1",
                    }}
                  >
                    <div>
                      <strong>Username:</strong> {image.artist?.username || "Unknown"}
                    </div>

                    <div>
                      <strong>Email:</strong> {image.artist?.email || "Unknown"}
                    </div>

                    <div>
                      <strong>User ID:</strong> {image.artist?.user_id || "Unknown"}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}