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
      <Link to="/" className="navbar-brand">
        <img src={Logo} alt="Logo" className="navbar-logo" />
      </Link>

      <div className="navbar-links">
        <NavLink
          to="/"
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

        {user && (
          <NavLink
            to="/dashboard/transactions"
            className={({ isActive }) =>
              "navbar-link" + (isActive ? " navbar-link--active" : "")
            }
          >
            Transactions
          </NavLink>
        )}

        {user && isCreator && (
          <NavLink
            to="/dashboard/portfolio"
            className={({ isActive }) =>
              "navbar-link" + (isActive ? " navbar-link--active" : "")
            }
          >
            Portfolio
          </NavLink>
        )}

        {user && isCreator && user.user_id && (
          <NavLink
            to={`/creator/${user.user_id}`}
            className={({ isActive }) =>
              "navbar-link" + (isActive ? " navbar-link--active" : "")
            }
          >
            My Profile
          </NavLink>
        )}
      </div>

      <div className="navbar-actions">
        {!user ? (
          <>
            <Link to="/login" className="btn btn-secondary">
              Log In
            </Link>
            <Link to="/signup" className="btn btn-primary">
              Sign Up
            </Link>
          </>
        ) : (
          <>
            <span className="navbar-user">{user.username}</span>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Log Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}