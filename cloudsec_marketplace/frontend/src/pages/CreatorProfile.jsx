import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/apiClient";

export default function CreatorProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const profileRes = await api.get(`/home/profiles/${userId}`);
        const imagesRes = await api.get(`/home/profiles/${userId}/images`);

        if (!cancelled) {
          setProfile(profileRes);
          setImages(Array.isArray(imagesRes) ? imagesRes : []);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load creator profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <p style={{ padding: "2rem" }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>Profile not found</h2>
            <p>{error || "We could not find that creator."}</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    profile.creator_username ||
    profile.username ||
    `User ${profile.user_id}`;

  const description =
    profile.description ||
    "This creator has not added a description yet.";

  const avatarUrl =
    profile.pfp_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5865f2&color=fff&size=120`;

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
        <div className="profile-header" style={{ marginBottom: "2rem" }}>
          <div className="profile-avatar-wrap">
            <img
              src={avatarUrl}
              alt={displayName}
              className="profile-avatar"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5865f2&color=fff&size=120`;
              }}
            />
          </div>

          <div className="profile-header-info">
            <h1 className="profile-name">{displayName}</h1>
            {profile.username && (
              <p style={{ color: "#888", marginTop: "0.25rem" }}>
                @{profile.username}
              </p>
            )}
            <p className="profile-bio" style={{ marginTop: "1rem" }}>
              {description}
            </p>
          </div>
        </div>

        <div className="profile-body" style={{ display: "grid", gap: "2rem" }}>
          <section className="profile-section">
            <h2 className="profile-section-title">Images</h2>

            {images.length === 0 ? (
              <div className="empty-state" style={{ marginTop: "1rem" }}>
                This creator has not uploaded any images yet.
              </div>
            ) : (
              <div className="portfolio-grid" style={{ marginTop: "1rem" }}>
                {images.map((image) => {
                  const imageId = image.image_id ?? image.id;
                  const imageSrc =
                    image.image_url ||
                    image.url ||
                    `/home/profiles/${userId}/images/${imageId}`;

                  return (
                    <div key={imageId} className="portfolio-item">
                      <img
                        src={imageSrc}
                        alt={image.description || `Artwork ${imageId}`}
                        className="portfolio-img"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="profile-section">
            <h2 className="profile-section-title">Request a Commission</h2>

            {!user ? (
              <p style={{ marginTop: "1rem" }}>
                <Link to="/login" className="auth-link">Log in</Link> or{" "}
                <Link to="/signup" className="auth-link">sign up</Link> to request artwork.
              </p>
            ) : user.user_id === profile.user_id ? (
              <div className="empty-state" style={{ marginTop: "1rem" }}>
                You cannot request a commission from yourself.
              </div>
            ) : (
              <div style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate(`/creator/${userId}/request`)}
                >
                  Request Commission
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}