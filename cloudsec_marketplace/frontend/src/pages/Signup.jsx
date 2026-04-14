import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PASSWORD_RULES = [
  { id: "length",  label: "At least 8 characters",  test: (v) => v.length >= 8 },
  { id: "upper",   label: "One uppercase letter",    test: (v) => /[A-Z]/.test(v) },
  { id: "lower",   label: "One lowercase letter",    test: (v) => /[a-z]/.test(v) },
  { id: "number",  label: "One number",              test: (v) => /[0-9]/.test(v) },
  { id: "special", label: "One special character",   test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export default function Signup() {
  const [serverError, setServerError] = useState(null);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ mode: "onSubmit", reValidateMode: "onSubmit" });

  // Used only to drive the live checklist — no red text from this
  const passwordValue = watch("password", "");

  const ruleResults = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(passwordValue),
  }));

  function clearPasswords() {
    setValue("password", "");
    setValue("confirmPassword", "");
  }

  function onSubmit(data) {
    setServerError(null);

    // Check all password rules
    const allPassed = PASSWORD_RULES.every((r) => r.test(data.password));
    if (!allPassed) {
      clearPasswords();
      setServerError("Your password doesn't meet all the requirements. Please try again.");
      return;
    }

    // Check passwords match
    if (data.password !== data.confirmPassword) {
      clearPasswords();
      setServerError("Passwords do not match. Please re-enter them.");
      return;
    }

    const result = signUp(data.email, data.password, data.displayName.trim());
    if (result.success) {
      navigate("/");
    } else {
      // e.g. email already exists — keep username & email, clear passwords
      clearPasswords();
      setServerError(result.error);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="auth-container auth-container--wide">
          <h1 className="page-title">Create Account</h1>

          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && <div className="error-message">{serverError}</div>}

            {/* ── Username ─────────────────────────────────────────── */}
            <div className="form-group">
              <label className="form-label" htmlFor="displayName">Username</label>
              <input
                id="displayName"
                type="text"
                className="form-input"
                placeholder="How you'll appear to others"
                {...register("displayName", {
                  required: "Username is required",
                  minLength: { value: 2, message: "At least 2 characters" },
                  maxLength: { value: 40, message: "40 characters max" },
                })}
              />
              {errors.displayName && (
                <span className="form-error">{errors.displayName.message}</span>
              )}
            </div>

            {/* ── Email ────────────────────────────────────────────── */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address",
                  },
                })}
              />
              {errors.email && (
                <span className="form-error">{errors.email.message}</span>
              )}
            </div>

            {/* ── Password ─────────────────────────────────────────── */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Create a strong password"
                autoComplete="new-password"
                {...register("password", { required: "Password is required" })}
              />
              {/* Checklist: green when passing, neutral grey when not — no red ever */}
              {passwordValue.length > 0 && (
                <ul className="password-rules">
                  {ruleResults.map((rule) => (
                    <li
                      key={rule.id}
                      className={`password-rule ${rule.passed ? "password-rule--pass" : "password-rule--neutral"}`}
                    >
                      <span className="password-rule-icon">
                        {rule.passed ? "✓" : "○"}
                      </span>
                      {rule.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ── Confirm Password ─────────────────────────────────── */}
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                })}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-large">
              Create Account
            </button>
          </form>

          <div className="auth-switch">
            <p>
              Already have an account?{" "}
              <Link to="/login" className="auth-link">Log In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
