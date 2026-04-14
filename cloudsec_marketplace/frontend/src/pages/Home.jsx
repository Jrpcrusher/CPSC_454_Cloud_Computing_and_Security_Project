import { useState } from "react";
import { Link } from "react-router-dom";
import { getAllCreators } from "../data/creators";
import CreatorCard from "../components/CreatorCard";

const ALL_TAGS = [
  "All",
  "Anime",
  "Pixel Art",
  "Portraits",
  "Cyberpunk",
  "Chibi",
  "Dark Fantasy",
  "Character Design",
  "Game Assets",
];

export default function Home() {
  const [activeTag, setActiveTag] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = getAllCreators().filter((c) => {
    const matchesTag = activeTag === "All" || c.tags.includes(activeTag);
    const matchesSearch =
      search === "" ||
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      c.bio.toLowerCase().includes(search.toLowerCase());
    return matchesTag && matchesSearch;
  });

  return (
    <div>
      {/* Hero */}
      <section className="home-hero">
        <div className="container hero-content">
          <h1 className="home-title">Commission Art You'll Love</h1>
          <p className="home-subtitle">
            Browse talented creators, explore their styles, and request custom
            artwork — all in one place.
          </p>
          <div className="hero-cta-row">
            <Link to="/signup" className="btn btn-primary btn-hero">
              Get Started Free
            </Link>
            <a href="#creators" className="btn btn-secondary btn-hero">
              Browse Creators
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-icon">🔍</div>
              <h3 className="step-title">1. Find a Creator</h3>
              <p className="step-desc">
                Browse creators by art style, tags, and pricing. View their
                portfolio to find your perfect match.
              </p>
            </div>
            <div className="step-card">
              <div className="step-icon">✏️</div>
              <h3 className="step-title">2. Submit a Request</h3>
              <p className="step-desc">
                Fill out a detailed request form — describe your vision, pick a
                tier, and add reference images.
              </p>
            </div>
            <div className="step-card">
              <div className="step-icon">🎨</div>
              <h3 className="step-title">3. Get Your Art</h3>
              <p className="step-desc">
                The creator accepts and gets to work. Track progress in your
                dashboard and receive your final piece.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Browse creators */}
      <section className="creators-section" id="creators">
        <div className="container">
          <div className="creators-header">
            <h2 className="section-title">Featured Creators</h2>
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search by name or style..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Tag filter */}
          <div className="tag-filter">
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`tag-filter-btn ${
                  activeTag === tag ? "tag-filter-btn--active" : ""
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Creator grid */}
          {filtered.length > 0 ? (
            <div className="creator-grid">
              {filtered.map((creator) => (
                <CreatorCard key={creator.id} creator={creator} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>
                No creators match your search. Try a different tag or keyword.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
