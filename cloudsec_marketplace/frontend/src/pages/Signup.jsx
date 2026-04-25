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
  const [serverError, setServerError] = useState("");
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

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
    setServerError("");

    const allPassed = PASSWORD_RULES.every((rule) => rule.test(data.password));
    if (!allPassed) {
      clearPasswords();
      setServerError("Your password does not meet all requirements. Please try again.");
      return;
    }

    if (data.password !== data.confirmPassword) {
      clearPasswords();
      setServerError("Passwords do not match. Please re-enter them.");
      return;
    }

    const result = await signUp(
      data.username.trim(),
      data.email.trim(),
      data.password
    );

    if (result.success) {
      navigate("/");
    } else {
      clearPasswords();
      setServerError(result.error || "Failed to create account.");
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="auth-container auth-container--wide">
          <h1 className="page-title">Create Account</h1>

          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && <div className="error-message">{serverError}</div>}

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
              {errors.username && (
                <span className="form-error">{errors.username.message}</span>
              )}
            </div>

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
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 12,
                    message: "Password must be at least 12 characters",
                  },
                  maxLength: {
                    value: 128,
                    message: "Password must be 128 characters or less",
                  },
                })}
              />

              {errors.password && (
                <span className="form-error">{errors.password.message}</span>
              )}

              {passwordValue.length > 0 && (
                <ul className="password-rules">
                  {ruleResults.map((rule) => (
                    <li
                      key={rule.id}
                      className={`password-rule ${
                        rule.passed ? "password-rule--pass" : "password-rule--neutral"
                      }`}
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
              {errors.confirmPassword && (
                <span className="form-error">{errors.confirmPassword.message}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create Account"}
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