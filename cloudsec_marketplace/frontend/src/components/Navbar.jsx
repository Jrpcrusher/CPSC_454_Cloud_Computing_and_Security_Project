import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../assets/images/logo.png";

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <div className="headerWrapper">
      <div className="top-strip bg-blue">
        <div className="container">
          <p className="mb-0 mt-0 text-center">
            Due to <b>Finals Week</b> coming up, we will not be able to ship
            orders placed after April 30th. We apologize for the inconvenience.
          </p>
        </div>
      </div>

      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/">
            <img src={Logo} alt="Logo" className="logoImg" />
          </Link>
          <div className="navbar-links">
            <Link to="/" className="navbar-link">
              Home
            </Link>
            <Link to="/checkout" className="navbar-link">
              Cart
            </Link>
          </div>
          <div className="navbar-auth">
            {!user ? (
              <div className="navbar-auth-links">
                <Link to="/auth" className="btn btn-secondary">
                  Login
                </Link>
                <Link to="/auth" className="btn btn-primary">
                  Signup
                </Link>
              </div>
            ) : (
              <div className="navbar-user">
                <span className="navbar-greeting">Hello, {user.email}</span>
                <button className="btn btn-secondary" onClick={logout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
