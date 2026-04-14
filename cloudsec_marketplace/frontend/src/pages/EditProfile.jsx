import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MAX_BIO = 200;

// Compress + square-crop an image file via canvas, returns a base64 JPEG string
function compressAvatar(file, maxPx = 240) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const size = Math.min(img.width, img.height, maxPx);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        // Centre-crop to square
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
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
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EditProfile() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [preview, setPreview] = useState(user?.avatarUrl || null);
  const [newAvatarBase64, setNewAvatarBase64] = useState(undefined); // undefined = unchanged
  const [bioLength, setBioLength] = useState((user?.bio || "").length);
  const [uploadError, setUploadError] = useState(null);
  const [saved, setSaved] = useState(false);

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
      const compressed = await compressAvatar(file);
      setPreview(compressed);
      setNewAvatarBase64(compressed);
    } catch {
      setUploadError("Could not process image. Please try another file.");
    }
  }

  function removeAvatar() {
    setPreview(null);
    setNewAvatarBase64(null); // null = explicitly removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onSubmit(data) {
    const result = updateProfile({
      displayName: data.displayName.trim(),
      bio: data.bio.trim(),
      avatarUrl: newAvatarBase64, // undefined = keep existing; null = remove; string = new
    });

    if (result.success) {
      setSaved(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 1200);
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
                      {(user.displayName || user.email)[0].toUpperCase()}
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
              <div className="ep-date-row">
                <span className="ep-date-label">Last updated</span>
                <span className="ep-date-value">{formatDate(user.updatedAt)}</span>
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

            <form className="request-form" onSubmit={handleSubmit(onSubmit)} noValidate>

              {/* Display name */}
              <div className="form-group">
                <label className="form-label" htmlFor="displayName">
                  Display Name *
                </label>
                <input
                  id="displayName"
                  type="text"
                  className="form-input"
                  placeholder="How you want to appear to others"
                  {...register("displayName", {
                    required: "Display name is required",
                    minLength: { value: 2, message: "At least 2 characters" },
                    maxLength: { value: 40, message: "40 characters max" },
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
                  <span className="form-label-hint"> (optional — shown on your dashboard)</span>
                </label>
                <textarea
                  id="bio"
                  className="form-input form-textarea"
                  placeholder="Tell others a little about yourself…"
                  rows={4}
                  maxLength={MAX_BIO}
                  {...register("bio", {
                    maxLength: { value: MAX_BIO, message: `${MAX_BIO} characters max` },
                    onChange: (e) => setBioLength(e.target.value.length),
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
                {saved ? "Saved ✓" : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
