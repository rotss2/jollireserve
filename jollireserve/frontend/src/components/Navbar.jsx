import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function Navbar({ user, onLogout }) {
  const loc      = useLocation();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const active    = (path) => loc.pathname === path ? "bg-[var(--red)] text-white" : "hover:bg-black/5";
  const isAdmin   = user?.role === "admin";
  const isStaff   = user?.role === "staff";
  const showAdmin = isAdmin || isStaff;

  if (loc.pathname === "/tv") return null;

  return (
    <div className="w-full">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">

        {/* Logo */}
        <div className="font-extrabold tracking-tight text-xl flex-shrink-0">
          <span style={{ color: "var(--text-main)" }}>Jolli</span>
          <span className="text-[var(--red)]">Reserve</span>
        </div>

        {/* Desktop nav links */}
        <div className="ml-auto hidden md:flex items-center gap-2">
          {/* Customers and guests see Home, Reservations, Queue */}
          {!isAdmin && (
            <>
              <Link className={`px-4 py-2 rounded-full text-sm font-semibold ${active("/")}`} to="/">Home</Link>
              <Link className={`px-4 py-2 rounded-full text-sm font-semibold ${active("/reservations")}`} to="/reservations">Reservations</Link>
              <Link className={`px-4 py-2 rounded-full text-sm font-semibold ${active("/queue")}`} to="/queue">Queue</Link>
            </>
          )}
          {/* Staff and Admin see operational links */}
          {showAdmin && <Link className={`px-4 py-2 rounded-full text-sm font-semibold ${active("/tv")}`} to="/tv">TV</Link>}
          {showAdmin && <Link className={`px-4 py-2 rounded-full text-sm font-semibold ${active("/scan")}`} to="/scan">Scan</Link>}
          {showAdmin && <Link className={`px-4 py-2 rounded-full text-sm font-semibold ${active("/admin")}`} to="/admin">Admin</Link>}
        </div>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-3">
          <button className="theme-toggle" onClick={toggle} title={dark ? "Switch to light mode" : "Switch to dark mode"}>
            {dark ? "☀️" : "🌙"}
          </button>
          {user ? (
            <>
              <span className="navbar-pill px-3 py-1 rounded-full bg-white/70 border border-black/10 text-sm">
                {user.role === "customer" ? "Customer" : user.role.toUpperCase()} · {user.name || user.email}
              </span>
              <button className="btn btn-outline" onClick={() => { onLogout(); navigate("/login"); }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <span className="navbar-pill px-3 py-1 rounded-full bg-white/70 border border-black/10 text-sm">Guest</span>
              <Link className="btn btn-red" to="/login">Login / Register</Link>
            </>
          )}
        </div>

        {/* Mobile right */}
        <div className="ml-auto flex md:hidden items-center gap-2">
          <button className="theme-toggle" onClick={toggle}>
            {dark ? "☀️" : "🌙"}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "0.4rem 0.6rem",
              cursor: "pointer",
              color: "var(--text-main)",
              fontSize: "1.2rem",
              lineHeight: 1,
            }}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          style={{
            background: "var(--bg-card)",
            borderTop: "1px solid var(--border-soft)",
            borderBottom: "1px solid var(--border-soft)",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
          className="md:hidden"
        >
          {!isAdmin && (
            <>
              <Link className={`px-4 py-2 rounded-full text-sm font-semibold ${active("/")}`} to="/" onClick={() => setMenuOpen(false)}>Home</Link>
              <Link className={`px-4 py-2 rounded-full text-sm font-semibold ${active("/reservations")}`} to="/reservations" onClick={() => setMenuOpen(false)}>Reservations</Link>
              <Link className={`px-4 py-2 rounded-full text-sm font-semibold ${active("/queue")}`} to="/queue" onClick={() => setMenuOpen(false)}>Queue</Link>
            </>
          )}
          {showAdmin && <Link className={`px-4 py-2 rounded-full text-sm font-semibold ${active("/tv")}`} to="/tv" onClick={() => setMenuOpen(false)}>TV</Link>}
          {showAdmin && <Link className={`px-4 py-2 rounded-full text-sm font-semibold ${active("/scan")}`} to="/scan" onClick={() => setMenuOpen(false)}>Scan</Link>}
          {showAdmin && <Link className={`px-4 py-2 rounded-full text-sm font-semibold ${active("/admin")}`} to="/admin" onClick={() => setMenuOpen(false)}>Admin</Link>}

          <div style={{ height: "1px", background: "var(--border-soft)", margin: "0.25rem 0" }} />

          {user ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span className="navbar-pill px-3 py-2 rounded-full bg-white/70 border border-black/10 text-sm text-center">
                {user.role === "customer" ? "Customer" : user.role.toUpperCase()} · {user.name || user.email}
              </span>
              <button className="btn btn-outline w-full" onClick={() => { onLogout(); navigate("/login"); setMenuOpen(false); }}>
                Logout
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span className="navbar-pill px-3 py-2 rounded-full bg-white/70 border border-black/10 text-sm text-center">Guest</span>
              <Link className="btn btn-red w-full text-center" to="/login" onClick={() => setMenuOpen(false)}>
                Login / Register
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}