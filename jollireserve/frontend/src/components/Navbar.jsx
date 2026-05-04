import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function Navbar({ user, onLogout }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";
  const showAdmin = isAdmin || isStaff;

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [loc.pathname]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && menuOpen) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [menuOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  if (loc.pathname === "/tv") return null;

  const isActive = (path) => loc.pathname === path;

  const navLinkClass = (path) =>
    `px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
      isActive(path)
        ? "bg-[var(--red)] text-white shadow-md"
        : "text-[var(--text-main)] hover:bg-[var(--bg-subtle)] hover:text-[var(--red)]"
    }`;

  const mobileNavLinkClass = (path) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive(path)
        ? "bg-[var(--red)] text-white"
        : "text-[var(--text-main)] hover:bg-[var(--bg-subtle)]"
    }`;

  return (
    <>
      {/* Main Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--red)] flex items-center justify-center">
                <span className="text-white text-lg font-bold">J</span>
              </div>
              <span className="font-bold text-xl tracking-tight">
                <span className="text-[var(--text-main)]">Jolli</span>
                <span className="text-[var(--red)]">Reserve</span>
              </span>
            </Link>

            {/* Desktop Navigation - Center */}
            <nav className="hidden md:flex items-center gap-1">
              <Link className={navLinkClass("/")} to="/">
                Home
              </Link>

              {!isAdmin && (
                <>
                  <Link className={navLinkClass("/reservations")} to="/reservations">
                    Reservations
                  </Link>
                  <Link className={navLinkClass("/queue")} to="/queue">
                    Queue
                  </Link>
                </>
              )}

              {showAdmin && (
                <>
                  <Link className={navLinkClass("/tv")} to="/tv">
                    TV
                  </Link>
                  <Link className={navLinkClass("/scan")} to="/scan">
                    Scan
                  </Link>
                  <Link className={navLinkClass("/admin")} to="/admin">
                    Admin
                  </Link>
                </>
              )}

              {user && (
                <Link className={navLinkClass("/profile")} to="/profile">
                  Profile
                </Link>
              )}
            </nav>

            {/* Desktop Right Actions */}
            <div className="hidden md:flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggle}
                className="p-2 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors"
                aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
                title={dark ? "Light mode" : "Dark mode"}
              >
                {dark ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* User Actions */}
              {user ? (
                <>
                  <span className="px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] truncate max-w-[150px]">
                    {user.name || user.email}
                  </span>
                  <button
                    onClick={() => {
                      onLogout();
                      navigate("/login");
                    }}
                    className="px-4 py-2 bg-[var(--red)] text-white text-sm font-medium rounded-full hover:bg-[var(--red-hover)] transition-colors shadow-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <span className="px-3 py-1.5 text-sm font-medium text-[var(--text-muted)]">Guest</span>
                  <Link
                    to="/login"
                    className="px-4 py-2 bg-[var(--red)] text-white text-sm font-medium rounded-full hover:bg-[var(--red-hover)] transition-colors shadow-sm"
                  >
                    Login
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={toggle}
                className="p-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-main)]"
                aria-label={dark ? "Light mode" : "Dark mode"}
              >
                {dark ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              <button
                ref={buttonRef}
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-main)]"
                aria-expanded={menuOpen}
                aria-label="Toggle navigation menu"
              >
                {menuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMenuOpen(false)}
          />

          {/* Mobile Menu Panel */}
          <div
            ref={menuRef}
            className="fixed top-16 left-0 right-0 bg-white dark:bg-gray-900 border-b border-[var(--border)] shadow-lg z-50 md:hidden max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <nav className="px-4 py-4 space-y-1">
              {/* Main Section */}
              <div className="space-y-1">
                <p className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Menu
                </p>
                <Link className={mobileNavLinkClass("/")} to="/">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Home
                </Link>

                {!isAdmin && (
                  <>
                    <Link className={mobileNavLinkClass("/reservations")} to="/reservations">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Reservations
                    </Link>
                    <Link className={mobileNavLinkClass("/queue")} to="/queue">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Queue
                    </Link>
                  </>
                )}
              </div>

              {/* Operations Section - Staff/Admin Only */}
              {showAdmin && (
                <div className="space-y-1 pt-2 border-t border-[var(--border)]">
                  <p className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Operations
                  </p>
                  <Link className={mobileNavLinkClass("/tv")} to="/tv">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    TV Display
                  </Link>
                  <Link className={mobileNavLinkClass("/scan")} to="/scan">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Scan QR
                  </Link>
                  <Link className={mobileNavLinkClass("/admin")} to="/admin">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Admin Dashboard
                  </Link>
                </div>
              )}

              {/* Account Section */}
              <div className="space-y-1 pt-2 border-t border-[var(--border)]">
                <p className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Account
                </p>
                {user ? (
                  <>
                    <Link className={mobileNavLinkClass("/profile")} to="/profile">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Profile
                    </Link>
                    <button
                      onClick={() => {
                        onLogout();
                        navigate("/login");
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-[var(--red)] text-white hover:bg-[var(--red-hover)] transition-colors"
                    to="/login"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Login / Register
                  </Link>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}