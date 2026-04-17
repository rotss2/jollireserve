// Admin nav fix - hides customer links from admin
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function Navbar({ user, onLogout }) {
  const loc      = useLocation();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const active    = (path) => loc.pathname === path ? "bg-[var(--red)] text-white" : "hover:bg-[var(--bg-subtle)]";
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

        {/* Desktop nav links - ALL USERS see all main navigation */}
        <div className="ml-auto hidden md:flex items-center gap-1">
          {/* Main navigation for all users */}
          <Link className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${active("/")}`} to="/">Home</Link>
          
          {!isAdmin && (
            <>
              <Link className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${active("/reservations")}`} to="/reservations">Reservations</Link>
              <Link className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${active("/queue")}`} to="/queue">Queue</Link>
            </>
          )}
          
          {/* Staff and Admin see operational links */}
          {showAdmin && (
            <>
              <Link className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${active("/tv")}`} to="/tv">TV</Link>
              <Link className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${active("/scan")}`} to="/scan">Scan</Link>
              <Link className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${active("/admin")}`} to="/admin">Admin</Link>
            </>
          )}
          
          {/* Profile link in menu for logged-in users */}
          {user && (
            <Link className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${active("/profile")}`} to="/profile">Profile</Link>
          )}
        </div>

        {/* Desktop right - SIMPLIFIED: No profile icon, clean layout */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle */}
          <button 
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-card)] transition-all duration-200 border border-[var(--border)]" 
            onClick={toggle} 
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? "☀️" : "🌙"}
          </button>
          
          {user ? (
            <>
              {/* User Name Badge */}
              <span className="px-3 py-1.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] text-sm font-medium text-[var(--text-main)]">
                {user.name || user.email}
              </span>
              
              {/* Logout Button */}
              <button 
                className="px-4 py-2 rounded-full bg-[var(--red)] text-white text-sm font-semibold hover:bg-[var(--red-hover)] transition-all duration-200 shadow-md hover:shadow-lg" 
                onClick={() => { onLogout(); navigate("/login"); }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <span className="px-3 py-1.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] text-sm font-medium">Guest</span>
              <Link 
                className="px-4 py-2 rounded-full bg-[var(--red)] text-white text-sm font-semibold hover:bg-[var(--red-hover)] transition-all duration-200 shadow-md hover:shadow-lg" 
                to="/login"
              >
                Login
              </Link>
            </>
          )}
        </div>

        {/* Mobile right - SIMPLIFIED: No profile icon */}
        <div className="ml-auto flex md:hidden items-center gap-2">
          {/* Theme Toggle */}
          <button 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg bg-[var(--bg-subtle)] border border-[var(--border)]"
            onClick={toggle}
          >
            {dark ? "☀️" : "🌙"}
          </button>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-main)] transition-all duration-200"
            aria-label="Toggle menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile dropdown - IMPROVED: All menu items visible */}
      {menuOpen && (
        <div className="md:hidden bg-[var(--bg-card)] border-t border-b border-[var(--border)] p-4 flex flex-col gap-2 shadow-lg">
          {/* Main Navigation */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Menu</p>
            
            <Link 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${active("/")}`} 
              to="/" 
              onClick={() => setMenuOpen(false)}
            >
              <span>🏠</span> Home
            </Link>
            
            {!isAdmin && (
              <>
                <Link 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${active("/reservations")}`} 
                  to="/reservations" 
                  onClick={() => setMenuOpen(false)}
                >
                  <span>📅</span> Reservations
                </Link>
                <Link 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${active("/queue")}`} 
                  to="/queue" 
                  onClick={() => setMenuOpen(false)}
                >
                  <span>🐝</span> Queue
                </Link>
              </>
            )}
            
            {showAdmin && (
              <>
                <Link 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${active("/tv")}`} 
                  to="/tv" 
                  onClick={() => setMenuOpen(false)}
                >
                  <span>📺</span> TV Display
                </Link>
                <Link 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${active("/scan")}`} 
                  to="/scan" 
                  onClick={() => setMenuOpen(false)}
                >
                  <span>📷</span> Scan QR
                </Link>
                <Link 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${active("/admin")}`} 
                  to="/admin" 
                  onClick={() => setMenuOpen(false)}
                >
                  <span>⚙️</span> Admin
                </Link>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-[var(--border)] my-2" />

          {/* User Section */}
          {user ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Account</p>
              
              <Link 
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${active("/profile")}`} 
                to="/profile" 
                onClick={() => setMenuOpen(false)}
              >
                <span>👤</span> My Profile
              </Link>
              
              <button 
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold w-full text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200" 
                onClick={() => { onLogout(); navigate("/login"); setMenuOpen(false); }}
              >
                <span>🚪</span> Logout
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-subtle)]">
                <span>👋</span>
                <span className="text-sm font-medium">Guest User</span>
              </div>
              <Link 
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--red)] text-white text-sm font-semibold hover:bg-[var(--red-hover)] transition-all duration-200" 
                to="/login" 
                onClick={() => setMenuOpen(false)}
              >
                <span>🔑</span> Login / Register
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}