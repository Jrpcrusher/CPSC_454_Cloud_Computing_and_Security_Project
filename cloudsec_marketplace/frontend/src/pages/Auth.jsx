import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [mode, setMode] = useState("signup");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { signUp, login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm();

  async function onSubmit(data) {
    setError("");

    let result;

    if (mode === "signup") {
      result = await signUp(data.username, data.email, data.password);
    } else {
      result = await login(data.username, data.password);
    }

    if (result.success) {
      navigate("/");
    } else {
      setError(result.error || "Authentication failed.");
    }
  }

  function switchMode(nextMode) {
    setError("");
    reset();
    setMode(nextMode);
  }

  return (
    <div className="page">
      <div className="container">
        <div className="auth-container">
          <h1 className="page-title">
            {mode === "signup" ? "Sign Up" : "Login"}
          </h1>

          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Username
              </label>
              <input
                className="form-input"
                type="text"
                id="username"
                placeholder="Enter your username"
                {...register("username", {
                  required: "Username is required",
                  minLength: {
                    value: 3,
                    message: "Username must be at least 3 characters",
                  },
                  maxLength: {
                    value: 30,
                    message: "Username must be 30 characters or less",
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

            {mode === "signup" && (
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email
                </label>
                <input
                  className="form-input"
                  type="email"
                  id="email"
                  placeholder="Enter your email"
                  {...register("email", {
                    required: "Email is required",
                  })}
                />
                {errors.email && (
                  <span className="form-error">{errors.email.message}</span>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                className="form-input"
                type="password"
                id="password"
                placeholder="Enter your password"
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
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? mode === "signup"
                  ? "Signing Up..."
                  : "Logging In..."
                : mode === "signup"
                ? "Sign Up"
                : "Login"}
            </button>
          </form>

          <div className="auth-switch">
            {mode === "signup" ? (
              <p>
                Already have an account?{" "}
                <span
                  className="auth-link"
                  onClick={() => switchMode("login")}
                  role="button"
                  tabIndex={0}
                >
                  Login
                </span>
              </p>
            ) : (
              <p>
                Don't have an account?{" "}
                <span
                  className="auth-link"
                  onClick={() => switchMode("signup")}
                  role="button"
                  tabIndex={0}
                >
                  Sign Up
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}