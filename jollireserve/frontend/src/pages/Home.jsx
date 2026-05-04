import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { FullPageLoader } from "../components/LoadingStates";
import Button from "../components/Button";

export default function Home({ user }) {
  const isAdmin = user?.role === "admin";
  
  // State for active reservations and queue
  const [activeReservation, setActiveReservation] = useState(null);
  const [activeQueue, setActiveQueue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !isAdmin) {
      checkUserStatus();
    } else {
      setLoading(false);
    }
  }, [user, isAdmin]);

  const checkUserStatus = async () => {
    try {
      setLoading(true);
      // Check for active reservations
      const data = await api.myReservations();
      const reservations = data.reservations || [];
      const pendingReservation = reservations.find(r => 
        r.status === "pending" || r.status === "confirmed"
      );
      if (pendingReservation) {
        setActiveReservation(pendingReservation);
      }

      // Check for active queue entry
      const queueData = await api.queueActive();
      const activeEntries = queueData.entries || [];
      const myQueueEntry = activeEntries.find(q => 
        q.user_id === user?.id || q.email === user?.email
      );
      if (myQueueEntry) {
        setActiveQueue(myQueueEntry);
      }
    } catch (err) {
      console.log("Status check failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const hasActiveBooking = activeReservation || activeQueue;

  // Show full page loader while checking user status
  if (loading && user && !isAdmin) {
    return <FullPageLoader message="Checking your reservations..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--bg-body)] to-[var(--bg-subtle)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Content */}
            <div className="order-2 lg:order-1 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--red)]/10 text-[var(--red)] text-sm font-medium mb-6">
                <span>🍽️</span>
                <span>Smart Restaurant System</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] mb-6">
                {isAdmin ? (
                  <>
                    <span className="text-[var(--red)]">Admin</span>{" "}
                    <span className="text-[var(--text-main)]">Dashboard</span>
                  </>
                ) : (
                  <>
                    <span className="text-[var(--text-main)]">Skip the Wait,</span>
                    <br />
                    <span className="text-[var(--red)]">Savor the Moment</span>
                  </>
                )}
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-[var(--text-muted)] mb-8 max-w-xl mx-auto lg:mx-0">
                {isAdmin
                  ? "Manage reservations, monitor queue, and streamline operations—all in one place."
                  : "Reserve your table or join the queue in seconds. Get real-time updates and instant confirmations."
                }
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                {isAdmin ? (
                  <Link to="/admin">
                    <Button size="lg" leftIcon={<span>📊</span>}>
                      Open Admin Dashboard
                    </Button>
                  </Link>
                ) : user ? (
                  <>
                    <Link to="/reservations">
                      <Button size="lg" leftIcon={<span>📅</span>} fullWidth>
                        Reserve Table
                      </Button>
                    </Link>
                    <Link to="/queue">
                      <Button variant="secondary" size="lg" leftIcon={<span>🐝</span>} fullWidth>
                        Join Queue
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/login">
                      <Button size="lg" leftIcon={<span>✨</span>} fullWidth>
                        Get Started
                      </Button>
                    </Link>
                    <Link to="/tv">
                      <Button variant="secondary" size="lg" leftIcon={<span>📺</span>} fullWidth>
                        View Live Queue
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Trust Indicators */}
              {!isAdmin && (
                <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-4 sm:gap-6 text-sm text-[var(--text-muted)]">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Instant Confirmation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Real-time Updates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Smart Queue</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="order-1 lg:order-2 w-full lg:w-auto">
            <div className="card card-large overflow-hidden" style={{ padding: 0 }}>
              <img
                alt="Delicious food at restaurant"
                className="w-full object-cover"
                style={{ height: "240px", sm: "280px", md: "320px", minHeight: "240px" }}
                src="https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=1200&q=60"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ACTIVE BOOKING ALERT - Shows if user has reservation or queue - Mobile Optimized */}
      {user && !isAdmin && hasActiveBooking && (
        <section className="mb-6 animate-fade-in">
          <div className="card-premium p-4 sm:p-5 border-l-4 border-[var(--red)] bg-gradient-to-r from-[var(--red-glow)] to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--red)]/10 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                <span className="text-xl sm:text-2xl">📋</span>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-bold text-base sm:text-lg mb-1">You have an active booking!</h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-3">
                  You already have an active {activeReservation && activeQueue ? 'reservation AND queue spot' : activeReservation ? 'reservation' : 'queue spot'}.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center sm:justify-start">
                  {activeReservation && (
                    <Link 
                      to="/reservations" 
                      className="btn btn-primary btn-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                      <span>📅</span>
                      <span className="hidden sm:inline">View Reservation</span>
                      <span className="sm:hidden">Reservation</span>
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </Link>
                  )}
                  {activeQueue && (
                    <Link 
                      to="/queue" 
                      className="btn btn-secondary btn-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                      <span>🐝</span>
                      <span className="hidden sm:inline">View Queue Status</span>
                      <span className="sm:hidden">Queue Status</span>
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    </Link>
                  )}
                </div>
              </div>
              <div className="hidden sm:block text-right">
                <span className="badge badge-md badge-success">Active</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VIP DASHBOARD - For Logged-in Users */}
      {user && !isAdmin && !loading && (
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