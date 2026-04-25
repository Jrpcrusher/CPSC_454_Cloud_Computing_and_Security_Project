import { useEffect, useState } from "react";
import api from "../services/apiClient";

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PortfolioManager() {
  const [images, setImages] = useState([]);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadImages() {
    const res = await api.get("/user/me/images");
    setImages(Array.isArray(res) ? res : []);
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/user/me/images");

        if (!cancelled) {
          setImages(Array.isArray(res) ? res : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load portfolio images.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpload(e) {
    e.preventDefault();

    if (!file) return;

    try {
      setUploading(true);
      setError("");
      setMessage("");

      const formData = new FormData();
      formData.append("image", file);

      if (description.trim()) {
        formData.append("description", description.trim());
      }

      await api.post("/user/me/images/upload", formData);

      setMessage("Image uploaded.");
      setDescription("");
      setFile(null);

      const fileInput = document.getElementById("portfolio-upload-input");
      if (fileInput) {
        fileInput.value = "";
      }

      await loadImages();
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(imageId) {
    try {
      setDeletingId(imageId);
      setError("");
      setMessage("");

      await api.delete(`/user/me/images/${imageId}`);

      setMessage("Image deleted.");
      await loadImages();
    } catch (err) {
      setError(err.message || "Delete failed.");
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
              Manage Portfolio
            </h1>

            {error && <p className="form-error">{error}</p>}
            {message && <p style={{ color: "#4caf50" }}>{message}</p>}

            <form className="request-form" onSubmit={handleUpload} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="portfolio-upload-input">
                  Upload New Image
                </label>
                <input
                  id="portfolio-upload-input"
                  type="file"
                  accept="image/*"
                  className="form-input"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="portfolio-description">
                  Description
                  <span className="form-label-hint"> (optional)</span>
                </label>
                <input
                  id="portfolio-description"
                  type="text"
                  className="form-input"
                  placeholder="Optional image description"
                  value={description}
                  maxLength={500}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={uploading || !file}
              >
                {uploading ? "Uploading..." : "Upload Image"}
              </button>
            </form>
          </section>

          <section className="profile-section">
            <h2 className="profile-section-title">My Images</h2>

            {loading ? (
              <div className="empty-state" style={{ marginTop: "1rem" }}>
                <p>Loading portfolio...</p>
              </div>
            ) : images.length === 0 ? (
              <div className="empty-state" style={{ marginTop: "1rem" }}>
                <p>You have not uploaded any portfolio images yet.</p>
              </div>
            ) : (
              <div className="portfolio-grid" style={{ marginTop: "1rem" }}>
                {images.map((img) => {
                  const imageId = img.image_id;
                  const src =
                    img.image_url || `/user/me/images/${imageId}`;

                  return (
                    <div className="portfolio-item" key={imageId}>
                      <img
                        src={src}
                        alt={img.description || "Portfolio image"}
                        className="portfolio-img"
                      />

                      <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.35rem" }}>
                        {img.description && (
                          <p style={{ margin: 0, color: "#b5bac1" }}>{img.description}</p>
                        )}

                        <p style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>
                          Uploaded: {formatDate(img.upload_date)}
                        </p>

                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => handleDelete(imageId)}
                          disabled={deletingId === imageId}
                          style={{ marginTop: "0.5rem" }}
                        >
                          {deletingId === imageId ? "Deleting..." : "Delete"}
                        </button>
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