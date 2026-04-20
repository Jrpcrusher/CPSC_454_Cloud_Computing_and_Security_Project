import { Link } from "react-router-dom";

export default function CreatorCard({ creator }) {
  const { username, displayName, avatar, bio, tags = [], tiers = [], stats = {} } = creator;
  const hasTiers = tiers.length > 0;
  const startingPrice = hasTiers ? Math.min(...tiers.map((t) => t.price)) : null;

  return (
    <div className="creator-card">
      <div className="creator-card-header">
        <img
          src={avatar}
          alt={displayName}
          className="creator-card-avatar"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${displayName}&background=5865f2&color=fff&size=80`;
          }}
        />
        <div className="creator-card-meta">
          <h3 className="creator-card-name">{displayName}</h3>
          <span className="creator-card-handle">@{username}</span>
        </div>
      </div>

      <p className="creator-card-bio">{bio}</p>

      {tags.length > 0 && (
        <div className="creator-card-tags">
          {tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="creator-card-stats">
        <div className="creator-stat">
          <span className="creator-stat-value">⭐ {stats.rating ?? "New"}</span>
          <span className="creator-stat-label">Rating</span>
        </div>
        <div className="creator-stat">
          <span className="creator-stat-value">{stats.completedRequests ?? 0}</span>
          <span className="creator-stat-label">Completed</span>
        </div>
        <div className="creator-stat">
          <span className="creator-stat-value">{stats.responseTime ?? "TBD"}</span>
          <span className="creator-stat-label">Avg. Response</span>
        </div>
      </div>

      <div className="creator-card-footer">
        {hasTiers ? (
          <span className="creator-card-price">From ${startingPrice}</span>
        ) : (
          <span className="creator-card-price">Contact for pricing</span>
        )}
        <Link to={`/creator/${username}`} className="btn btn-primary btn-small">
          View Profile →
        </Link>
      </div>
    </div>
  );
}
