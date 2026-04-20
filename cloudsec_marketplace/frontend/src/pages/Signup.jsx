import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PASSWORD_RULES = [
  { id: "length", label: "At least 12 characters", test: (v) => v.length >= 12 },
  { id: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "One number", test: (v) => /[0-9]/.test(v) },
  {
    id: "special",
    label: "One special character",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

export default function Signup() {
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ mode: "onSubmit", reValidateMode: "onSubmit" });

  const passwordValue = watch("password", "");

  const ruleResults = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(passwordValue),
  }));

  function clearPasswords() {
    setValue("password", "");
    setValue("confirmPassword", "");
  }

  async function onSubmit(data) {
    setServerError(null);

    const allPassed = PASSWORD_RULES.every((r) => r.test(data.password));
    if (!allPassed) {
      clearPasswords();
      setServerError("Your password doesn't meet all the requirements. Please try again.");
      return;
    }

    if (data.password !== data.confirmPassword) {
      clearPasswords();
      setServerError("Passwords do not match. Please re-enter them.");
      return;
    }

    setSubmitting(true);
    const result = await signUp(data.username.trim(), data.email, data.password);
    setSubmitting(false);

    if (result.success) {
      navigate("/");
    } else {
      clearPasswords();
      setServerError(result.error);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="auth-container auth-container--wide">
          <h1 className="page-title">Create Account</h1>

          <form
            className="auth-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            {serverError && <div className="error-message">{serverError}</div>}

            {/* Username */}
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="letters, numbers, underscores only"
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
                <span className="form-error">{errors.username.message}</span>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Please enter a valid email address",
                  },
                })}
              />
              {errors.email && (
                <span className="form-error">{errors.email.message}</span>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Create a strong password"
                autoComplete="new-password"
                {...register("password", { required: "Password is required" })}
              />
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

            {/* Confirm Password */}
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

            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={submitting}
            >
              {submitting ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <div className="auth-switch">
            <p>
              Already have an account?{" "}
              <Link to="/login" className="auth-link">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
