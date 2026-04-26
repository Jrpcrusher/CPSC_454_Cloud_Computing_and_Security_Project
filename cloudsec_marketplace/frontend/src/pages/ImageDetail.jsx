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

export default function ImageDetail() {
  const { imageId } = useParams();
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

        const res = await api.get(`/user/me/images/${imageId}`);

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
  }, [imageId]);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this image?"
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");
      setMessage("");

      await api.delete(`/user/me/images/${imageId}`);
      navigate("/dashboard/portfolio");
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
              to="/dashboard/portfolio"
              className="btn btn-primary"
              style={{ marginTop: "1rem" }}
            >
              Back to Portfolio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const imageSrc = image.image_url || `/user/me/images/${image.image_id}`;

  return (
    <div className="page">
      <div
        className="container"
        style={{ paddingTop: "2rem", paddingBottom: "2rem" }}
      >
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
                <h1 className="page-title" style={{ marginBottom: "0.5rem" }}>
                  Image Detail
                </h1>
                <p style={{ color: "#888", margin: 0 }}>
                  Image ID: {image.image_id}
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <Link to="/dashboard/portfolio" className="btn btn-secondary btn-small">
                  Back to Portfolio
                </Link>

                <button
                  className="btn btn-secondary btn-small"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete Image"}
                </button>
              </div>
            </div>
          </section>

          <div
            style={{
              display: "grid",
              gap: "1.5rem",
              gridTemplateColumns: "2fr 1fr",
            }}
          >
            <section className="profile-section">
              <h2 className="profile-section-title">Preview</h2>

              <div style={{ marginTop: "1rem" }}>
                <img
                  src={imageSrc}
                  alt={image.description || "Portfolio image"}
                  style={{
                    width: "100%",
                    maxHeight: "70vh",
                    objectFit: "contain",
                    borderRadius: "12px",
                    border: "1px solid #333",
                    background: "#1f2125",
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
                    <strong>Description:</strong>{" "}
                    {image.description || "No description"}
                  </div>

                  <div>
                    <strong>Uploaded:</strong> {formatDate(image.upload_date)}
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
                    <strong>Username:</strong>{" "}
                    {image.artist?.username || "Unknown"}
                  </div>
                </div>
              </section>
            </div>
          </div>

          {message && <p style={{ color: "#4caf50" }}>{message}</p>}
        </div>
      </div>
    </div>
  );
}