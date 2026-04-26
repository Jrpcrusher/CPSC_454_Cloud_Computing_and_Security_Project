import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import api from "../services/apiClient";

function PaymentStep({ order, onSuccess, onError }) {
  const cardRef = useRef(null);
  const stripeRef = useRef(null);
  const cardElRef = useRef(null);

  const [loadingStripe, setLoadingStripe] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cardError, setCardError] = useState("");

  useEffect(() => {
    let active = true;

    async function setupStripe() {
      try {
        const config = await api.get("/payments/config");

        if (!active || !cardRef.current) return;

        const stripe = window.Stripe(config.publishable_key);
        const elements = stripe.elements();
        const card = elements.create("card", {
          style: {
            base: {
              fontSize: "16px",
              color: "#e0e0e0",
              "::placeholder": { color: "#888" },
            },
          },
        });

        card.mount(cardRef.current);
        card.on("change", (event) => {
          setCardError(event.error?.message || "");
        });

        stripeRef.current = stripe;
        cardElRef.current = card;
      } catch (err) {
        setCardError(err.message || "Failed to load Stripe.");
      } finally {
        if (active) {
          setLoadingStripe(false);
        }
      }
    }

    setupStripe();

    return () => {
      active = false;
      cardElRef.current?.destroy();
    };
  }, []);

  async function handlePay() {
    if (!stripeRef.current || !cardElRef.current) return;

    try {
      setPaying(true);
      setCardError("");

      const intent = await api.post("/payments/create-intent", {
        order_id: order.order_id,
      });

      const result = await stripeRef.current.confirmCardPayment(
        intent.client_secret,
        {
          payment_method: {
            card: cardElRef.current,
          },
        }
      );

      if (result.error) {
        setCardError(result.error.message || "Payment failed.");
        onError?.(result.error.message || "Payment failed.");
        return;
      }

      onSuccess();
    } catch (err) {
      setCardError(err.message || "Payment failed.");
      onError?.(err.message || "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  const amountDisplay =
    typeof order.amount === "number"
      ? `$${(order.amount / 100).toFixed(2)}`
      : "N/A";

  return (
    <div className="success-panel" style={{ textAlign: "left", maxWidth: 520, margin: "0 auto" }}>
      <div className="success-icon">💳</div>
      <h2 className="success-title">Authorize Payment</h2>
      <p className="success-desc">
        Your request has been created. To continue, authorize{" "}
        <strong>{amountDisplay}</strong>. The funds will be held in escrow and
        only captured after artwork is uploaded and both sides approve.
      </p>

      <div
        ref={cardRef}
        style={{
          border: "1px solid #444",
          borderRadius: 8,
          padding: "12px 14px",
          marginTop: "1rem",
          marginBottom: "1rem",
          background: "#2b2d31",
          minHeight: "46px",
        }}
      />

      {cardError && <p className="form-error">{cardError}</p>}

      <button
        className="btn btn-primary btn-large"
        onClick={handlePay}
        disabled={loadingStripe || paying}
        style={{ width: "100%", marginTop: "0.75rem" }}
      >
        {loadingStripe ? "Loading payment form..." : paying ? "Authorizing..." : "Authorize Payment"}
      </button>
    </div>
  );
}

export default function ArtRequest() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [creator, setCreator] = useState(null);
  const [creatorLoading, setCreatorLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [paymentStep, setPaymentStep] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      order_details: "",
      amountDollars: "",
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCreator() {
      try {
        setCreatorLoading(true);
        const res = await api.get(`/home/profiles/${userId}`);
        if (!cancelled) {
          setCreator(res);
        }
      } catch {
        if (!cancelled) {
          setCreator(null);
        }
      } finally {
        if (!cancelled) {
          setCreatorLoading(false);
        }
      }
    }

    loadCreator();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (creatorLoading) {
    return (
      <div className="page">
        <div className="container">
          <p style={{ padding: "2rem", color: "#888" }}>Loading...</p>
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
            <p>We could not find that creator profile.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Back to Home
            </Link>
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
            <h2>You need to be logged in</h2>
            <p>Please log in or create an account to request art.</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = user.user_id === creator.user_id;

  if (isOwnProfile) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>This is your own profile</h2>
            <p>You cannot submit a commission request to yourself.</p>
            <Link
              to={`/creator/${userId}`}
              className="btn btn-primary"
              style={{ marginTop: "1rem" }}
            >
              Back to Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    creator.creator_username || creator.username || `User ${creator.user_id}`;

  const avatarUrl =
    creator.pfp_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5865f2&color=fff&size=80`;

  async function onSubmit(data) {
    try {
      setSubmitError("");

      const amount = Math.round(Number(data.amountDollars) * 100);

      if (!amount || amount <= 0) {
        setSubmitError("Please enter a valid amount.");
        return;
      }

      const order = await api.post(`/home/profiles/${userId}/request`, {
        order_details: data.order_details,
        amount,
        currency: "usd",
      });

      setCreatedOrder(order);
      setPaymentStep(true);
    } catch (err) {
      setSubmitError(err.message || "Failed to submit request.");
    }
  }

  if (submitted && createdOrder) {
    return (
      <div className="page">
        <div className="container">
          <div className="success-panel">
            <div className="success-icon">🎉</div>
            <h2 className="success-title">Request Submitted</h2>
            <p className="success-desc">
              Your request was sent to <strong>{displayName}</strong> and your
              payment has been authorized and placed in escrow.
            </p>
            <div className="success-actions">
              <Link to={`/orders/${createdOrder.order_id}`} className="btn btn-primary">
                View Order
              </Link>
              <Link to="/dashboard" className="btn btn-secondary">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStep && createdOrder) {
    return (
      <div className="page">
        <div className="container">
          <PaymentStep
            order={createdOrder}
            onSuccess={() => setSubmitted(true)}
            onError={(msg) => setSubmitError(msg)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="request-form-layout">
          <aside className="request-creator-summary">
            <img
              src={avatarUrl}
              alt={displayName}
              className="request-creator-avatar"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5865f2&color=fff&size=80`;
              }}
            />
            <h3 className="request-creator-name">{displayName}</h3>

            {creator.username && (
              <span className="request-creator-handle">@{creator.username}</span>
            )}

            <p style={{ marginTop: "1rem", color: "#b5bac1" }}>
              {creator.description || "No description provided."}
            </p>

            <Link
              to={`/creator/${userId}`}
              className="btn btn-secondary btn-block"
              style={{ marginTop: "1rem" }}
            >
              Back to Profile
            </Link>
          </aside>

          <div className="request-form-main">
            <h1 className="page-title">Request Art from {displayName}</h1>
            <p className="request-form-sub">
              Submit your request first, then authorize payment to place funds in escrow.
            </p>

            {submitError && <div className="error-message">{submitError}</div>}

            <form className="request-form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="order_details">
                  Request Description
                </label>
                <textarea
                  id="order_details"
                  className="form-input form-textarea"
                  rows={8}
                  placeholder="Describe the artwork you want, including subject, style, references, pose, mood, colors, deadline, and anything else the creator should know."
                  {...register("order_details", {
                    required: "Please enter your request details",
                    minLength: {
                      value: 10,
                      message: "Please provide a bit more detail",
                    },
                  })}
                />
                {errors.order_details && (
                  <p className="form-error">{errors.order_details.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="amountDollars">
                  Payment Amount (USD)
                </label>
                <input
                  id="amountDollars"
                  type="number"
                  min="1"
                  step="0.01"
                  className="form-input"
                  placeholder="25.00"
                  {...register("amountDollars", {
                    required: "Please enter an amount",
                    min: {
                      value: 1,
                      message: "Amount must be at least $1.00",
                    },
                  })}
                />
                {errors.amountDollars && (
                  <p className="form-error">{errors.amountDollars.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-large"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Request..." : "Submit Request"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}