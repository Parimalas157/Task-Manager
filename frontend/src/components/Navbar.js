import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-brand">
        📋 TaskFlow
      </Link>
      {user && (
        <div className="navbar-user">
          <span className="navbar-username">{user.name}</span>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
