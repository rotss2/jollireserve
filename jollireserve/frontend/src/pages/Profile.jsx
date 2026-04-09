import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../lib/api";
import Toast from "../components/Toast";

const activityIcons = {
  user_login: "🔑",
  user_logout: "👋",
  reservation_created: "📅",
  reservation_cancelled: "❌",
  queue_joined: "🐝",
  queue_called: "📢",
  queue_seated: "✅",
  profile_updated: "✏️"
};

const activityLabels = {
  user_login: "Logged in",
  user_logout: "Logged out",
  reservation_created: "Made reservation",
  reservation_cancelled: "Cancelled reservation",
  queue_joined: "Joined queue",
  queue_called: "Called to table",
  queue_seated: "Seated at table",
  profile_updated: "Updated profile"
};

export default function Profile({ user }) {
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [activity, setActivity] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    preferences: {
      default_party_size: 2,
      seating_preference: "indoor",
      dietary_restrictions: ""
    }
  });

  const ok = (msg) => setToast({ message: msg, type: "success" });
  const err = (e) => setToast({ message: e?.response?.data?.error || e.message || "Error", type: "error" });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [activityData, reservationsData] = await Promise.all([
        api.getActivity?.().catch(() => ({ activity: [] })),
        api.getReservations?.().catch(() => ({ reservations: [] }))
      ]);
      setActivity(activityData?.activity || []);
      setReservations(reservationsData?.reservations || []);
    } catch (e) {
      console.error("Failed to load profile data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    try {
      await api.updateProfile?.(profile);
      ok("Profile updated successfully!");
      setEditMode(false);
    } catch (e) {
      err(e);
    }
  }

  async function changePassword() {
    const current = prompt("Enter current password:");
    if (!current) return;
    const newPass = prompt("Enter new password (min 6 chars):");
    if (!newPass || newPass.length < 6) {
      err({ message: "Password must be at least 6 characters" });
      return;
    }
    try {
      await api.changePassword?.({ current_password: current, new_password: newPass });
      ok("Password changed successfully!");
    } catch (e) {
      err(e);
    }
  }

  const stats = {
    totalReservations: reservations.length,
    upcomingReservations: reservations.filter(r => r.status === "confirmed" && r.date >= new Date().toISOString().split('T')[0]).length,
    cancelledReservations: reservations.filter(r => r.status === "cancelled").length,
    totalLogins: activity.filter(a => a.action === "user_login").length
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-center">
        <div className="card p-8">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-black mb-2">Please Log In</h1>
          <p className="mb-4" style={{ color: "var(--text-muted)" }}>You need to be logged in to view your profile.</p>
          <Link to="/login" className="btn btn-red">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-4">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />

      {/* Header */}
      <div className="card p-6 mb-4" style={{ background: "linear-gradient(135deg, var(--red) 0%, #dc2626 100%)" }}>
        <div className="flex items-center gap-4">
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
            👤
          </div>
          <div style={{ color: "#fff" }}>
            <h1 className="text-2xl font-black">{user.name || user.email}</h1>
            <p className="opacity-80">{user.email} • Member since {user.created_at?.slice(0, 10)}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Reservations", value: stats.totalReservations, icon: "📅" },
          { label: "Upcoming", value: stats.upcomingReservations, icon: "📆" },
          { label: "Cancelled", value: stats.cancelledReservations, icon: "❌" },
          { label: "Logins", value: stats.totalLogins, icon: "🔑" }
        ].map(stat => (
          <div key={stat.label} className="card p-4 text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-black">{stat.value}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "overview", label: "📊 Overview" },
          { key: "activity", label: "📋 Activity History" },
          { key: "reservations", label: "📅 My Reservations" },
          { key: "settings", label: "⚙️ Settings" }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === t.key ? "bg-[var(--red)] text-white" : "bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card p-5">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            {tab === "overview" && (
              <div>
                <h2 className="font-black mb-4">Account Overview</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4" style={{ background: "var(--bg-subtle)", borderRadius: "0.75rem" }}>
                    <div className="font-semibold mb-2">📅 Recent Reservations</div>
                    {reservations.slice(0, 3).map(r => (
                      <div key={r.id} className="text-sm mb-2 p-2" style={{ background: "var(--bg-card)", borderRadius: "0.5rem" }}>
                        <div className="font-medium">{r.date} at {r.time}</div>
                        <div style={{ color: "var(--text-muted)" }}>Table {r.table_name || "TBD"} • {r.party_size} guests</div>
                      </div>
                    ))}
                    {reservations.length === 0 && <div className="text-sm" style={{ color: "var(--text-muted)" }}>No reservations yet.</div>}
                  </div>
                  <div className="p-4" style={{ background: "var(--bg-subtle)", borderRadius: "0.75rem" }}>
                    <div className="font-semibold mb-2">📋 Recent Activity</div>
                    {activity.slice(0, 5).map(a => (
                      <div key={a.id} className="text-sm mb-2 flex items-center gap-2">
                        <span>{activityIcons[a.action] || "📌"}</span>
                        <span>{activityLabels[a.action] || a.action}</span>
                        <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>{a.created_at?.slice(0, 16)}</span>
                      </div>
                    ))}
                    {activity.length === 0 && <div className="text-sm" style={{ color: "var(--text-muted)" }}>No activity recorded.</div>}
                  </div>
                </div>
              </div>
            )}

            {tab === "activity" && (
              <div>
                <h2 className="font-black mb-4">Activity History</h2>
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  {activity.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-3 mb-2" style={{ background: "var(--bg-subtle)", borderRadius: "0.5rem" }}>
                      <div style={{ fontSize: 20 }}>{activityIcons[a.action] || "📌"}</div>
                      <div style={{ flex: 1 }}>
                        <div className="font-medium">{activityLabels[a.action] || a.action}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {a.created_at?.slice(0, 16).replace('T', ' ')}
                        </div>
                        {a.details && (
                          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                            {JSON.stringify(a.details)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {activity.length === 0 && <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>No activity recorded yet.</div>}
                </div>
              </div>
            )}

            {tab === "reservations" && (
              <div>
                <h2 className="font-black mb-4">My Reservations</h2>
                {reservations.map(r => (
                  <div key={r.id} className="p-4 mb-3" style={{ background: "var(--bg-subtle)", borderRadius: "0.75rem" }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{r.date} at {r.time}</div>
                        <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                          {r.party_size} guests • Table {r.table_name || "TBD"}
                          {r.area_pref && ` • ${r.area_pref}`}
                        </div>
                        {r.special_requests && (
                          <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                            📝 {r.special_requests}
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        r.status === "confirmed" ? "bg-green-100 text-green-700" :
                        r.status === "cancelled" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
                {reservations.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📅</div>
                    <p style={{ color: "var(--text-muted)" }}>No reservations yet.</p>
                    <Link to="/reservations" className="btn btn-red mt-2 inline-block">Make a Reservation</Link>
                  </div>
                )}
              </div>
            )}

            {tab === "settings" && (
              <div>
                <h2 className="font-black mb-4">Profile Settings</h2>
                
                {!editMode ? (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3" style={{ background: "var(--bg-subtle)", borderRadius: "0.5rem" }}>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>Name</div>
                        <div>{user.name || "Not set"}</div>
                      </div>
                      <div className="p-3" style={{ background: "var(--bg-subtle)", borderRadius: "0.5rem" }}>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>Email</div>
                        <div>{user.email}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-outline" onClick={() => setEditMode(true)}>✏️ Edit Profile</button>
                      <button className="btn btn-outline" onClick={changePassword}>🔒 Change Password</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-3">
                      <label className="text-sm" style={{ color: "var(--text-muted)" }}>Display Name</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                        className="input w-full mt-1"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="text-sm" style={{ color: "var(--text-muted)" }}>Phone Number</label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={e => setProfile({ ...profile, phone: e.target.value })}
                        className="input w-full mt-1"
                        placeholder="Optional"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="text-sm" style={{ color: "var(--text-muted)" }}>Default Party Size</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={profile.preferences.default_party_size}
                        onChange={e => setProfile({ ...profile, preferences: { ...profile.preferences, default_party_size: Number(e.target.value) } })}
                        className="input w-full mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-red" onClick={saveProfile}>💾 Save Changes</button>
                      <button className="btn btn-outline" onClick={() => setEditMode(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
