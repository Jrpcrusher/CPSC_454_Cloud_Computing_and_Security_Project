import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/apiClient";

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function PublicImageDetail() {
  const { userId, imageId } = useParams();

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
              to={`/creator/${userId}`}
              className="btn btn-primary"
              style={{ marginTop: "1rem" }}
            >
              Back to Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const imageSrc =
    image.image_url || `/home/profiles/${userId}/images/${image.image_id}`;

  const artistName = image.artist?.username || "Unknown";
  const description = image.description || "No description provided.";

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
                  Public Artwork
                </p>
                <h1 className="page-title" style={{ margin: "0.35rem 0 0 0" }}>
                  {artistName}'s Image
                </h1>
              </div>

              <Link to={`/creator/${userId}`} className="btn btn-secondary btn-small">
                Back to Profile
              </Link>
            </div>

            <section
              className="profile-section"
              style={{
                padding: "1rem",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: "950px",
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "#1f2125",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
                }}
              >
                <img
                  src={imageSrc}
                  alt={description}
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: "72vh",
                    objectFit: "contain",
                    background: "#1f2125",
                  }}
                />
              </div>
            </section>

            <section
              className="profile-section"
              style={{
                maxWidth: "950px",
                margin: "0 auto",
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: "1.25rem",
                  gridTemplateColumns: "2fr 1fr 1fr",
                }}
              >
                <div>
                  <h2 className="profile-section-title" style={{ marginBottom: "0.75rem" }}>
                    Description
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: "#b5bac1",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {description}
                  </p>
                </div>

                <div>
                  <h2 className="profile-section-title" style={{ marginBottom: "0.75rem" }}>
                    Artist
                  </h2>
                  <p style={{ margin: 0, color: "#b5bac1" }}>{artistName}</p>
                </div>

                <div>
                  <h2 className="profile-section-title" style={{ marginBottom: "0.75rem" }}>
                    Uploaded
                  </h2>
                  <p style={{ margin: 0, color: "#b5bac1" }}>
                    {formatDate(image.upload_date)}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}