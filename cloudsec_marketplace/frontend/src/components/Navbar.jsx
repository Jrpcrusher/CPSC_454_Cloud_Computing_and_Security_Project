import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../assets/images/logo.png";

export default function Navbar() {
  const { user, isCreator, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Brand */}
        <Link to="/" className="navbar-brand-link">
          <img src={Logo} alt="Logo" className="logoImg" />
        </Link>

        {/* Center links */}
        <div className="navbar-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              "navbar-link" + (isActive ? " navbar-link--active" : "")
            }
          >
            Explore
          </NavLink>
          {user && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                "navbar-link" + (isActive ? " navbar-link--active" : "")
              }
            >
              Dashboard
            </NavLink>
          )}
          {user && isCreator && (
            <NavLink
              to={`/creator/${user.creatorUsername}`}
              className={({ isActive }) =>
                "navbar-link" + (isActive ? " navbar-link--active" : "")
              }
            >
              My Profile
            </NavLink>
          )}
        </div>

        {/* Right side */}
        <div className="navbar-auth">
          {!user ? (
            <div className="navbar-auth-links">
              <Link to="/login" className="btn btn-secondary btn-small">
                Log In
              </Link>
              <Link to="/signup" className="btn btn-primary btn-small">
                Sign Up
              </Link>
            </div>
          ) : (
            <div className="navbar-user">
              <Link to="/dashboard" className="navbar-username-btn" title={user.email}>
                {user.username || user.displayName}
              </Link>
              <button className="btn btn-primary btn-small" onClick={handleLogout}>
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
