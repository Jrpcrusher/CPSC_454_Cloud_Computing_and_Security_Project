import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/apiClient";

export default function CreatorImageDetail() {
  const { userId, imageId } = useParams();
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/home/profiles/${userId}/images/${imageId}`);
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

  if (loading) {
    return <p>Loading image...</p>;
  }

  if (error || !image) {
    return (
      <div className="page-shell">
        <h2>Image not found</h2>
        <p>{error || "We could not load that image."}</p>
        <Link to={`/creator/${userId}`} className="btn btn-secondary">
          Back to creator
        </Link>
      </div>
    );
  }

  const src =
    image.image_url || image.url || `/home/profiles/${userId}/images/${imageId}`;

  return (
    <div className="page-shell">
      <Link to={`/creator/${userId}`} className="btn btn-secondary">
        Back to creator
      </Link>

      <div className="card">
        <img src={src} alt={image.description || "Creator artwork"} />
        {image.description && <p>{image.description}</p>}
      </div>
    </div>
  );
}