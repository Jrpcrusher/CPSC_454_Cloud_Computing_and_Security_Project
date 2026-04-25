import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import api from "../services/apiClient";

export default function ArtRequest() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [creator, setCreator] = useState(null);
  const [creatorLoading, setCreatorLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      order_details: "",
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCreator() {
      try {
        setCreatorLoading(true);
        const res = await api.get(`/home/profiles/${userId}`);

        if (!cancelled) {
          setCreator(res);
        }
      } catch {
        if (!cancelled) {
          setCreator(null);
        }
      } finally {
        if (!cancelled) {
          setCreatorLoading(false);
        }
      }
    }

    loadCreator();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (creatorLoading) {
    return (
      <div className="page">
        <div className="container">
          <p style={{ padding: "2rem", color: "#888" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>Creator not found</h2>
            <p>We could not find that creator profile.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Back to Home
            </Link>
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
            <Link to="/login" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = user.user_id === creator.user_id;

  if (isOwnProfile) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>This is your own profile</h2>
            <p>You cannot submit a commission request to yourself.</p>
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

  const displayName =
    creator.creator_username || creator.username || `User ${creator.user_id}`;

  const avatarUrl =
    creator.pfp_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5865f2&color=fff&size=80`;

  async function onSubmit(data) {
    try {
      setSubmitError("");

      await api.post(`/home/profiles/${userId}/request`, {
        order_details: data.order_details,
      });

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Failed to submit request.");
    }
  }

  if (submitted) {
    return (
      <div className="page">
        <div className="container">
          <div className="success-panel">
            <div className="success-icon">🎉</div>
            <h2 className="success-title">Request Submitted</h2>
            <p className="success-desc">
              Your request was sent to <strong>{displayName}</strong>.
            </p>
            <div className="success-actions">
              <Link to="/dashboard" className="btn btn-primary">
                Go to Dashboard
              </Link>
              <Link to={`/creator/${userId}`} className="btn btn-secondary">
                Back to Profile
              </Link>
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
          <aside className="request-creator-summary">
            <img
              src={avatarUrl}
              alt={displayName}
              className="request-creator-avatar"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5865f2&color=fff&size=80`;
              }}
            />
            <h3 className="request-creator-name">{displayName}</h3>

            {creator.username && (
              <span className="request-creator-handle">@{creator.username}</span>
            )}

            <p style={{ marginTop: "1rem", color: "#b5bac1" }}>
              {creator.description || "No description provided."}
            </p>

            <Link
              to={`/creator/${userId}`}
              className="btn btn-secondary btn-block"
              style={{ marginTop: "1rem" }}
            >
              Back to Profile
            </Link>
          </aside>

          <div className="request-form-main">
            <h1 className="page-title">Request Art from {displayName}</h1>
            <p className="request-form-sub">
              Describe the artwork you want as clearly as possible.
            </p>

            {submitError && <div className="error-message">{submitError}</div>}

            <form className="request-form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="order_details">
                  Request Description
                </label>
                <textarea
                  id="order_details"
                  className="form-input form-textarea"
                  rows={8}
                  placeholder="Describe the artwork you want, including subject, style, references, pose, mood, colors, deadline, and anything else the creator should know."
                  {...register("order_details", {
                    required: "Please enter your request details",
                    minLength: {
                      value: 10,
                      message: "Please provide a bit more detail",
                    },
                  })}
                />
                {errors.order_details && (
                  <p className="form-error">{errors.order_details.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-large"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}