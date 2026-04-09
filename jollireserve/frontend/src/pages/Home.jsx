import React from "react";
import { Link } from "react-router-dom";

export default function Home({ user }) {
  const isAdmin = user?.role === "admin";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">

      {/* Hero Section */}
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="card p-6 md:p-10">
          <div className="badge mb-4">Intelligent Table Reservation & Queue Management</div>
          <h1 className="text-3xl md:text-5xl font-black leading-tight">
            {isAdmin ? "Admin Dashboard Access" : "Delight guests with faster seating and friendlier service."}
          </h1>
          <p className="mt-4 text-sm md:text-base" style={{ color: "var(--text-muted)" }}>
            {isAdmin
              ? "You have full access to manage users, tables, and view system analytics. Navigate to the Admin panel to manage the system."
              : "JolliReserve blends a joyful experience with practical staff controls, so every table turn feels smooth and every queue update feels clear."}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
            {!isAdmin && (
              <>
                <Link className="btn btn-red text-center" to="/reservations">Reserve a Table</Link>
                <Link className="btn btn-outline text-center" to="/queue">Join Queue</Link>
              </>
            )}
            <Link className="btn btn-outline text-center" to="/tv">📺 Live Queue Board</Link>
            {isAdmin && (
              <Link className="btn btn-red text-center" to="/admin">Go to Admin Dashboard</Link>
            )}
          </div>
        </div>

        {/* Hero image */}
        <div className="card overflow-hidden">
          <img
            alt="Restaurant"
            className="w-full object-cover"
            style={{ height: "240px", maxHeight: "340px" }}
            src="https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=1200&q=60"
          />
        </div>
      </div>

      {/* Feature cards - hidden for admin */}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-8">
          <div className="card p-5">
            <div className="text-2xl mb-2">📅</div>
            <div className="font-bold text-sm md:text-base">Smart Reservations</div>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              Book tables in seconds with instant confirmation and auto table assignment.
            </p>
          </div>
          <div className="card p-5">
            <div className="text-2xl mb-2">🐝</div>
            <div className="font-bold text-sm md:text-base">Live Queue Visibility</div>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              Guests and staff see real-time queue status and quick updates.
            </p>
          </div>
          <div className="card p-5 sm:col-span-2 md:col-span-1">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-bold text-sm md:text-base">Operations Board</div>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              Track tables, queue calls, and reservation flow from one admin dashboard.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}