import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

// Status Badge Component with proper contrast
const StatusBadge = ({ status }) => {
  const styles = {
    confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    waiting: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    called: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    seated: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
  };
  
  const normalized = status?.toLowerCase() || 'pending';
  const style = styles[normalized] || styles.pending;
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
};

// Card Section Component
const SectionCard = ({ title, icon, children, action }) => (
  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
    <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h3 className="font-bold text-[var(--text-main)]">{title}</h3>
      </div>
      {action && <div>{action}</div>}
    </div>
    <div className="p-5">
      {children}
    </div>
  </div>
);

// Info Row Component
const InfoRow = ({ label, value, icon }) => (
  <div className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
    <div className="flex items-center gap-2 text-[var(--text-muted)]">
      {icon && <span>{icon}</span>}
      <span className="text-sm">{label}</span>
    </div>
    <span className="font-medium text-[var(--text-main)]">{value || "—"}</span>
  </div>
);

export default function Profile({ user, onLogout }) {
  const navigate = useNavigate();
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
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  async function loadData() {
    setLoading(true);
    try {
      console.log("[Profile] Loading data for user:", user?.id);
      console.log("[Profile] User object:", user);
      
      // Test each API call individually for better debugging
      let activityData, reservationsData, queueData;
      
      try {
        activityData = await api.getActivity?.();
        console.log("[Profile] Activity raw response:", activityData);
      } catch (e) {
        console.error("[Profile] Activity error:", e?.response?.data || e.message);
        activityData = { activity: [] };
      }
      
      try {
        reservationsData = await api.myReservations?.();
        console.log("[Profile] Reservations raw response:", reservationsData);
      } catch (e) {
        console.error("[Profile] Reservations error:", e?.response?.data || e.message);
        reservationsData = { reservations: [] };
      }
      
      try {
        queueData = await api.queueHistory?.();
        console.log("[Profile] Queue raw response:", queueData);
      } catch (e) {
        console.error("[Profile] Queue error:", e?.response?.data || e.message);
        queueData = { entries: [] };
      }
      
      console.log("[Profile] Loaded:", { 
        activity: activityData?.activity?.length || 0, 
        reservations: reservationsData?.reservations?.length || 0, 
        queue: queueData?.entries?.length || 0 
      });
      setActivity(activityData?.activity || []);
      setReservations(reservationsData?.reservations || []);
      setQueueHistory(queueData?.entries || []);
    } catch (e) {
      console.error("[Profile] Failed to load profile data:", e);
      err("Failed to load profile data");
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
      // Only send allowed fields (match backend expectations)
      const payload = {
        name: profile.name,
        phone: profile.phone,
        preferences: profile.preferences
      };
      await api.updateProfile?.(payload);
      ok("Profile updated successfully!");
      setEditMode(false);
      // Note: Parent component should refresh user data via callback or context
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
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-4">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />

      {/* ========== HEADER SECTION ========== */}
      <div className="bg-gradient-to-r from-[var(--red)] to-[#dc2626] rounded-2xl p-6 mb-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl flex-shrink-0">
            👤
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{user.name || user.email}</h1>
            <p className="text-white/80 text-sm truncate">{user.email}</p>
            <p className="text-white/60 text-xs mt-1">Member since {user.created_at?.slice(0, 10)}</p>
          </div>
          <div className="flex gap-2">
            <Link 
              to="/reservations" 
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
            >
              📅 Book
            </Link>
            <button 
              onClick={() => { onLogout(); navigate("/login"); }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-medium transition-colors"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* ========== STATS ROW ========== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Reservations", value: stats.totalReservations, icon: "📅", color: "blue" },
          { label: "Upcoming", value: stats.upcomingReservations, icon: "📆", color: "green" },
          { label: "Queue Visits", value: stats.totalQueueJoins, icon: "🐝", color: "amber" },
          { label: "Activity", value: activity.length, icon: "📋", color: "purple" }
        ].map(stat => (
          <div key={stat.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 text-center shadow-sm">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-xl font-bold text-[var(--text-main)]">{stat.value}</div>
            <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ========== SIMPLIFIED NAVIGATION ========== */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { key: "overview", label: "🏠 Overview", desc: "Summary" },
          { key: "activity", label: "📋 Activity", desc: "History" },
          { key: "reservations", label: "📅 Reservations", desc: "Bookings" },
          { key: "queue", label: "🐝 Queue", desc: "History" },
          { key: "settings", label: "⚙️ Settings", desc: "Preferences" }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-4 py-3 rounded-xl text-left transition-all duration-200 min-w-[100px] ${
              tab === t.key 
                ? "bg-[var(--red)] text-white shadow-md" 
                : "bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--red)] hover:bg-[var(--bg-subtle)]"
            }`}
          >
            <div className="text-sm font-semibold">{t.label}</div>
            <div className={`text-xs ${tab === t.key ? "text-white/70" : "text-[var(--text-muted)]"}`}>
              {t.desc}
            </div>
          </button>
        ))}
      </div>

      {/* ========== TAB CONTENT ========== */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--red)]"></div>
          <span className="ml-3 text-[var(--text-muted)]">Loading your data...</span>
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <div className="grid md:grid-cols-2 gap-4">
              <SectionCard title="Recent Reservations" icon="📅" action={
                reservations.length > 0 && (
                  <Link to="/reservations" className="text-sm text-[var(--red)] hover:underline">View all</Link>
                )
              }>
                {reservations.slice(0, 3).length > 0 ? (
                  <div className="space-y-3">
                    {reservations.slice(0, 3).map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-[var(--bg-subtle)] rounded-xl">
                        <div>
                          <div className="font-semibold text-[var(--text-main)]">{r.date} at {r.time}</div>
                          <div className="text-sm text-[var(--text-muted)]">{r.party_size} guests • Table {r.table_name || "TBD"}</div>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="text-4xl mb-2">📅</div>
                    <p className="text-[var(--text-muted)] mb-3">No reservations yet</p>
                    <Link to="/reservations" className="btn btn-primary btn-sm">Make Reservation</Link>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Recent Activity" icon="📋" action={
                activity.length > 0 && (
                  <button onClick={() => setTab("activity")} className="text-sm text-[var(--red)] hover:underline">View all</button>
                )
              }>
                {activity.slice(0, 5).length > 0 ? (
                  <div className="space-y-2">
                    {activity.slice(0, 5).map(a => (
                      <div key={a.id} className="flex items-center gap-3 py-2">
                        <span className="text-xl">{activityIcons[a.action] || "📌"}</span>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-[var(--text-main)]">{activityLabels[a.action] || a.action}</div>
                          <div className="text-xs text-[var(--text-muted)]">{a.created_at?.slice(0, 16).replace('T', ' ')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-[var(--text-muted)]">
                    No recent activity
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Quick Stats" icon="📊">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-[var(--bg-subtle)] rounded-xl">
                    <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Favorite Seating</div>
                    <div className="font-semibold text-[var(--text-main)]">
                      {SEATING_OPTIONS.find(s => s.value === stats.favoriteSeating)?.label || "🪴 Indoor"}
                    </div>
                  </div>
                  <div className="p-3 bg-[var(--bg-subtle)] rounded-xl">
                    <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Total Logins</div>
                    <div className="font-semibold text-[var(--text-main)]">{stats.totalLogins}</div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Account Info" icon="👤" action={
                <button onClick={() => setTab("settings")} className="text-sm text-[var(--red)] hover:underline">Edit</button>
              }>
                <div className="space-y-1">
                  <InfoRow label="Display Name" value={profile.name} icon="👤" />
                  <InfoRow label="Email" value={user.email} icon="📧" />
                  <InfoRow label="Phone" value={profile.phone} icon="📱" />
                </div>
              </SectionCard>
            </div>
          )}

          {/* ACTIVITY TAB */}
          {tab === "activity" && (
            <SectionCard title="Activity History" icon="📋">
              {activity.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {activity.map(a => (
                    <div key={a.id} className="flex items-start gap-3 p-4 bg-[var(--bg-subtle)] rounded-xl">
                      <div className="text-2xl">{activityIcons[a.action] || "📌"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[var(--text-main)]">{activityLabels[a.action] || a.action}</div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          {a.created_at?.slice(0, 16).replace('T', ' ')}
                        </div>
                        {a.details && (
                          <div className="text-xs text-[var(--text-muted)] mt-2 p-2 bg-[var(--bg-card)] rounded">
                            {JSON.stringify(a.details)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-[var(--text-muted)]">No activity recorded yet</p>
                </div>
              )}
            </SectionCard>
          )}

          {/* RESERVATIONS TAB */}
          {tab === "reservations" && (
            <SectionCard 
              title="My Reservations" 
              icon="📅" 
              action={
                reservations.length > 0 && (
                  <button onClick={downloadData} className="btn btn-outline btn-sm">📥 Export</button>
                )
              }
            >
              {reservations.length > 0 ? (
                <div className="space-y-3">
                  {reservations.map(r => (
                    <div key={r.id} className="p-4 bg-[var(--bg-subtle)] rounded-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[var(--text-main)]">{r.date} at {r.time}</span>
                            <StatusBadge status={r.status} />
                          </div>
                          <div className="text-sm text-[var(--text-muted)] mt-1">
                            {r.party_size} guests • Table {r.table_name || "TBD"}
                            {r.area_pref && ` • ${r.area_pref}`}
                          </div>
                          {r.special_requests && (
                            <div className="text-sm text-[var(--text-muted)] mt-2 flex items-center gap-1">
                              <span>📝</span> {r.special_requests}
                            </div>
                          )}
                        </div>
                        {r.status === "completed" && (
                          <button 
                            onClick={() => downloadReceipt(r)}
                            className="btn btn-secondary btn-sm flex-shrink-0"
                          >
                            🧾 Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📅</div>
                  <p className="text-[var(--text-muted)] mb-4">No reservations yet</p>
                  <Link to="/reservations" className="btn btn-primary">Make a Reservation</Link>
                </div>
              )}
            </SectionCard>
          )}

          {/* QUEUE TAB */}
          {tab === "queue" && (
            <SectionCard title="Queue History" icon="🐝">
              {queueHistory.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {queueHistory.map((q, idx) => (
                    <div 
                      key={q.id || idx} 
                      className="p-4 bg-[var(--bg-subtle)] rounded-xl border-l-4 border-l-blue-500"
                      style={{ borderLeftColor: q.status === 'seated' ? '#10b981' : q.status === 'called' ? '#f59e0b' : '#3b82f6' }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[var(--text-main)]">#{q.queue_number}</span>
                            <span className="text-[var(--text-muted)]">•</span>
                            <span className="text-[var(--text-muted)]">{q.party_size} guests</span>
                            <StatusBadge status={q.status} />
                          </div>
                          <div className="text-sm text-[var(--text-muted)] mt-2">
                            Joined: {q.joined_at?.slice(0, 16).replace('T', ' ')}
                          </div>
                          {q.seated_at && (
                            <div className="text-sm text-[var(--text-muted)]">
                              Seated: {q.seated_at?.slice(0, 16).replace('T', ' ')}
                            </div>
                          )}
                          {q.table_name && (
                            <div className="text-sm font-medium text-[var(--text-main)] mt-2">
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
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🐝</div>
                  <p className="text-[var(--text-muted)] mb-4">No queue history yet</p>
                  <Link to="/queue" className="btn btn-primary">Join Queue</Link>
                </div>
              )}
            </SectionCard>
          )}

          {/* SETTINGS TAB */}
          {tab === "settings" && (
            <div className="space-y-4">
              {!editMode ? (
                <>
                  <SectionCard 
                    title="Profile Information" 
                    icon="👤"
                    action={<button onClick={() => setEditMode(true)} className="btn btn-primary btn-sm">✏️ Edit</button>}
                  >
                    <div className="space-y-1">
                      <InfoRow label="Display Name" value={profile.name || "Not set"} />
                      <InfoRow label="Email" value={user.email} />
                      <InfoRow label="Phone" value={profile.phone || "Not set"} />
                    </div>
                  </SectionCard>

                  <SectionCard title="Dining Preferences" icon="🍽️">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-[var(--bg-subtle)] rounded-xl">
                        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Default Party Size</div>
                        <div className="font-semibold text-[var(--text-main)]">{profile.preferences.default_party_size} people</div>
                      </div>
                      <div className="p-3 bg-[var(--bg-subtle)] rounded-xl">
                        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Preferred Seating</div>
                        <div className="font-semibold text-[var(--text-main)]">
                          {SEATING_OPTIONS.find(s => s.value === profile.preferences.seating_preference)?.label || "🪴 Indoor"}
                        </div>
                      </div>
                    </div>
                    {profile.preferences.dietary_restrictions && (
                      <div className="mt-4 p-3 bg-[var(--bg-subtle)] rounded-xl">
                        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Dietary Restrictions</div>
                        <div className="text-[var(--text-main)]">{profile.preferences.dietary_restrictions}</div>
                      </div>
                    )}
                    {profile.preferences.special_occasions && (
                      <div className="mt-3 p-3 bg-[var(--bg-subtle)] rounded-xl">
                        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Special Occasions</div>
                        <div className="text-[var(--text-main)]">{profile.preferences.special_occasions}</div>
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title="Notifications" icon="🔔">
                    <div className="space-y-3">
                      {NOTIFICATION_OPTIONS.map(opt => (
                        <div key={opt.key} className="flex items-center justify-between p-3 bg-[var(--bg-subtle)] rounded-xl">
                          <div>
                            <div className="font-medium text-[var(--text-main)]">{opt.label}</div>
                            <div className="text-xs text-[var(--text-muted)]">{opt.desc}</div>
                          </div>
                          <span className={`text-xl ${profile.preferences.notifications?.[opt.key] ? "text-green-500" : "text-gray-400"}`}>
                            {profile.preferences.notifications?.[opt.key] ? "✅" : "⭕"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  <SectionCard title="Security" icon="🔒">
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-subtle)] rounded-xl">
                      <div>
                        <div className="font-semibold text-[var(--text-main)]">Password</div>
                        <div className="text-sm text-[var(--text-muted)]">Change your account password</div>
                      </div>
                      <button onClick={openPasswordModal} className="btn btn-outline btn-sm">Change</button>
                    </div>
                  </SectionCard>
                </>
              ) : (
                <SectionCard title="Edit Preferences" icon="✏️">
                  <div className="space-y-6">
                    {/* Edit Mode Tabs */}
                    <div className="flex gap-2 border-b border-[var(--border)] pb-3">
                      {[
                        { key: "basic", label: "👤 Basic" },
                        { key: "dining", label: "🍽️ Dining" },
                        { key: "notifications", label: "🔔 Alerts" }
                      ].map(s => (
                        <button
                          key={s.key}
                          onClick={() => setActiveSection(s.key)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeSection === s.key 
                              ? "bg-[var(--red)] text-white" 
                              : "bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Basic Info */}
                    {activeSection === "basic" && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Display Name</label>
                          <input
                            type="text"
                            value={profile.name}
                            onChange={e => setProfile({ ...profile, name: e.target.value })}
                            className="input w-full"
                            placeholder="How should we call you?"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Phone Number</label>
                          <input
                            type="tel"
                            value={profile.phone}
                            onChange={e => setProfile({ ...profile, phone: e.target.value })}
                            className="input w-full"
                            placeholder="For SMS notifications"
                          />
                        </div>
                      </div>
                    )}

                    {/* Dining Preferences */}
                    {activeSection === "dining" && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-main)] mb-3">Default Party Size: {profile.preferences.default_party_size}</label>
                          <input
                            type="range"
                            min="1"
                            max="20"
                            value={profile.preferences.default_party_size}
                            onChange={e => setProfile({ ...profile, preferences: { ...profile.preferences, default_party_size: Number(e.target.value) } })}
                            className="w-full accent-[var(--red)]"
                          />
                          <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                            <span>1</span>
                            <span>20</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[var(--text-main)] mb-3">Preferred Seating</label>
                          <div className="grid sm:grid-cols-3 gap-3">
                            {SEATING_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setProfile({ ...profile, preferences: { ...profile.preferences, seating_preference: opt.value } })}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${
                                  profile.preferences.seating_preference === opt.value 
                                    ? "border-[var(--red)] bg-[var(--red)]/5" 
                                    : "border-[var(--border)] hover:border-[var(--red)]/50"
                                }`}
                              >
                                <div className="font-medium text-[var(--text-main)]">{opt.label}</div>
                                <div className="text-xs text-[var(--text-muted)] mt-1">{opt.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Dietary Restrictions</label>
                          <textarea
                            value={profile.preferences.dietary_restrictions}
                            onChange={e => setProfile({ ...profile, preferences: { ...profile.preferences, dietary_restrictions: e.target.value } })}
                            className="input w-full"
                            rows="2"
                            placeholder="e.g., Vegetarian, Gluten-free, Nut allergy..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Special Occasions</label>
                          <textarea
                            value={profile.preferences.special_occasions}
                            onChange={e => setProfile({ ...profile, preferences: { ...profile.preferences, special_occasions: e.target.value } })}
                            className="input w-full"
                            rows="2"
                            placeholder="e.g., Birthday, Anniversary..."
                          />
                        </div>
                      </div>
                    )}

                    {/* Notifications */}
                    {activeSection === "notifications" && (
                      <div className="space-y-3">
                        {NOTIFICATION_OPTIONS.map(opt => (
                          <label key={opt.key} className="flex items-start gap-4 p-4 bg-[var(--bg-subtle)] rounded-xl cursor-pointer hover:bg-[var(--bg-subtle)]/80 transition-colors">
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
                              className="mt-1 w-4 h-4 accent-[var(--red)]"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-[var(--text-main)]">{opt.label}</div>
                              <div className="text-sm text-[var(--text-muted)]">{opt.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                      <button className="btn btn-primary flex-1" onClick={saveProfile}>💾 Save Changes</button>
                      <button className="btn btn-outline" onClick={() => { setEditMode(false); setActiveSection("basic"); }}>Cancel</button>
                    </div>
                  </div>
                </SectionCard>
              )}
            </div>
          )}
        </>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closePasswordModal}>
          <div className="bg-[var(--bg-card)] rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl text-[var(--text-main)]">🔒 Change Password</h3>
              <button onClick={closePasswordModal} className="text-2xl text-[var(--text-muted)] hover:text-[var(--text-main)]">×</button>
            </div>

            {passwordStep === "request" && (
              <div className="space-y-4">
                <p className="text-[var(--text-muted)]">
                  We'll send a verification code to <strong className="text-[var(--text-main)]">{user?.email}</strong>
                </p>
                <button 
                  className="btn btn-primary w-full" 
                  onClick={requestPasswordOTP}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? "Sending..." : "📧 Send Code"}
                </button>
              </div>
            )}

            {passwordStep === "verify" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Verification Code</label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    placeholder="000000"
                    className="input w-full text-center text-xl tracking-[0.5em]"
                    maxLength={6}
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">Check your email</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="input w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    className="btn btn-primary flex-1" 
                    onClick={submitPasswordChange}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? "Updating..." : "✅ Change"}
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

            {passwordStep === "success" && (
              <div className="text-center py-4">
                <div className="text-5xl mb-3">✅</div>
                <h4 className="font-bold text-lg text-[var(--text-main)] mb-2">Password Changed!</h4>
                <p className="text-[var(--text-muted)]">Your password has been updated successfully.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
