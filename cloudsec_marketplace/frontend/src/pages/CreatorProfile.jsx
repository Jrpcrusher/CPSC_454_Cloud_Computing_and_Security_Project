import { useParams, Link, useNavigate } from "react-router-dom";
import { getCreatorByUsername } from "../data/creators";
import { useAuth } from "../context/AuthContext";
import ProtectedImage from "../components/ProtectedImage";

export default function CreatorProfile() {
  const { username } = useParams();
  const creator = getCreatorByUsername(username);
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!creator) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>Creator not found</h2>
            <p>We couldn't find a creator with that username.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { displayName, avatar, banner, bio, tags, tiers, stats, portfolio } = creator;

  function handleRequestClick(tier) {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate(`/creator/${username}/request`, { state: { selectedTier: tier.name } });
  }

  return (
    <div className="profile-page">
      {/* Banner */}
      <div className="profile-banner">
        <img
          src={banner}
          alt=""
          className="profile-banner-img"
          onError={(e) => { e.target.style.display = "none"; }}
        />
      </div>

      <div className="container profile-container">
        {/* Profile header */}
        <div className="profile-header">
          <div className="profile-avatar-wrap">
            <img
              src={avatar}
              alt={displayName}
              className="profile-avatar"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${displayName}&background=5865f2&color=fff&size=120`;
              }}
            />
          </div>
          <div className="profile-header-info">
            <h1 className="profile-name">{displayName}</h1>
            <span className="profile-handle">@{username}</span>
            <div className="creator-card-tags" style={{ marginTop: "0.5rem" }}>
              {tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </div>
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat-value">⭐ {stats.rating}</span>
              <span className="profile-stat-label">Rating</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{stats.completedRequests}</span>
              <span className="profile-stat-label">Completed</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{stats.responseTime}</span>
              <span className="profile-stat-label">Response Time</span>
            </div>
          </div>
        </div>

        <div className="profile-body">
          {/* Left: bio + portfolio */}
          <div className="profile-main">
            <section className="profile-section">
              <h2 className="profile-section-title">About</h2>
              <p className="profile-bio">{bio}</p>
            </section>

            <section className="profile-section">
              <h2 className="profile-section-title">Portfolio</h2>
              <div className="portfolio-grid">
                {portfolio.map((src, i) => (
                  <div key={i} className="portfolio-item">
                    <ProtectedImage
                      src={src}
                      alt={`Portfolio piece ${i + 1}`}
                      creatorName={displayName}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right: commission tiers */}
          <aside className="profile-sidebar">
            <h2 className="profile-section-title">Commission Tiers</h2>
            <div className="tiers-list">
              {tiers.map((tier, i) => (
                <div
                  key={tier.name}
                  className={`tier-card ${i === 1 ? "tier-card--featured" : ""}`}
                >
                  {i === 1 && <span className="tier-badge">Most Popular</span>}
                  <div className="tier-header">
                    <span className="tier-name">{tier.name}</span>
                    <span className="tier-price">${tier.price}</span>
                  </div>
                  <ul className="tier-perks">
                    {tier.perks.map((perk) => (
                      <li key={perk} className="tier-perk">
                        <span className="tier-perk-check">✓</span> {perk}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`btn btn-block ${i === 1 ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => handleRequestClick(tier)}
                  >
                    Request This Tier
                  </button>
                </div>
              ))}
            </div>

            {!user && (
              <p className="profile-login-note">
                <Link to="/login" className="auth-link">Log in</Link> or{" "}
                <Link to="/signup" className="auth-link">sign up</Link> to submit a request.
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
