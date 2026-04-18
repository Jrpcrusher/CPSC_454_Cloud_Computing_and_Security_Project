import { useEffect } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { getCreatorByUsername } from "../data/creators";
import { useAuth } from "../context/AuthContext";
import { useRequests } from "../context/RequestContext";

export default function ArtRequest() {
  const { username } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const creator = getCreatorByUsername(username);
  const { user } = useAuth();
  const { submitRequest } = useRequests();

  // Silently redirect if the user tries to request from their own profile
  useEffect(() => {
    if (user?.creatorUsername === username) {
      navigate(`/creator/${username}`, { replace: true });
    }
  }, [user, username, navigate]);

  const defaultTier = location.state?.selectedTier || (creator?.tiers[0]?.name ?? "");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm({
    defaultValues: {
      tier: defaultTier,
    },
  });

  if (!creator) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>Creator not found</h2>
            <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>You need to be logged in</h2>
            <p>Please log in or create an account to request art.</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: "1rem" }}>Log In / Sign Up</Link>
          </div>
        </div>
      </div>
    );
  }

  function onSubmit(data) {
    submitRequest({
      creatorUsername: username,
      requesterEmail: user.email,
      ...data,
    });
  }

  if (isSubmitSuccessful) {
    return (
      <div className="page">
        <div className="container">
          <div className="success-panel">
            <div className="success-icon">🎉</div>
            <h2 className="success-title">Request Submitted!</h2>
            <p className="success-desc">
              Your request has been sent to <strong>{creator.displayName}</strong>.
              They'll review it and respond soon. You can track your request in the Dashboard.
            </p>
            <div className="success-actions">
              <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
              <Link to={`/creator/${username}`} className="btn btn-secondary">Back to Profile</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="request-form-layout">
          {/* Creator summary sidebar */}
          <aside className="request-creator-summary">
            <img
              src={creator.avatar}
              alt={creator.displayName}
              className="request-creator-avatar"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${creator.displayName}&background=5865f2&color=fff&size=80`;
              }}
            />
            <h3 className="request-creator-name">{creator.displayName}</h3>
            <span className="request-creator-handle">@{username}</span>
            <div className="creator-card-tags" style={{ marginTop: "0.75rem" }}>
              {creator.tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
            <div className="request-tier-preview">
              <h4 className="request-tier-preview-title">Available Tiers</h4>
              {creator.tiers.map((t) => (
                <div key={t.name} className="request-tier-preview-row">
                  <span>{t.name}</span>
                  <span className="tier-price-inline">${t.price}</span>
                </div>
              ))}
            </div>
            <Link to={`/creator/${username}`} className="btn btn-secondary btn-block" style={{ marginTop: "1rem" }}>
              ← Back to Profile
            </Link>
          </aside>

          {/* Request form */}
          <div className="request-form-main">
            <h1 className="page-title">Request Art from {creator.displayName}</h1>
            <p className="request-form-sub">
              Be as detailed as possible — the more info you provide, the better the result.
            </p>

            <form className="request-form" onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Tier selection */}
              <div className="form-group">
                <label className="form-label" htmlFor="tier">Commission Tier *</label>
                <select
                  id="tier"
                  className="form-input"
                  {...register("tier", { required: "Please select a tier" })}
                >
                  {creator.tiers.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} — ${t.price}
                    </option>
                  ))}
                </select>
                {errors.tier && <p className="form-error">{errors.tier.message}</p>}
              </div>

              {/* Request title */}
              <div className="form-group">
                <label className="form-label" htmlFor="title">Request Title *</label>
                <input
                  id="title"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Fantasy warrior OC full body"
                  {...register("title", {
                    required: "Please give your request a title",
                    minLength: { value: 5, message: "Title must be at least 5 characters" },
                  })}
                />
                {errors.title && <p className="form-error">{errors.title.message}</p>}
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label" htmlFor="description">
                  Description *
                  <span className="form-label-hint"> (describe your character, scene, mood, colors, etc.)</span>
                </label>
                <textarea
                  id="description"
                  className="form-input form-textarea"
                  placeholder="Describe your character's appearance, personality, the scene you'd like, color palette preferences, mood/tone, etc."
                  rows={5}
                  {...register("description", {
                    required: "A description is required",
                    minLength: { value: 20, message: "Please provide at least 20 characters of detail" },
                  })}
                />
                {errors.description && <p className="form-error">{errors.description.message}</p>}
              </div>

              {/* Reference links */}
              <div className="form-group">
                <label className="form-label" htmlFor="referenceLinks">
                  Reference Links
                  <span className="form-label-hint"> (optional — paste image URLs, Pinterest boards, etc.)</span>
                </label>
                <input
                  id="referenceLinks"
                  type="text"
                  className="form-input"
                  placeholder="https://example.com/reference1, https://..."
                  {...register("referenceLinks")}
                />
              </div>

              {/* Character count */}
              <div className="form-group">
                <label className="form-label" htmlFor="characterCount">Number of Characters</label>
                <select
                  id="characterCount"
                  className="form-input"
                  {...register("characterCount")}
                >
                  <option value="1">1 character</option>
                  <option value="2">2 characters</option>
                  <option value="3">3 characters</option>
                  <option value="4+">4+ characters (contact first)</option>
                </select>
              </div>

              {/* Deadline */}
              <div className="form-group">
                <label className="form-label" htmlFor="deadline">
                  Preferred Deadline
                  <span className="form-label-hint"> (optional — creators may not always accommodate)</span>
                </label>
                <input
                  id="deadline"
                  type="date"
                  className="form-input"
                  min={new Date().toISOString().split("T")[0]}
                  {...register("deadline")}
                />
              </div>

              {/* Additional notes */}
              <div className="form-group">
                <label className="form-label" htmlFor="notes">Additional Notes</label>
                <textarea
                  id="notes"
                  className="form-input form-textarea"
                  placeholder="Anything else you'd like the creator to know..."
                  rows={3}
                  {...register("notes")}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-large"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Art Request →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
