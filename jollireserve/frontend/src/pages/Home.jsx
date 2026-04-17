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