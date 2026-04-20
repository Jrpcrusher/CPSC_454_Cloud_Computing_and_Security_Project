import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { getCreatorByUsername } from "../data/creators";
import { useAuth } from "../context/AuthContext";
import { useRequests } from "../context/RequestContext";
import api from "../services/apiClient";

// ── Stripe Payment Step ───────────────────────────────────────────────────────
function PaymentStep({ orderId, amountCents, onSuccess }) {
  const cardRef = useRef(null);
  const stripeRef = useRef(null);
  const cardElRef = useRef(null);
  const [cardError, setCardError] = useState(null);
  const [paying, setPaying] = useState(false);
  const [stripeError, setStripeError] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get("/payments/config")
      .then(({ publishable_key }) => {
        if (!active || !cardRef.current) return;
        const stripe = window.Stripe(publishable_key);
        const elements = stripe.elements();
        const cardEl = elements.create("card", {
          style: {
            base: {
              fontSize: "16px",
              color: "#e0e0e0",
              "::placeholder": { color: "#888" },
            },
          },
        });
        cardEl.mount(cardRef.current);
        cardEl.on("change", (e) => setCardError(e.error?.message || null));
        stripeRef.current = stripe;
        cardElRef.current = cardEl;
      })
      .catch(() => setStripeError("Failed to load Stripe. Please refresh and try again."));

    return () => {
      active = false;
      cardElRef.current?.destroy();
    };
  }, []);

  async function handlePay() {
    if (!stripeRef.current || !cardElRef.current) return;
    setPaying(true);
    setCardError(null);
    try {
      const { client_secret } = await api.post("/payments/create-intent", {
        order_id: orderId,
        amount: amountCents,
        currency: "usd",
      });

      const { error, paymentIntent } = await stripeRef.current.confirmCardPayment(
        client_secret,
        { payment_method: { card: cardElRef.current } },
      );

      if (error) {
        setCardError(error.message);
      } else if (paymentIntent.status === "requires_capture") {
        onSuccess();
      }
    } catch (err) {
      setCardError(err.message || "Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  const displayAmount = (amountCents / 100).toFixed(2);

  return (
    <div className="success-panel" style={{ textAlign: "left", maxWidth: 480, margin: "0 auto" }}>
      <div className="success-icon">💳</div>
      <h2 className="success-title">Complete Payment</h2>
      <p className="success-desc">
        Your commission request has been submitted. To confirm it, your payment of{" "}
        <strong>${displayAmount}</strong> will be held securely in escrow — you won't be
        charged until the work is completed and approved by both parties.
      </p>

      {stripeError ? (
        <div className="error-message">{stripeError}</div>
      ) : (
        <>
          <div
            ref={cardRef}
            style={{
              border: "1px solid #444",
              borderRadius: 6,
              padding: "12px 14px",
              marginBottom: "1rem",
              background: "#2b2d31",
            }}
          />
          {cardError && <p className="form-error" style={{ marginBottom: "0.75rem" }}>{cardError}</p>}
          <button
            className="btn btn-primary btn-large"
            onClick={handlePay}
            disabled={paying}
            style={{ width: "100%" }}
          >
            {paying ? "Processing…" : `Hold $${displayAmount} in Escrow`}
          </button>
          <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.75rem", textAlign: "center" }}>
            Funds are released to the artist only after you approve the final work.
          </p>
        </>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ArtRequest() {
  const { username } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const creator = getCreatorByUsername(username);
  const { user } = useAuth();
  const { submitRequest } = useRequests();

  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [paymentStep, setPaymentStep] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [pendingAmountCents, setPendingAmountCents] = useState(0);

  useEffect(() => {
    if (user?.creatorUsername === username) {
      navigate(`/creator/${username}`, { replace: true });
    }
  }, [user, username, navigate]);

  const defaultTier = location.state?.selectedTier || (creator?.tiers?.[0]?.name ?? "");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { tier: defaultTier } });

  const selectedTierName = watch("tier");

  if (!creator) {
    return (
      <div className="page"><div className="container">
        <div className="empty-state">
          <h2>Creator not found</h2>
          <Link to="/" className="btn btn-primary" style={{ marginTop: "1rem" }}>Back to Home</Link>
        </div>
      </div></div>
    );
  }

  if (!user) {
    return (
      <div className="page"><div className="container">
        <div className="empty-state">
          <h2>You need to be logged in</h2>
          <p>Please log in or create an account to request art.</p>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: "1rem" }}>Log In / Sign Up</Link>
        </div>
      </div></div>
    );
  }

  async function onSubmit(data) {
    setSubmitError(null);

    const result = await submitRequest(
      {
        creatorUsername: username,
        requesterEmail: user.email || user.username,
        ...data,
      },
      creator.user_id || null,
    );

    if (!result.success) {
      setSubmitError(result.error || "Failed to submit request. Please try again.");
      return;
    }

    // If creator has a backend user_id, proceed to Stripe payment
    if (creator.user_id && !result.isLocal) {
      const selectedTier = creator.tiers?.find((t) => t.name === data.tier);
      const amountCents = selectedTier ? Math.round(selectedTier.price * 100) : 0;

      if (amountCents > 0) {
        setPendingOrderId(result.request._backendId || result.request.id);
        setPendingAmountCents(amountCents);
        setPaymentStep(true);
        return;
      }
    }

    // Mock creator or no tier price — skip payment
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="page"><div className="container">
        <div className="success-panel">
          <div className="success-icon">🎉</div>
          <h2 className="success-title">Request Submitted!</h2>
          <p className="success-desc">
            Your request has been sent to <strong>{creator.displayName}</strong>.
            They'll review it and respond soon. Track it in your Dashboard.
          </p>
          <div className="success-actions">
            <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
            <Link to={`/creator/${username}`} className="btn btn-secondary">Back to Profile</Link>
          </div>
        </div>
      </div></div>
    );
  }

  if (paymentStep) {
    return (
      <div className="page"><div className="container">
        <PaymentStep
          orderId={pendingOrderId}
          amountCents={pendingAmountCents}
          onSuccess={() => setSubmitted(true)}
        />
      </div></div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="request-form-layout">
          {/* Creator summary sidebar */}
          <aside className="request-creator-summary">
            <img
              src={creator.avatar}
              alt={creator.displayName}
              className="request-creator-avatar"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${creator.displayName}&background=5865f2&color=fff&size=80`;
              }}
            />
            <h3 className="request-creator-name">{creator.displayName}</h3>
            <span className="request-creator-handle">@{username}</span>
            <div className="creator-card-tags" style={{ marginTop: "0.75rem" }}>
              {(creator.tags || []).map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
            {creator.tiers?.length > 0 && (
              <div className="request-tier-preview">
                <h4 className="request-tier-preview-title">Available Tiers</h4>
                {creator.tiers.map((t) => (
                  <div key={t.name} className="request-tier-preview-row">
                    <span>{t.name}</span>
                    <span className="tier-price-inline">${t.price}</span>
                  </div>
                ))}
              </div>
            )}
            <Link
              to={`/creator/${username}`}
              className="btn btn-secondary btn-block"
              style={{ marginTop: "1rem" }}
            >
              ← Back to Profile
            </Link>
          </aside>

          {/* Request form */}
          <div className="request-form-main">
            <h1 className="page-title">Request Art from {creator.displayName}</h1>
            <p className="request-form-sub">
              Be as detailed as possible — the more info you provide, the better the result.
            </p>

            {submitError && <div className="error-message">{submitError}</div>}

            <form className="request-form" onSubmit={handleSubmit(onSubmit)} noValidate>
              {creator.tiers?.length > 0 && (
                <div className="form-group">
                  <label className="form-label" htmlFor="tier">Commission Tier *</label>
                  <select id="tier" className="form-input" {...register("tier", { required: "Please select a tier" })}>
                    {creator.tiers.map((t) => (
                      <option key={t.name} value={t.name}>{t.name} — ${t.price}</option>
                    ))}
                  </select>
                  {errors.tier && <p className="form-error">{errors.tier.message}</p>}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="title">Request Title *</label>
                <input
                  id="title" type="text" className="form-input"
                  placeholder="e.g. Fantasy warrior OC full body"
                  {...register("title", {
                    required: "Please give your request a title",
                    minLength: { value: 5, message: "Title must be at least 5 characters" },
                  })}
                />
                {errors.title && <p className="form-error">{errors.title.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="description">
                  Description *
                  <span className="form-label-hint"> (character, scene, mood, colors, etc.)</span>
                </label>
                <textarea
                  id="description" className="form-input form-textarea" rows={5}
                  placeholder="Describe your character's appearance, the scene, color palette, mood/tone, etc."
                  {...register("description", {
                    required: "A description is required",
                    minLength: { value: 20, message: "Please provide at least 20 characters of detail" },
                  })}
                />
                {errors.description && <p className="form-error">{errors.description.message}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="referenceLinks">
                  Reference Links
                  <span className="form-label-hint"> (optional)</span>
                </label>
                <input id="referenceLinks" type="text" className="form-input"
                  placeholder="https://example.com/ref1, ..."
                  {...register("referenceLinks")}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="characterCount">Number of Characters</label>
                <select id="characterCount" className="form-input" {...register("characterCount")}>
                  <option value="1">1 character</option>
                  <option value="2">2 characters</option>
                  <option value="3">3 characters</option>
                  <option value="4+">4+ characters (contact first)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="deadline">
                  Preferred Deadline
                  <span className="form-label-hint"> (optional)</span>
                </label>
                <input id="deadline" type="date" className="form-input"
                  min={new Date().toISOString().split("T")[0]}
                  {...register("deadline")}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="notes">Additional Notes</label>
                <textarea id="notes" className="form-input form-textarea" rows={3}
                  placeholder="Anything else you'd like the creator to know..."
                  {...register("notes")}
                />
              </div>

              {/* Payment notice for backend creators with tiers */}
              {creator.user_id && creator.tiers?.length > 0 && (
                <div style={{ background: "rgba(88,101,242,0.1)", border: "1px solid rgba(88,101,242,0.3)", borderRadius: 6, padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.875rem", color: "#b0b4d4" }}>
                  💳 After submitting, you'll be asked to hold{" "}
                  <strong>
                    ${creator.tiers.find((t) => t.name === selectedTierName)?.price ?? "—"}
                  </strong>{" "}
                  in escrow. Funds are only released when you approve the final work.
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-large" disabled={isSubmitting}>
                {isSubmitting ? "Submitting…" : "Submit Art Request →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
