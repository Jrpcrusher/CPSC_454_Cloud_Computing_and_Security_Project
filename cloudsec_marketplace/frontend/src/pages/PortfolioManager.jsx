import { useEffect, useRef, useState } from "react";
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

  const fileInputRef = useRef(null);

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

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
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
              <div
                style={{
                  display: "grid",
                  gap: "1rem",
                  padding: "1rem",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div>
                  <label className="form-label">Upload New Image</label>

                  <input
                    ref={fileInputRef}
                    id="portfolio-upload-input"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
                  />

                  <div
                    style={{
                      marginTop: "0.5rem",
                      display: "flex",
                      gap: "0.75rem",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose Image
                    </button>

                    <span style={{ color: file ? "#fff" : "#888", fontSize: "0.95rem" }}>
                      {file ? file.name : "No file selected"}
                    </span>
                  </div>

                  <p style={{ color: "#888", fontSize: "0.85rem", marginTop: "0.6rem" }}>
                    Upload one image at a time. Supported formats depend on the browser.
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
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

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: "#888", fontSize: "0.85rem" }}>
                    {description.length} / 500 characters
                  </span>

                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={uploading || !file}
                  >
                    {uploading ? "Uploading..." : "Upload Image"}
                  </button>
                </div>
              </div>
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
                  const src = img.image_url || `/user/me/images/${imageId}`;

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