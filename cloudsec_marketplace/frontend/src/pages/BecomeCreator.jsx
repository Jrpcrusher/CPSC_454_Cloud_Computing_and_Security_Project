import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30);
}

export default function BecomeCreator() {
  const { user, isCreator, becomeCreator } = useAuth();
  const navigate = useNavigate();

  const defaultCreatorUsername = user?.username
    ? slugify(user.username)
    : user?.email
    ? slugify(user.email.split("@")[0])
    : "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      creator_username: defaultCreatorUsername,
    },
  });

  if (!user) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>Sign in first</h2>
            <p>You need an account before becoming a creator.</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isCreator && user?.user_id) {
    return (
      <div className="page">
        <div className="container">
          <div className="success-panel">
            <div className="success-icon">🎨</div>
            <h2 className="success-title">You're already a creator</h2>
            <p className="success-desc">
              Your creator account is already active.
            </p>

            <div className="success-actions">
              <Link to={`/creator/${user.user_id}`} className="btn btn-primary">
                View My Profile
              </Link>
              <Link to="/dashboard" className="btn btn-secondary">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function onSubmit(data) {
    const result = await becomeCreator({
      creator_username: data.creator_username.trim(),
    });

    if (result?.success) {
      navigate(`/creator/${user.user_id}`);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="become-creator-layout">
          <aside className="become-creator-sidebar">
            <div className="bc-info-card">
              <div className="bc-info-icon">🎨</div>
              <h2 className="bc-info-title">Become a Creator</h2>
              <p className="bc-info-desc">
                Activate your creator profile so clients can find you and send commission requests.
              </p>

              <ul className="bc-perks-list">
                <li>✓ Public creator profile</li>
                <li>✓ Receive commission requests</li>
                <li>✓ Manage orders from your dashboard</li>
                <li>✓ Connect payouts through Stripe</li>
              </ul>
            </div>
          </aside>

          <div className="become-creator-form-wrap">
            <h1 className="page-title">Creator Setup</h1>
            <p className="request-form-sub">
              Choose your public creator username. You can update your profile description later from profile settings.
            </p>

            <form className="request-form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="creator_username">
                  Creator Username
                  <span className="form-label-hint"> (shown publicly on your creator profile)</span>
                </label>

                <input
                  id="creator_username"
                  type="text"
                  className="form-input"
                  placeholder="yourcreatorname"
                  {...register("creator_username", {
                    required: "Creator username is required",
                    minLength: {
                      value: 3,
                      message: "At least 3 characters",
                    },
                    maxLength: {
                      value: 30,
                      message: "30 characters max",
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9_]+$/,
                      message: "Letters, numbers, and underscores only",
                    },
                  })}
                />

                {errors.creator_username && (
                  <p className="form-error">{errors.creator_username.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-large"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Activating..." : "Become a Creator"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}