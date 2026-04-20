import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAllCreators } from "../data/creators";

const AVAILABLE_TAGS = [
  "Anime", "Character Design", "Fantasy", "Digital",
  "Pixel Art", "Sprite Work", "Game Assets", "Retro",
  "Portraits", "Concept Art", "Painterly", "OC Art",
  "Cyberpunk", "Sci-Fi", "Chibi", "Cute",
  "Emotes", "Stickers", "Dark Fantasy", "Horror",
  "Monsters", "Gothic", "Illustration", "Logo Design",
];

const DEFAULT_TIERS = [
  { name: "Basic",    price: "", perks: "Sketch\n1 character\n2 revisions" },
  { name: "Standard", price: "", perks: "Lineart + flat color\n2 characters\n3 revisions\nCommercial use" },
  { name: "Premium",  price: "", perks: "Full color + shading\nUp to 3 characters\nBackground\nUnlimited revisions\nCommercial use" },
];

// Derive a clean username slug from an email prefix
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24);
}

export default function BecomeCreator() {
  const { user, isCreator, becomeCreator } = useAuth();
  const navigate = useNavigate();

  const defaultUsername = user ? slugify(user.email.split("@")[0]) : "";

  const [selectedTags, setSelectedTags] = useState([]);
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [submitError, setSubmitError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { username: defaultUsername } });

  // Redirect if already a creator
  if (isCreator && user?.creatorUsername) {
    return (
      <div className="page">
        <div className="container">
          <div className="success-panel">
            <div className="success-icon">🎨</div>
            <h2 className="success-title">You're already a creator!</h2>
            <p className="success-desc">
              Your creator profile is live at{" "}
              <strong>@{user.creatorUsername}</strong>.
            </p>
            <div className="success-actions">
              <Link to={`/creator/${user.creatorUsername}`} className="btn btn-primary">
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

  if (!user) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>Sign in first</h2>
            <p>You need an account before becoming a creator.</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Log In / Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function toggleTag(tag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function updateTier(index, field, value) {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  }

  async function onSubmit(data) {
    setSubmitError(null);

    if (selectedTags.length === 0) {
      setSubmitError("Please select at least one art style tag.");
      return;
    }

    // Check username uniqueness locally
    const allCreators = getAllCreators();
    if (allCreators.find((c) => c.username === data.username)) {
      setSubmitError("That username is already taken. Please choose another.");
      return;
    }

    // Validate tiers have prices
    for (const tier of tiers) {
      if (!tier.price || isNaN(Number(tier.price)) || Number(tier.price) <= 0) {
        setSubmitError(`Please enter a valid price for the "${tier.name}" tier.`);
        return;
      }
    }

    // Build tier objects
    const builtTiers = tiers.map((t) => ({
      name: t.name,
      price: Number(t.price),
      perks: t.perks
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean),
    }));

    const result = await becomeCreator({
      username: data.username,
      displayName: data.displayName,
      bio: data.bio,
      tags: selectedTags,
      tiers: builtTiers,
    });

    if (result.success) {
      navigate(`/creator/${data.username}`);
    } else {
      setSubmitError(result.error);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="become-creator-layout">
          {/* Left: info panel */}
          <aside className="become-creator-sidebar">
            <div className="bc-info-card">
              <div className="bc-info-icon">🎨</div>
              <h2 className="bc-info-title">Become a Creator</h2>
              <p className="bc-info-desc">
                Set up your profile and start accepting commission requests from
                fans and clients.
              </p>
              <ul className="bc-perks-list">
                <li>✓ Your own profile page</li>
                <li>✓ Custom commission tiers</li>
                <li>✓ Appear on the creator browse page</li>
                <li>✓ Manage requests from your dashboard</li>
              </ul>
            </div>
          </aside>

          {/* Right: form */}
          <div className="become-creator-form-wrap">
            <h1 className="page-title">Creator Setup</h1>
            <p className="request-form-sub">
              Fill in your details below. You can update everything later from your dashboard.
            </p>

            <form
              className="request-form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              {submitError && (
                <div className="error-message">{submitError}</div>
              )}

              {/* ── Basic Info ─────────────────────────────────────── */}
              <div className="bc-section-label">Basic Info</div>

              <div className="form-group">
                <label className="form-label" htmlFor="displayName">
                  Display Name *
                </label>
                <input
                  id="displayName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. InkWave Studio"
                  {...register("displayName", {
                    required: "Display name is required",
                    minLength: { value: 2, message: "Must be at least 2 characters" },
                    maxLength: { value: 40, message: "Must be 40 characters or less" },
                  })}
                />
                {errors.displayName && (
                  <p className="form-error">{errors.displayName.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="username">
                  Username *
                  <span className="form-label-hint"> (used in your profile URL — letters and numbers only)</span>
                </label>
                <div className="username-input-wrap">
                  <span className="username-prefix">artflow.com/creator/</span>
                  <input
                    id="username"
                    type="text"
                    className="form-input username-input"
                    placeholder="yourname"
                    {...register("username", {
                      required: "Username is required",
                      minLength: { value: 3, message: "At least 3 characters" },
                      maxLength: { value: 24, message: "24 characters max" },
                      pattern: {
                        value: /^[a-z0-9]+$/,
                        message: "Lowercase letters and numbers only (no spaces or symbols)",
                      },
                    })}
                  />
                </div>
                {errors.username && (
                  <p className="form-error">{errors.username.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="bio">
                  Bio *
                  <span className="form-label-hint"> (tell potential clients about your style and experience)</span>
                </label>
                <textarea
                  id="bio"
                  className="form-input form-textarea"
                  placeholder="I'm a digital illustrator specializing in..."
                  rows={4}
                  {...register("bio", {
                    required: "Bio is required",
                    minLength: { value: 30, message: "Please write at least 30 characters" },
                    maxLength: { value: 400, message: "Keep it under 400 characters" },
                  })}
                />
                {errors.bio && <p className="form-error">{errors.bio.message}</p>}
              </div>

              {/* ── Art Style Tags ──────────────────────────────────── */}
              <div className="bc-section-label">Art Style Tags *</div>
              <p className="bc-section-hint">
                Pick the styles that best describe your work. These help clients find you.
              </p>
              <div className="tag-checkbox-grid">
                {AVAILABLE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`tag-checkbox-btn ${selectedTags.includes(tag) ? "tag-checkbox-btn--active" : ""}`}
                  >
                    {selectedTags.includes(tag) && <span>✓ </span>}
                    {tag}
                  </button>
                ))}
              </div>

              {/* ── Commission Tiers ───────────────────────────────── */}
              <div className="bc-section-label">Commission Tiers *</div>
              <p className="bc-section-hint">
                Set a name, price, and what's included for each tier. You can use the defaults or customize freely.
              </p>

              <div className="bc-tiers-grid">
                {tiers.map((tier, i) => (
                  <div key={i} className={`bc-tier-card ${i === 1 ? "bc-tier-card--featured" : ""}`}>
                    {i === 1 && <span className="tier-badge">Middle Tier</span>}
                    <div className="form-group">
                      <label className="form-label">Tier Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={tier.name}
                        onChange={(e) => updateTier(i, "name", e.target.value)}
                        placeholder="e.g. Basic"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Price (USD $)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={tier.price}
                        onChange={(e) => updateTier(i, "price", e.target.value)}
                        placeholder="25"
                        min="1"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        What's Included
                        <span className="form-label-hint"> (one item per line)</span>
                      </label>
                      <textarea
                        className="form-input form-textarea"
                        value={tier.perks}
                        onChange={(e) => updateTier(i, "perks", e.target.value)}
                        rows={5}
                        placeholder={"Sketch\n1 character\n2 revisions"}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-large"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating profile..." : "Launch My Creator Profile →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
