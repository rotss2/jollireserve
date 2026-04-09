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
  profile_updated: "✏️",
  password_changed: "🔒"
};

const activityLabels = {
  user_login: "Logged in",
  user_logout: "Logged out",
  reservation_created: "Made reservation",
  reservation_cancelled: "Cancelled reservation",
  queue_joined: "Joined queue",
  queue_called: "Called to table",
  queue_seated: "Seated at table",
  profile_updated: "Updated profile",
  password_changed: "Changed password"
};

// Preference options
const SEATING_OPTIONS = [
  { value: "indoor", label: "🪴 Indoor", desc: "Comfortable indoor dining" },
  { value: "outdoor", label: "🌤️ Outdoor", desc: "Fresh air terrace" },
  { value: "vip", label: "👑 VIP", desc: "Premium experience" }
];

const NOTIFICATION_OPTIONS = [
  { key: "email_reservations", label: "📧 Reservation Confirmations", desc: "Email when booking confirmed" },
  { key: "email_queue", label: "🔔 Queue Updates", desc: "SMS/Email when table ready" },
  { key: "email_promos", label: "🎉 Promotions", desc: "Special offers & discounts" },
  { key: "sms_reminders", label: "📱 SMS Reminders", desc: "Text before reservation" }
];

export default function Profile({ user }) {
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [activity, setActivity] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [queueHistory, setQueueHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState("basic");
  
  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState("request"); // request, verify, success
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    preferences: {
      default_party_size: 2,
      seating_preference: "indoor",
      dietary_restrictions: "",
      special_occasions: "",
      notifications: {
        email_reservations: true,
        email_queue: true,
        email_promos: false,
        sms_reminders: true
      }
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
      const [activityData, reservationsData, queueData] = await Promise.all([
        api.getActivity?.().catch(() => ({ activity: [] })),
        api.myReservations?.().catch(() => ({ reservations: [] })),
        api.queueActive?.().catch(() => ({ entries: [] }))
      ]);
      setActivity(activityData?.activity || []);
      setReservations(reservationsData?.reservations || []);
      // Filter queue entries for current user
      const userQueue = (queueData?.entries || []).filter(q => q.user_id === user?.id || q.email === user?.email);
      setQueueHistory(userQueue);
    } catch (e) {
      console.error("Failed to load profile data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function downloadReceipt(reservation) {
    try {
      const blob = await api.downloadReceipt(reservation.id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `JolliReserve-Receipt-${reservation.id.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      ok("Receipt downloaded!");
    } catch (e) {
      err(e);
    }
  }

  async function downloadData() {
    const data = {
      profile: { name: user?.name, email: user?.email, member_since: user?.created_at },
      reservations,
      queue_history: queueHistory,
      activity_history: activity,
      exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `jollireserve-data-${user?.email}-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    ok("Your data exported successfully!");
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

  function openPasswordModal() {
    setShowPasswordModal(true);
    setPasswordStep("request");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function closePasswordModal() {
    setShowPasswordModal(false);
    setPasswordStep("request");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function requestPasswordOTP() {
    setPasswordLoading(true);
    try {
      await api.requestPasswordOTP();
      ok("Verification code sent to your email!");
      setPasswordStep("verify");
    } catch (e) {
      err(e);
    } finally {
      setPasswordLoading(false);
    }
  }

  async function submitPasswordChange() {
    if (!otpCode || otpCode.length < 4) {
      err({ message: "Please enter the verification code" });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      err({ message: "Password must be at least 6 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      err({ message: "Passwords do not match" });
      return;
    }
    
    setPasswordLoading(true);
    try {
      await api.changePassword({ otp: otpCode, new_password: newPassword });
      ok("Password changed successfully!");
      setPasswordStep("success");
      setTimeout(() => closePasswordModal(), 2000);
    } catch (e) {
      if (e?.response?.data?.error === "CODE_EXPIRED") {
        err({ message: "Code expired. Please request a new one." });
        setPasswordStep("request");
      } else {
        err(e);
      }
    } finally {
      setPasswordLoading(false);
    }
  }

  const stats = {
    totalReservations: reservations.length,
    upcomingReservations: reservations.filter(r => r.status === "confirmed" && r.date >= new Date().toISOString().split('T')[0]).length,
    cancelledReservations: reservations.filter(r => r.status === "cancelled").length,
    totalQueueJoins: queueHistory.length,
    totalLogins: activity.filter(a => a.action === "user_login").length,
    favoriteSeating: profile.preferences.seating_preference
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
      <div className="grid grid-cols-5 gap-3 mb-4">
        {[
          { label: "Reservations", value: stats.totalReservations, icon: "📅" },
          { label: "Upcoming", value: stats.upcomingReservations, icon: "📆" },
          { label: "Queue Joins", value: stats.totalQueueJoins, icon: "🐝" },
          { label: "Logins", value: stats.totalLogins, icon: "🔑" },
          { label: "Fav Seating", value: SEATING_OPTIONS.find(s => s.value === stats.favoriteSeating)?.label?.split(' ')[1] || "Indoor", icon: "🪑" }
        ].map(stat => (
          <div key={stat.label} className="card p-4 text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-xl font-black">{stat.value}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: "overview", label: "📊 Overview" },
          { key: "activity", label: "📋 Activity History" },
          { key: "reservations", label: "📅 My Reservations" },
          { key: "queue", label: "🐝 Queue History" },
          { key: "settings", label: "⚙️ Preferences" }
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
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-black">My Reservations</h2>
                  {reservations.length > 0 && (
                    <button onClick={downloadData} className="btn btn-outline text-sm">
                      📥 Export All Data
                    </button>
                  )}
                </div>
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
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          r.status === "confirmed" ? "bg-green-100 text-green-700" :
                          r.status === "cancelled" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {r.status}
                        </span>
                        {r.status === "completed" && (
                          <button 
                            onClick={() => downloadReceipt(r)}
                            className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            🧾 Receipt
                          </button>
                        )}
                      </div>
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

            {tab === "queue" && (
              <div>
                <h2 className="font-black mb-4">🐝 Queue History</h2>
                <div style={{ maxHeight: 500, overflowY: "auto" }}>
                  {queueHistory.map((q, idx) => (
                    <div key={q.id || idx} className="p-4 mb-3" style={{ background: "var(--bg-subtle)", borderRadius: "0.75rem", borderLeft: `4px solid ${q.status === 'seated' ? '#10b981' : q.status === 'called' ? '#f59e0b' : '#3b82f6'}` }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            #{q.queue_number} • {q.party_size} guests
                            {q.status === 'seated' && <span className="text-green-600">✅ Seated</span>}
                            {q.status === 'called' && <span className="text-amber-600">🔔 Called</span>}
                            {q.status === 'waiting' && <span className="text-blue-600">⏳ Waiting</span>}
                          </div>
                          <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                            Joined: {q.joined_at?.slice(0, 16).replace('T', ' ')}
                          </div>
                          {q.seated_at && (
                            <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                              Seated: {q.seated_at?.slice(0, 16).replace('T', ' ')}
                            </div>
                          )}
                          {q.table_name && (
                            <div className="text-sm font-medium mt-1">
                              🪑 Table: {q.table_name}
                            </div>
                          )}
                        </div>
                        <div className="text-2xl">
                          {q.status === 'seated' ? '🎉' : q.status === 'called' ? '🔔' : '🐝'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {queueHistory.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">🐝</div>
                      <p style={{ color: "var(--text-muted)" }}>No queue history yet.</p>
                      <Link to="/queue" className="btn btn-red mt-2 inline-block">Join Queue</Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "settings" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-black">⚙️ Customize Your Experience</h2>
                  {!editMode && (
                    <button className="btn btn-red text-sm" onClick={() => setEditMode(true)}>
                      ✏️ Edit Preferences
                    </button>
                  )}
                </div>

                {!editMode ? (
                  <div className="space-y-4">
                    {/* Profile Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4" style={{ background: "var(--bg-subtle)", borderRadius: "0.75rem" }}>
                        <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>👤 Display Name</div>
                        <div className="font-medium">{profile.name || "Not set"}</div>
                      </div>
                      <div className="p-4" style={{ background: "var(--bg-subtle)", borderRadius: "0.75rem" }}>
                        <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>📱 Phone</div>
                        <div className="font-medium">{profile.phone || "Not set"}</div>
                      </div>
                    </div>

                    {/* Dining Preferences */}
                    <div className="p-4" style={{ background: "var(--bg-subtle)", borderRadius: "0.75rem" }}>
                      <h3 className="font-semibold mb-3">🍽️ Dining Preferences</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>Default Party: </span>
                          <span className="font-medium">{profile.preferences.default_party_size} people</span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-muted)" }}>Seating: </span>
                          <span className="font-medium">
                            {SEATING_OPTIONS.find(s => s.value === profile.preferences.seating_preference)?.label}
                          </span>
                        </div>
                        {profile.preferences.dietary_restrictions && (
                          <div className="col-span-2">
                            <span style={{ color: "var(--text-muted)" }}>Dietary Needs: </span>
                            <span className="font-medium">{profile.preferences.dietary_restrictions}</span>
                          </div>
                        )}
                        {profile.preferences.special_occasions && (
                          <div className="col-span-2">
                            <span style={{ color: "var(--text-muted)" }}>Special Occasions: </span>
                            <span className="font-medium">{profile.preferences.special_occasions}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notifications */}
                    <div className="p-4" style={{ background: "var(--bg-subtle)", borderRadius: "0.75rem" }}>
                      <h3 className="font-semibold mb-3">🔔 Notification Settings</h3>
                      <div className="space-y-2 text-sm">
                        {NOTIFICATION_OPTIONS.map(opt => (
                          <div key={opt.key} className="flex items-center gap-2">
                            <span className={profile.preferences.notifications?.[opt.key] ? "text-green-600" : "text-gray-400"}>
                              {profile.preferences.notifications?.[opt.key] ? "✅" : "⭕"}
                            </span>
                            <span>{opt.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Security */}
                    <div className="flex gap-2">
                      <button className="btn btn-outline" onClick={openPasswordModal}>🔒 Change Password</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Section Tabs */}
                    <div className="flex gap-2 border-b pb-2">
                      {[
                        { key: "basic", label: "👤 Basic Info" },
                        { key: "dining", label: "🍽️ Dining" },
                        { key: "notifications", label: "🔔 Notifications" }
                      ].map(s => (
                        <button
                          key={s.key}
                          onClick={() => setActiveSection(s.key)}
                          className={`px-3 py-1 text-sm rounded ${activeSection === s.key ? "bg-[var(--red)] text-white" : "hover:bg-[var(--bg-subtle)]"}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Basic Info Section */}
                    {activeSection === "basic" && (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Display Name</label>
                          <input
                            type="text"
                            value={profile.name}
                            onChange={e => setProfile({ ...profile, name: e.target.value })}
                            className="input w-full mt-1"
                            placeholder="How should we call you?"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Phone Number</label>
                          <input
                            type="tel"
                            value={profile.phone}
                            onChange={e => setProfile({ ...profile, phone: e.target.value })}
                            className="input w-full mt-1"
                            placeholder="For SMS notifications"
                          />
                        </div>
                      </div>
                    )}

                    {/* Dining Preferences Section */}
                    {activeSection === "dining" && (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Default Party Size</label>
                          <div className="flex items-center gap-3 mt-1">
                            <input
                              type="range"
                              min="1"
                              max="20"
                              value={profile.preferences.default_party_size}
                              onChange={e => setProfile({ ...profile, preferences: { ...profile.preferences, default_party_size: Number(e.target.value) } })}
                              className="flex-1"
                            />
                            <span className="font-bold w-8 text-center">{profile.preferences.default_party_size}</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Preferred Seating</label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {SEATING_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setProfile({ ...profile, preferences: { ...profile.preferences, seating_preference: opt.value } })}
                                className={`p-3 text-left rounded-lg border-2 transition ${
                                  profile.preferences.seating_preference === opt.value 
                                    ? "border-[var(--red)] bg-red-50" 
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                <div className="font-medium">{opt.label}</div>
                                <div className="text-xs text-gray-500">{opt.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Dietary Restrictions / Allergies</label>
                          <textarea
                            value={profile.preferences.dietary_restrictions}
                            onChange={e => setProfile({ ...profile, preferences: { ...profile.preferences, dietary_restrictions: e.target.value } })}
                            className="input w-full mt-1"
                            rows="2"
                            placeholder="e.g., Vegetarian, Gluten-free, Nut allergy..."
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium">Special Occasions</label>
                          <textarea
                            value={profile.preferences.special_occasions}
                            onChange={e => setProfile({ ...profile, preferences: { ...profile.preferences, special_occasions: e.target.value } })}
                            className="input w-full mt-1"
                            rows="2"
                            placeholder="e.g., Birthday, Anniversary, Date night..."
                          />
                        </div>
                      </div>
                    )}

                    {/* Notifications Section */}
                    {activeSection === "notifications" && (
                      <div className="space-y-3">
                        {NOTIFICATION_OPTIONS.map(opt => (
                          <label key={opt.key} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={profile.preferences.notifications?.[opt.key] || false}
                              onChange={e => setProfile({
                                ...profile,
                                preferences: {
                                  ...profile.preferences,
                                  notifications: { ...profile.preferences.notifications, [opt.key]: e.target.checked }
                                }
                              })}
                              className="mt-1"
                            />
                            <div>
                              <div className="font-medium">{opt.label}</div>
                              <div className="text-sm text-gray-500">{opt.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t">
                      <button className="btn btn-red" onClick={saveProfile}>💾 Save All Changes</button>
                      <button className="btn btn-outline" onClick={() => { setEditMode(false); setActiveSection("basic"); }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }} onClick={closePasswordModal}>
          <div 
            style={{
              background: "var(--bg-card)",
              borderRadius: "1rem",
              padding: "1.5rem",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">🔒 Change Password</h3>
              <button onClick={closePasswordModal} className="text-2xl hover:opacity-70">×</button>
            </div>

            {/* Step: Request OTP */}
            {passwordStep === "request" && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  For your security, we'll send a verification code to your email <strong>{user?.email}</strong> before you can change your password.
                </p>
                <button 
                  className="btn btn-red w-full"
                  onClick={requestPasswordOTP}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? "Sending..." : "📧 Send Verification Code"}
                </button>
              </div>
            )}

            {/* Step: Verify OTP + New Password */}
            {passwordStep === "verify" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Verification Code</label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="input w-full mt-1 text-center text-lg tracking-widest"
                    maxLength={6}
                  />
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Code sent to {user?.email}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="input w-full mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="input w-full mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <button 
                    className="btn btn-red flex-1"
                    onClick={submitPasswordChange}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? "Updating..." : "✅ Change Password"}
                  </button>
                  <button 
                    className="btn btn-outline"
                    onClick={() => setPasswordStep("request")}
                    disabled={passwordLoading}
                  >
                    Resend
                  </button>
                </div>
              </div>
            )}

            {/* Step: Success */}
            {passwordStep === "success" && (
              <div className="text-center py-4">
                <div className="text-5xl mb-3">✅</div>
                <h4 className="font-bold text-lg mb-2">Password Changed!</h4>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Your password has been updated successfully.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
