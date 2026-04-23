import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { getCreatorByUsername, backendProfileToCreator } from "../data/creators";
import { useAuth } from "../context/AuthContext";
import ProtectedImage from "../components/ProtectedImage";
import api from "../services/apiClient";

const AVAILABLE_TAGS = [
  "Anime", "Character Design", "Fantasy", "Digital",
  "Pixel Art", "Sprite Work", "Game Assets", "Retro",
  "Portraits", "Concept Art", "Painterly", "OC Art",
  "Cyberpunk", "Sci-Fi", "Chibi", "Cute",
  "Emotes", "Stickers", "Dark Fantasy", "Horror",
  "Monsters", "Gothic", "Illustration", "Logo Design",
];

// ── Image helpers ──────────────────────────────────────────────────────────
function compressAvatar(file, maxPx = 300) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = maxPx;
        canvas.height = maxPx;
        const ctx = canvas.getContext("2d");
        const scale = Math.min(maxPx / img.width, maxPx / img.height);
        const scaledW = img.width * scale;
        const scaledH = img.height * scale;
        ctx.fillStyle = "#313338";
        ctx.fillRect(0, 0, maxPx, maxPx);
        ctx.drawImage(img, (maxPx - scaledW) / 2, (maxPx - scaledH) / 2, scaledW, scaledH);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressBanner(file, maxW = 1200, maxH = 400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = maxW;
        canvas.height = maxH;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(maxW / img.width, maxH / img.height);
        const scaledW = img.width * scale;
        const scaledH = img.height * scale;
        ctx.fillStyle = "#313338";
        ctx.fillRect(0, 0, maxW, maxH);
        ctx.drawImage(img, (maxW - scaledW) / 2, (maxH - scaledH) / 2, scaledW, scaledH);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressPortfolioImage(file, maxPx = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CreatorProfile() {
  const { username } = useParams();
  const { user, updateProfile, updateCreatorProfile } = useAuth();
  const navigate = useNavigate();

  const localCreator = getCreatorByUsername(username);
  const [creator, setCreator] = useState(localCreator);
  const [creatorLoading, setCreatorLoading] = useState(!localCreator);
  const isOwnProfile = user?.creatorUsername === username;

  useEffect(() => {
    if (creator) return;
    let cancelled = false;
    api
      .get("/home/profiles")
      .then((profiles) => {
        if (cancelled) return;
        const match = profiles.find(
          (p) => (p.creator_username || p.username) === username
        );
        setCreator(match ? backendProfileToCreator(match) : null);
        setCreatorLoading(false);
      })
      .catch(() => {
        if (!cancelled) setCreatorLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  // ── Portfolio state ────────────────────────────────────────────────────
  const portfolioFileRef = useRef(null);
  const [portfolio, setPortfolio] = useState(creator?.portfolio || []);
  const [uploadError, setUploadError] = useState(null);

  // ── Accepting commissions toggle ───────────────────────────────────────────
  const commissionKey = creator?.user_id ? `acceptingCommissions_${creator.user_id}` : null;
  const [acceptingCommissions, setAcceptingCommissions] = useState(() => {
    if (!commissionKey) return true;
    return localStorage.getItem(commissionKey) !== "false";
  });

  function toggleAcceptingCommissions() {
    const next = !acceptingCommissions;
    setAcceptingCommissions(next);
    if (commissionKey) localStorage.setItem(commissionKey, String(next));
  }

  // For visitors: read the stored value directly
  const creatorIsAccepting = commissionKey
    ? localStorage.getItem(commissionKey) !== "false"
    : true;

  // ── Edit mode state ────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState(creator?.bio || "");
  const [selectedTags, setSelectedTags] = useState(creator?.tags || []);
  const [editTiers, setEditTiers] = useState(
    () => (creator?.tiers || []).map((t) => ({
      name: t.name,
      price: String(t.price),
      perksText: t.perks.join("\n"),
    }))
  );

  // Avatar edit
  const avatarFileRef = useRef(null);
  const [editAvatar, setEditAvatar] = useState(creator?.avatar || null);
  const [newAvatarBase64, setNewAvatarBase64] = useState(undefined);
  const [avatarError, setAvatarError] = useState(null);

  // Banner edit
  const bannerFileRef = useRef(null);
  const [editBanner, setEditBanner] = useState(creator?.banner || null);
  const [newBannerBase64, setNewBannerBase64] = useState(undefined);
  const [bannerError, setBannerError] = useState(null);

  const [editSaved, setEditSaved] = useState(false);

  if (creatorLoading) {
    return (
      <div className="page">
        <div className="container">
          <p style={{ padding: "2rem", color: "#888" }}>Loading…</p>
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
            <p>We couldn't find a creator with that username.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { displayName, avatar, banner, bio, tags, tiers, stats } = creator;

  // ── Tag toggle ─────────────────────────────────────────────────────────
  function toggleTag(tag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  // ── Avatar upload (edit mode) ──────────────────────────────────────────
  async function handleAvatarChange(e) {
    setAvatarError(null);
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setAvatarError("Please upload an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setAvatarError("Image must be under 5 MB."); return; }
    try {
      const compressed = await compressAvatar(file);
      setEditAvatar(compressed);
      setNewAvatarBase64(compressed);
    } catch { setAvatarError("Could not process image."); }
    e.target.value = "";
  }

  // ── Banner upload (edit mode) ──────────────────────────────────────────
  async function handleBannerChange(e) {
    setBannerError(null);
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setBannerError("Please upload an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setBannerError("Banner must be under 10 MB."); return; }
    try {
      const compressed = await compressBanner(file);
      setEditBanner(compressed);
      setNewBannerBase64(compressed);
    } catch { setBannerError("Could not process image."); }
    e.target.value = "";
  }

  // ── Save / cancel ──────────────────────────────────────────────────────
  function handleEditSave() {
    const updatedTiers = editTiers.map((t) => ({
      name: t.name.trim() || "Untitled",
      price: parseFloat(t.price) || 0,
      perks: t.perksText.split("\n").map((p) => p.trim()).filter(Boolean),
    }));

    const creatorChanges = {
      bio: editBio.trim(),
      tags: selectedTags,
      tiers: updatedTiers,
    };
    if (newBannerBase64 !== undefined) creatorChanges.banner = newBannerBase64;
    if (newAvatarBase64 !== undefined) creatorChanges.avatar = newAvatarBase64;

    updateCreatorProfile(creatorChanges);

    // Sync avatar back to user profile so both stay in sync
    if (newAvatarBase64 !== undefined) {
      updateProfile({ avatarUrl: newAvatarBase64 });
    }

    setEditSaved(true);
    setTimeout(() => {
      setEditSaved(false);
      setIsEditing(false);
      window.location.reload();
    }, 900);
  }

  function handleEditCancel() {
    setEditBio(creator.bio || "");
    setSelectedTags(creator.tags || []);
    setEditTiers(
      (creator.tiers || []).map((t) => ({
        name: t.name,
        price: String(t.price),
        perksText: t.perks.join("\n"),
      }))
    );
    setEditAvatar(creator.avatar || null);
    setEditBanner(creator.banner || null);
    setNewAvatarBase64(undefined);
    setNewBannerBase64(undefined);
    setIsEditing(false);
  }

  function updateTierField(index, field, value) {
    setEditTiers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  }

  function addTier() {
    setEditTiers((prev) => [...prev, { name: "New Tier", price: "0", perksText: "" }]);
  }

  function removeTier(index) {
    setEditTiers((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Request click (visitors) ───────────────────────────────────────────
  function handleRequestClick(tier) {
    if (!user) { navigate("/login"); return; }
    navigate(`/creator/${username}/request`, { state: { selectedTier: tier.name } });
  }

  // ── Portfolio upload ───────────────────────────────────────────────────
  async function handlePortfolioUpload(e) {
    setUploadError(null);
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const invalidFile = files.find((f) => !f.type.startsWith("image/"));
    if (invalidFile) {
      setUploadError("Only image files are accepted (JPG, PNG, GIF, WebP, etc.). Please remove any documents or other file types.");
      return;
    }

    if (files.find((f) => f.size > 10 * 1024 * 1024)) {
      setUploadError("Each image must be under 10 MB.");
      return;
    }
    try {
      const compressed = await Promise.all(files.map((f) => compressPortfolioImage(f)));
      const updated = [...portfolio, ...compressed];
      setPortfolio(updated);
      updateCreatorProfile({ portfolio: updated });
    } catch {
      setUploadError("Failed to process one or more images.");
    }
    e.target.value = "";
  }

  function removePortfolioImage(index) {
    const updated = portfolio.filter((_, i) => i !== index);
    setPortfolio(updated);
    updateCreatorProfile({ portfolio: updated });
  }

  // ── Render ─────────────────────────────────────────────────────────────
  // In edit mode, show the edited banner; otherwise the stored banner
  const activeBanner = isEditing ? editBanner : banner;
  const activeAvatar = isEditing ? editAvatar : avatar;

  return (
    <div className="profile-page">
      {/* Banner */}
      <div
        className="profile-banner"
        style={isEditing ? { cursor: "pointer", position: "relative" } : undefined}
        onClick={isEditing ? () => bannerFileRef.current?.click() : undefined}
        title={isEditing ? "Click to change banner" : undefined}
      >
        <img
          src={activeBanner}
          alt=""
          className="profile-banner-img"
          onError={(e) => { e.target.style.display = "none"; }}
        />
        {isEditing && (
          <div className="cp-banner-edit-overlay">
            📷 Change Banner
            {bannerError && <span className="cp-img-error"> — {bannerError}</span>}
          </div>
        )}
        <input
          ref={bannerFileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleBannerChange}
        />
      </div>

      <div className="container profile-container">
        {/* Profile header */}
        <div className="profile-header">
          {/* Avatar — clickable in edit mode */}
          <div
            className="profile-avatar-wrap"
            style={isEditing ? { cursor: "pointer", position: "relative" } : undefined}
            onClick={isEditing ? () => avatarFileRef.current?.click() : undefined}
            title={isEditing ? "Click to change profile picture" : undefined}
          >
            <img
              src={activeAvatar}
              alt={displayName}
              className="profile-avatar"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${displayName}&background=5865f2&color=fff&size=120`;
              }}
            />
            {isEditing && (
              <div className="cp-avatar-edit-overlay">📷</div>
            )}
            {avatarError && isEditing && (
              <p className="form-error cp-avatar-error">{avatarError}</p>
            )}
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          </div>

          <div className="profile-header-info">
            <h1 className="profile-name">{displayName}</h1>
            <span className="profile-handle">@{username}</span>
            <div className="creator-card-tags" style={{ marginTop: "0.5rem" }}>
              {(isEditing ? selectedTags : tags).map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </div>

          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat-value">⭐ {stats.rating || "New"}</span>
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

          {/* Edit / Save / Cancel buttons + commissions toggle — own profile only */}
          {isOwnProfile && !isEditing && (
            <div className="cp-edit-actions">
              <button
                className="btn btn-secondary btn-small cp-edit-btn"
                onClick={() => setIsEditing(true)}
              >
                ✏️ Edit Creator Profile
              </button>
              <button
                className={`btn btn-small ${acceptingCommissions ? "btn-primary" : "btn-secondary"}`}
                onClick={toggleAcceptingCommissions}
                title="Toggle whether you're currently accepting commission requests"
              >
                {acceptingCommissions ? "✅ Accepting Commissions" : "⏸ Commissions Closed"}
              </button>
            </div>
          )}
          {isOwnProfile && isEditing && (
            <div className="cp-edit-actions">
              <button
                className="btn btn-primary btn-small"
                onClick={handleEditSave}
                disabled={editSaved}
              >
                {editSaved ? "Saved ✓" : "Save Changes"}
              </button>
              <button
                className="btn btn-secondary btn-small"
                onClick={handleEditCancel}
                disabled={editSaved}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="profile-body">
          {/* Left: bio + tags edit + portfolio */}
          <div className="profile-main">
            <section className="profile-section">
              <h2 className="profile-section-title">About</h2>
              {isEditing ? (
                <textarea
                  className="form-input form-textarea cp-edit-textarea"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={4}
                  placeholder="Describe your style, experience, and what you love to create..."
                />
              ) : (
                <p className="profile-bio">{bio}</p>
              )}
            </section>

            {/* Tag picker — edit mode only */}
            {isEditing && (
              <section className="profile-section">
                <h2 className="profile-section-title">Art Style Tags</h2>
                <p className="bc-section-hint" style={{ marginBottom: "0.75rem" }}>
                  Click to select the styles that best describe your work.
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
              </section>
            )}

            <section className="profile-section">
              <div className="portfolio-section-header">
                <h2 className="profile-section-title" style={{ marginBottom: 0 }}>Portfolio</h2>
                {isOwnProfile && (
                  <div className="portfolio-upload-controls">
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => portfolioFileRef.current?.click()}
                    >
                      + Upload Images
                    </button>
                    <input
                      ref={portfolioFileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: "none" }}
                      onChange={handlePortfolioUpload}
                    />
                  </div>
                )}
              </div>

              {uploadError && (
                <p className="form-error" style={{ margin: "0.5rem 0" }}>{uploadError}</p>
              )}

              {portfolio.length === 0 ? (
                <div className="empty-state" style={{ marginTop: "1rem" }}>
                  {isOwnProfile
                    ? "No portfolio images yet — upload some to showcase your work."
                    : "This creator hasn't uploaded any portfolio images yet."}
                </div>
              ) : (
                <div className="portfolio-grid" style={{ marginTop: "1rem" }}>
                  {portfolio.map((src, i) => (
                    <div key={i} className="portfolio-item">
                      {isOwnProfile ? (
                        <div className="portfolio-own-wrap">
                          <img src={src} alt={`Portfolio piece ${i + 1}`} className="portfolio-img" />
                          <button
                            className="portfolio-remove-btn"
                            onClick={() => removePortfolioImage(i)}
                            title="Remove image"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <ProtectedImage src={src} alt={`Portfolio piece ${i + 1}`} creatorName={displayName} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right: commission tiers */}
          <aside className="profile-sidebar">
            <div className="cp-sidebar-header">
              <h2 className="profile-section-title" style={{ marginBottom: 0 }}>Commission Tiers</h2>
            </div>

            {/* Own profile edit mode: editable tier cards */}
            {isOwnProfile && isEditing ? (
              <div className="cp-tiers-edit">
                {editTiers.map((tier, i) => (
                  <div key={i} className="cp-tier-edit-card">
                    <div className="cp-tier-edit-row">
                      <div className="form-group" style={{ flex: 2 }}>
                        <label className="form-label">Tier Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={tier.name}
                          onChange={(e) => updateTierField(i, "name", e.target.value)}
                          placeholder="Basic"
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Price ($)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={tier.price}
                          min="0"
                          onChange={(e) => updateTierField(i, "price", e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <button
                        type="button"
                        className="cp-tier-remove-btn"
                        onClick={() => removeTier(i)}
                        title="Remove tier"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Perks <span className="form-label-hint">(one per line)</span>
                      </label>
                      <textarea
                        className="form-input form-textarea"
                        rows={3}
                        value={tier.perksText}
                        onChange={(e) => updateTierField(i, "perksText", e.target.value)}
                        placeholder={"Sketch\n1 character\n2 revisions"}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={addTier}
                  style={{ marginTop: "0.5rem" }}
                >
                  + Add Tier
                </button>
              </div>
            ) : (
              /* View mode: own profile sees no request buttons; visitors see them */
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
                    {!isOwnProfile && creatorIsAccepting && (
                      <button
                        className={`btn btn-block ${i === 1 ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => handleRequestClick(tier)}
                      >
                        Request This Tier
                      </button>
                    )}
                  </div>
                ))}

                {/* Backend-only creator: no tiers yet — show generic request entry point */}
                {!isOwnProfile && creatorIsAccepting && tiers.length === 0 && (
                  <div className="empty-state" style={{ padding: "1rem" }}>
                    <p style={{ color: "#888", fontSize: "0.9rem" }}>
                      This creator hasn't set up commission tiers yet.
                    </p>
                    {user ? (
                      <button
                        className="btn btn-primary"
                        style={{ marginTop: "0.75rem" }}
                        onClick={() => navigate(`/creator/${username}/request`)}
                      >
                        Request a Commission
                      </button>
                    ) : (
                      <p className="profile-login-note" style={{ marginTop: "0.5rem" }}>
                        <Link to="/login" className="auth-link">Log in</Link> or{" "}
                        <Link to="/signup" className="auth-link">sign up</Link> to submit a request.
                      </p>
                    )}
                  </div>
                )}

                {!isOwnProfile && !creatorIsAccepting && (
                  <div className="empty-state" style={{ marginTop: "1rem", padding: "1rem" }}>
                    <p style={{ color: "#888", fontSize: "0.9rem" }}>
                      ⏸ This creator is not currently accepting commissions.
                    </p>
                  </div>
                )}

                {!user && !isOwnProfile && creatorIsAccepting && tiers.length > 0 && (
                  <p className="profile-login-note">
                    <Link to="/login" className="auth-link">Log in</Link> or{" "}
                    <Link to="/signup" className="auth-link">sign up</Link> to submit a request.
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
