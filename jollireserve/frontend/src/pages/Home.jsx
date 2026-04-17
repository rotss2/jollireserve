import React from "react";
import { Link } from "react-router-dom";

export default function Home({ user }) {
  const isAdmin = user?.role === "admin";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6">
      
      {/* HERO SECTION - Clear Visual Hierarchy */}
      <section className="mb-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left: Content */}
          <div className="order-2 lg:order-1">
            {/* Badge - Context */}
            <div className="badge badge-md badge-secondary mb-6">
              🍽️ Restaurant Management System
            </div>
            
            {/* Headline - Primary Focus */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6">
              {isAdmin ? (
                <>
                  <span style={{ color: "var(--red)" }}>Admin</span> Dashboard
                </>
              ) : (
                <>
                  Skip the Wait, <br />
                  <span style={{ color: "var(--red)" }}>Savor the Moment</span>
                </>
              )}
            </h1>
            
            {/* Subheadline - Supporting Info */}
            <p className="text-lg md:text-xl mb-8" style={{ color: "var(--text-muted)", maxWidth: "480px" }}>
              {isAdmin 
                ? "Manage reservations, queue, and operations from one powerful dashboard."
                : "Reserve your table or join the queue in seconds. Real-time updates, instant confirmations."
              }
            </p>
            
            {/* CTA Buttons - Clear Action Hierarchy */}
            <div className="flex flex-col sm:flex-row gap-4">
              {isAdmin ? (
                <Link 
                  to="/admin" 
                  className="btn btn-primary btn-lg btn-icon"
                  style={{ justifyContent: "center" }}
                >
                  <span>📊</span>
                  Open Admin Dashboard
                </Link>
              ) : user ? (
                <>
                  <Link 
                    to="/reservations" 
                    className="btn btn-primary btn-lg btn-icon"
                    style={{ justifyContent: "center" }}
                  >
                    <span>📅</span>
                    Reserve a Table
                  </Link>
                  <Link 
                    to="/queue" 
                    className="btn btn-secondary btn-lg btn-icon"
                    style={{ justifyContent: "center" }}
                  >
                    <span>🐝</span>
                    Join Live Queue
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="btn btn-primary btn-lg btn-icon"
                    style={{ justifyContent: "center" }}
                  >
                    <span>✨</span>
                    Get Started
                  </Link>
                  <Link 
                    to="/tv" 
                    className="btn btn-tertiary btn-lg"
                    style={{ justifyContent: "center" }}
                  >
                    � View Live Queue
                  </Link>
                </>
              )}
            </div>
            
            {/* Trust Indicators */}
            {!isAdmin && (
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm" style={{ color: "var(--text-muted)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Instant Confirmation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Real-time Updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>No Registration Required</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Right: Hero Image */}
          <div className="order-1 lg:order-2">
            <div className="card card-large overflow-hidden" style={{ padding: 0 }}>
              <img
                alt="Delicious food at restaurant"
                className="w-full object-cover"
                style={{ height: "320px", minHeight: "320px" }}
                src="https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=1200&q=60"
              />
            </div>
          </div>
        </div>
      </section>

      {/* VIP DASHBOARD - For Logged-in Users */}
      {user && !isAdmin && (
        <section className="mb-8 animate-fade-in-up">
          {/* VIP Status Card */}
          <div className="card-premium p-6 mb-6 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-subtle)]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <svg className="w-20 h-20 progress-ring">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="226"
                      strokeDashoffset="68"
                      className="progress-ring-circle"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#d4af37" />
                        <stop offset="100%" stopColor="#f4d03f" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl">🥈</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="vip-badge">Silver Member</span>
                    <span className="text-xs text-[var(--text-muted)]">• 350 points</span>
                  </div>
                  <h3 className="font-bold text-lg">Welcome back, {user?.name?.split(' ')[0] || 'Guest'}! 👋</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    You're only <span className="font-bold text-[var(--red)]">150 points</span> away from Gold status
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link to="/profile" className="btn btn-secondary btn-sm">
                  View Profile
                </Link>
              </div>
            </div>

            {/* Benefits Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[var(--border)]">
              <div className="text-center">
                <p className="text-2xl mb-1">⚡</p>
                <p className="text-xs font-semibold">Priority Seating</p>
                <p className="text-[10px] text-[var(--text-muted)]">Skip 2 queue spots</p>
              </div>
              <div className="text-center">
                <p className="text-2xl mb-1">🎁</p>
                <p className="text-xs font-semibold">Birthday Treat</p>
                <p className="text-[10px] text-[var(--text-muted)]">Free Peach Mango Pie</p>
              </div>
              <div className="text-center opacity-50">
                <p className="text-2xl mb-1">🔒</p>
                <p className="text-xs font-semibold">Gold Exclusive</p>
                <p className="text-[10px] text-[var(--text-muted)]">Unlock at 500 pts</p>
              </div>
              <div className="text-center opacity-50">
                <p className="text-2xl mb-1">👑</p>
                <p className="text-xs font-semibold">Platinum VIP</p>
                <p className="text-[10px] text-[var(--text-muted)]">Unlock at 1000 pts</p>
              </div>
            </div>
          </div>

          {/* Smart Recommendations */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="card card-interactive card-normal">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--red)]/10 flex items-center justify-center text-2xl">
                  🍗
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[var(--red)] font-semibold mb-1">AI RECOMMENDATION</p>
                  <h4 className="font-bold mb-1">Your Usual Order</h4>
                  <p className="text-sm text-[var(--text-muted)] mb-3">
                    2pc Chicken Joy + Spaghetti + Peach Mango Pie
                  </p>
                  <Link to="/reservations" className="btn btn-primary btn-sm w-full">
                    Pre-order Now
                  </Link>
                </div>
              </div>
            </div>

            <div className="card card-interactive card-normal">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-2xl">
                  📅
                </div>
                <div className="flex-1">
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">SMART SUGGESTION</p>
                  <h4 className="font-bold mb-1">Your Preferred Time</h4>
                  <p className="text-sm text-[var(--text-muted)] mb-3">
                    You usually dine at 7:00 PM on Fridays
                  </p>
                  <Link to="/reservations" className="btn btn-secondary btn-sm w-full">
                    Book for 7:00 PM
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Live Queue Status */}
          <div className="card card-interactive card-normal mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <h4 className="font-bold">Live Queue Status</h4>
              </div>
              <span className="text-xs text-[var(--text-muted)]">Updated just now</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[var(--text-muted)]">Current Wait</span>
                  <span className="font-bold">18-25 minutes</span>
                </div>
                <div className="h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                  <div className="h-full w-3/5 bg-gradient-to-r from-green-500 to-yellow-500 rounded-full" />
                </div>
              </div>
              <div className="text-center px-4 border-l border-[var(--border)]">
                <p className="text-2xl font-black text-[var(--red)]">8</p>
                <p className="text-xs text-[var(--text-muted)]">parties ahead</p>
              </div>
            </div>
            <Link 
              to="/queue" 
              className="btn btn-primary btn-md w-full mt-4"
            >
              <span>🐝</span> Join Queue Now
            </Link>
          </div>
        </section>
      )}

      {/* HOW IT WORKS - For New Users */}
      {!user && !isAdmin && (
        <section className="mb-12">
          <div className="card card-large">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              How It <span style={{ color: "var(--red)" }}>Works</span>
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"
                  style={{ background: "var(--red)", color: "white" }}
                >
                  1
                </div>
                <h3 className="font-bold text-lg mb-2">Choose Your Option</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Reserve a table for later or join the live queue for immediate seating.
                </p>
              </div>
              
              {/* Step 2 */}
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"
                  style={{ background: "var(--red)", color: "white" }}
                >
                  2
                </div>
                <h3 className="font-bold text-lg mb-2">Get Confirmation</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Receive instant confirmation with your queue number or reservation details.
                </p>
              </div>
              
              {/* Step 3 */}
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"
                  style={{ background: "var(--red)", color: "white" }}
                >
                  3
                </div>
                <h3 className="font-bold text-lg mb-2">Enjoy Your Meal</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Get notified when your table is ready. No more waiting in line!
                </p>
              </div>
            </div>
            
            {/* CTA */}
            <div className="text-center mt-8">
              <Link to="/login" className="btn btn-primary btn-md">
                Start Now — It's Free
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* FEATURE CARDS - Clear Value Propositions */}
      {!isAdmin && (
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Why Choose <span style={{ color: "var(--red)" }}>JolliReserve</span>?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="card card-interactive card-normal">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
                style={{ background: "rgba(200, 0, 10, 0.1)" }}
              >
                �
              </div>
              <h3 className="font-bold text-xl mb-3">Smart Reservations</h3>
              <p className="text-base mb-4" style={{ color: "var(--text-muted)" }}>
                Book your table in advance. Choose your preferred time, party size, and seating area.
              </p>
              <Link 
                to="/reservations" 
                className="btn btn-tertiary btn-sm"
                style={{ padding: 0, minHeight: "auto" }}
              >
                Learn more →
              </Link>
            </div>
            
            {/* Feature 2 */}
            <div className="card card-interactive card-normal">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
                style={{ background: "rgba(200, 0, 10, 0.1)" }}
              >
                🐝
              </div>
              <h3 className="font-bold text-xl mb-3">Live Queue</h3>
              <p className="text-base mb-4" style={{ color: "var(--text-muted)" }}>
                Walk in and join the digital queue. Get real-time position updates and alerts when ready.
              </p>
              <Link 
                to="/queue" 
                className="btn btn-tertiary btn-sm"
                style={{ padding: 0, minHeight: "auto" }}
              >
                Learn more →
              </Link>
            </div>
            
            {/* Feature 3 */}
            <div className="card card-interactive card-normal">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
                style={{ background: "rgba(200, 0, 10, 0.1)" }}
              >
                📱
              </div>
              <h3 className="font-bold text-xl mb-3">Real-time Updates</h3>
              <p className="text-base mb-4" style={{ color: "var(--text-muted)" }}>
                Track your queue position live. Get instant notifications when your table is ready.
              </p>
              <Link 
                to="/tv" 
                className="btn btn-tertiary btn-sm"
                style={{ padding: 0, minHeight: "auto" }}
              >
                View Board →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ADMIN QUICK LINKS */}
      {isAdmin && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/admin" className="card card-interactive card-normal">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-bold">Dashboard</h3>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                Manage operations
              </p>
            </Link>
            <Link to="/tv" className="card card-interactive card-normal">
              <div className="text-3xl mb-3">📺</div>
              <h3 className="font-bold">TV Display</h3>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                Live queue board
              </p>
            </Link>
            <Link to="/scan" className="card card-interactive card-normal">
              <div className="text-3xl mb-3">📷</div>
              <h3 className="font-bold">QR Scanner</h3>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                Check-in guests
              </p>
            </Link>
            <Link to="/profile" className="card card-interactive card-normal">
              <div className="text-3xl mb-3">👤</div>
              <h3 className="font-bold">My Profile</h3>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                Account settings
              </p>
            </Link>
          </div>
        </section>
      )}

    </div>
  );
}