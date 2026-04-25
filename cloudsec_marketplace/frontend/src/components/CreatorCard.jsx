import { Link } from "react-router-dom";

export default function CreatorCard({ creator }) {
  const displayName =
    creator.creator_username || creator.username || `User ${creator.user_id}`;

  const avatarUrl =
    creator.pfp_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5865f2&color=fff&size=80`;

  const description = creator.description || "No description provided.";

  return (
    <div className="creator-card">
      <div className="creator-card-header">
        <img
          src={avatarUrl}
          alt={displayName}
          className="creator-card-avatar"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5865f2&color=fff&size=80`;
          }}
        />
        <div className="creator-card-meta">
          <h3 className="creator-card-name">{displayName}</h3>
          {creator.username && (
            <span className="creator-card-handle">@{creator.username}</span>
          )}
        </div>
      </div>

      <p className="creator-card-bio">{description}</p>

      <div className="creator-card-footer">
        <Link
          to={`/creator/${creator.user_id}`}
          className="btn btn-primary btn-small"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
}