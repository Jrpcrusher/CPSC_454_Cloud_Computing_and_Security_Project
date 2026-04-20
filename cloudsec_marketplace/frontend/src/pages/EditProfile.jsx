import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MAX_BIO = 500; // backend allows 500 chars for description

// Compress image to a canvas-scaled JPEG, return as Blob
function compressAvatarToBlob(file, maxPx = 300) {
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
        const dx = (maxPx - scaledW) / 2;
        const dy = (maxPx - scaledH) / 2;
        ctx.fillStyle = "#313338";
        ctx.fillRect(0, 0, maxPx, maxPx);
        ctx.drawImage(img, dx, dy, scaledW, scaledH);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
          "image/jpeg",
          0.85,
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function EditProfile() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [preview, setPreview] = useState(user?.avatarUrl || null);
  const [avatarBlob, setAvatarBlob] = useState(undefined);
  const [uploadError, setUploadError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      displayName: user?.displayName || "",
      bio: user?.bio || "",
    },
  });

  const bioValue = watch("bio", user?.bio || "");

  if (!user) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>Not logged in</h2>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleAvatarChange(e) {
    setUploadError(null);
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file (JPG, PNG, GIF, etc.)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB.");
      return;
    }
    try {
      const blob = await compressAvatarToBlob(file);
      setAvatarBlob(blob);
      setPreview(URL.createObjectURL(blob));
    } catch {
      setUploadError("Could not process image. Please try another file.");
    }
  }

  function removeAvatar() {
    setPreview(null);
    setAvatarBlob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(data) {
    setSaveError(null);
    const result = await updateProfile({
      displayName: data.displayName.trim(),
      bio: data.bio.trim(),
      avatarSource: avatarBlob,
    });
    if (result.success) {
      setSaved(true);
      setTimeout(() => navigate("/dashboard"), 1200);
    } else {
      setSaveError(result.error || "Failed to save profile.");
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="edit-profile-layout">

          {/* ── Left: avatar + dates ─────────────────────────────── */}
          <aside className="edit-profile-sidebar">
            <div className="ep-avatar-section">
              <div
                className="ep-avatar-wrap"
                onClick={() => fileInputRef.current?.click()}
                title="Click to change photo"
              >
                {preview ? (
                  <img src={preview} alt="Avatar preview" className="ep-avatar-img" />
                ) : (
                  <div className="ep-avatar-placeholder">
                    <span className="ep-avatar-initials">
                      {(user.displayName || user.username || "?")[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="ep-avatar-overlay">
                  <span>📷 Change</span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleAvatarChange}
              />

              {uploadError && (
                <p className="form-error" style={{ textAlign: "center", marginTop: "0.5rem" }}>
                  {uploadError}
                </p>
              )}

              {preview && (
                <button
                  type="button"
                  className="btn btn-secondary btn-small ep-remove-btn"
                  onClick={removeAvatar}
                >
                  Remove Photo
                </button>
              )}
            </div>

            {/* Profile dates */}
            <div className="ep-dates-card">
              <div className="ep-date-row">
                <span className="ep-date-label">Member since</span>
                <span className="ep-date-value">{formatDate(user.createdAt)}</span>
              </div>
            </div>
          </aside>

          {/* ── Right: form ──────────────────────────────────────── */}
          <div className="edit-profile-form-wrap">
            <div className="ep-form-header">
              <h1 className="page-title" style={{ marginBottom: 0 }}>Edit Profile</h1>
              <Link to="/dashboard" className="btn btn-secondary btn-small">
                ← Back
              </Link>
            </div>
            <p className="request-form-sub">{user.email}</p>

            {saved && (
              <div className="ep-saved-banner">
                ✅ Profile saved! Redirecting to dashboard…
              </div>
            )}
            {saveError && <div className="error-message">{saveError}</div>}

            <form className="request-form" onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Username / Display name */}
              <div className="form-group">
                <label className="form-label" htmlFor="displayName">
                  Username *
                </label>
                <input
                  id="displayName"
                  type="text"
                  className="form-input"
                  placeholder="Your username"
                  {...register("displayName", {
                    required: "Username is required",
                    minLength: { value: 3, message: "At least 3 characters" },
                    maxLength: { value: 30, message: "30 characters max" },
                    pattern: {
                      value: /^[a-zA-Z0-9_]+$/,
                      message: "Letters, numbers, and underscores only",
                    },
                  })}
                />
                {errors.displayName && (
                  <p className="form-error">{errors.displayName.message}</p>
                )}
              </div>

              {/* Bio */}
              <div className="form-group">
                <label className="form-label" htmlFor="bio">
                  Bio
                  <span className="form-label-hint"> (optional — shown on your public profile)</span>
                </label>
                <textarea
                  id="bio"
                  className="form-input form-textarea"
                  placeholder="Tell others a little about yourself…"
                  rows={4}
                  maxLength={MAX_BIO}
                  {...register("bio", {
                    maxLength: { value: MAX_BIO, message: `${MAX_BIO} characters max` },
                  })}
                />
                <div className="ep-bio-counter">
                  <span className={bioValue.length >= MAX_BIO ? "ep-bio-counter--limit" : ""}>
                    {bioValue.length} / {MAX_BIO}
                  </span>
                </div>
                {errors.bio && <p className="form-error">{errors.bio.message}</p>}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-large"
                disabled={isSubmitting || saved}
              >
                {saved ? "Saved ✓" : isSubmitting ? "Saving…" : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
