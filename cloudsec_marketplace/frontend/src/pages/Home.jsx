import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CreatorCard from "../components/CreatorCard";
import api from "../services/apiClient";

export default function Home() {
  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/home/profiles");
        const data = Array.isArray(res) ? res : [];

        if (!cancelled) {
          setProfiles(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load creators.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfiles();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProfiles = profiles.filter((profile) => {
    const query = search.toLowerCase();

    const username = (profile.username || "").toLowerCase();
    const creatorUsername = (profile.creator_username || "").toLowerCase();
    const description = (profile.description || "").toLowerCase();

    return (
      query === "" ||
      username.includes(query) ||
      creatorUsername.includes(query) ||
      description.includes(query)
    );
  });

  return (
    <div>
      <section className="home-hero">
        <div className="container hero-content">
          <h1 className="home-title">Commission Art</h1>
          <p className="home-subtitle">
            Browse creators, view their public profiles, and request custom artwork.
          </p>
          <div className="hero-cta-row">
            <Link to="/signup" className="btn btn-primary btn-hero">
              Get Started
            </Link>
            <a href="#creators" className="btn btn-secondary btn-hero">
              Browse Creators
            </a>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-icon">🔍</div>
              <h3 className="step-title">1. Browse Creators</h3>
              <p className="step-desc">
                View creator profiles and their uploaded public images.
              </p>
            </div>
            <div className="step-card">
              <div className="step-icon">✏️</div>
              <h3 className="step-title">2. Submit a Request</h3>
              <p className="step-desc">
                Send a commission request to the creator you want to work with.
              </p>
            </div>
            <div className="step-card">
              <div className="step-icon">🎨</div>
              <h3 className="step-title">3. Manage Your Order</h3>
              <p className="step-desc">
                Track your commission through the dashboard and payment flow.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="creators-section" id="creators">
        <div className="container">
          <div className="creators-header">
            <h2 className="section-title">Creators</h2>
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search by username or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="empty-state">
              <p>Loading creators...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p>{error}</p>
            </div>
          ) : filteredProfiles.length > 0 ? (
            <div className="creator-grid">
              {filteredProfiles.map((profile) => (
                <CreatorCard key={profile.user_id} creator={profile} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No creators match your search.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}