import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MAX_DESCRIPTION = 500;

// Compress image to a square JPEG blob
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
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas toBlob failed"));
          },
          "image/jpeg",
          0.85
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

  const [preview, setPreview] = useState(user?.pfp_url || null);
  const [avatarBlob, setAvatarBlob] = useState(undefined);
  const [uploadError, setUploadError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      username: user?.username || "",
      description: user?.description || "",
    },
  });

  const descriptionValue = watch("description", user?.description || "");

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
    setUploadError("");

    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file.");
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
      setUploadError("Could not process image.");
    }
  }

  function removeAvatarSelection() {
    setPreview(user?.pfp_url || null);
    setAvatarBlob(undefined);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function onSubmit(data) {
    try {
      setSaveError("");

      const result = await updateProfile({
        username: data.username.trim(),
        description: data.description.trim(),
        avatarFile: avatarBlob,
      });

      if (result?.success) {
        setSaved(true);
        setTimeout(() => navigate("/dashboard"), 1000);
      } else {
        setSaveError(result?.error || "Failed to save profile.");
      }
    } catch {
      setSaveError("Failed to save profile.");
    }
  }

  const displayName = user.creator_username || user.username || "User";

  return (
    <div className="page">
      <div className="container">
        <div className="edit-profile-layout">
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
                      {displayName[0]?.toUpperCase() || "?"}
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

              {avatarBlob && (
                <button
                  type="button"
                  className="btn btn-secondary btn-small ep-remove-btn"
                  onClick={removeAvatarSelection}
                >
                  Undo New Photo
                </button>
              )}
            </div>

            <div className="ep-dates-card">
              <div className="ep-date-row">
                <span className="ep-date-label">Member since</span>
                <span className="ep-date-value">{formatDate(user.register_date)}</span>
              </div>
            </div>
          </aside>

          <div className="edit-profile-form-wrap">
            <div className="ep-form-header">
              <h1 className="page-title" style={{ marginBottom: 0 }}>
                Edit Profile
              </h1>
              <Link to="/dashboard" className="btn btn-secondary btn-small">
                Back
              </Link>
            </div>

            <p className="request-form-sub">{user.email}</p>

            {saved && (
              <div className="ep-saved-banner">
                Profile saved. Redirecting to dashboard...
              </div>
            )}

            {saveError && <div className="error-message">{saveError}</div>}

            <form className="request-form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  className="form-input"
                  placeholder="Your username"
                  {...register("username", {
                    required: "Username is required",
                    minLength: { value: 3, message: "At least 3 characters" },
                    maxLength: { value: 30, message: "30 characters max" },
                    pattern: {
                      value: /^[a-zA-Z0-9_]+$/,
                      message: "Letters, numbers, and underscores only",
                    },
                  })}
                />
                {errors.username && (
                  <p className="form-error">{errors.username.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="description">
                  Description
                  <span className="form-label-hint"> (optional — shown on your public profile)</span>
                </label>
                <textarea
                  id="description"
                  className="form-input form-textarea"
                  placeholder="Tell others a little about yourself..."
                  rows={4}
                  maxLength={MAX_DESCRIPTION}
                  {...register("description", {
                    maxLength: {
                      value: MAX_DESCRIPTION,
                      message: `${MAX_DESCRIPTION} characters max`,
                    },
                  })}
                />
                <div className="ep-bio-counter">
                  <span
                    className={
                      descriptionValue.length >= MAX_DESCRIPTION
                        ? "ep-bio-counter--limit"
                        : ""
                    }
                  >
                    {descriptionValue.length} / {MAX_DESCRIPTION}
                  </span>
                </div>
                {errors.description && (
                  <p className="form-error">{errors.description.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-large"
                disabled={isSubmitting || saved}
              >
                {saved ? "Saved" : isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}