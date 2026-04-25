import { useEffect, useState } from "react";
import api from "../services/apiClient";

export default function PortfolioManager() {
  const [images, setImages] = useState([]);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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
          setError(err.message || "Failed to load portfolio.");
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
      await loadImages();
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(imageId) {
    try {
      setError("");
      setMessage("");
      await api.delete(`/user/me/images/${imageId}`);
      setMessage("Image deleted.");
      await loadImages();
    } catch (err) {
      setError(err.message || "Delete failed.");
    }
  }

  return (
    <div className="page-shell">
      <h1>Manage Portfolio</h1>

      {error && <p className="form-error">{error}</p>}
      {message && <p>{message}</p>}

      <form className="card" onSubmit={handleUpload}>
        <h2>Upload New Image</h2>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />

        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button className="btn btn-primary" type="submit" disabled={uploading || !file}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {loading ? (
        <p>Loading portfolio...</p>
      ) : images.length === 0 ? (
        <p>You have not uploaded any portfolio images yet.</p>
      ) : (
        <div className="image-grid">
          {images.map((img) => {
            const imageId = img.image_id ?? img.id;
            const src =
              img.image_url || img.url || `/user/me/images/${imageId}`;

            return (
              <div className="image-card" key={imageId}>
                <img src={src} alt={img.description || "Portfolio image"} />
                {img.description && <p>{img.description}</p>}

                <button
                  className="btn btn-secondary"
                  onClick={() => handleDelete(imageId)}
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}