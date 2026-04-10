import React, { useEffect, useMemo, useState } from "react";
import Toast from "../components/Toast";
import { api } from "../lib/api";
import { connectWS, onWSMessage } from "../lib/ws";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function toISO(d) {
  if (!d) return "";
  const dd = new Date(d);
  if (isNaN(dd.getTime())) return "";
  return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
}

const TABS = ["Dashboard", "Reservations", "Queue", "Tables", "Users", "Activity", "Announcements", "Settings", "Menu"];

export default function Admin({ user }) {
  const [tab, setTab] = useState("Dashboard");
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [summary, setSummary] = useState(null);
  const [byDay, setByDay] = useState([]);
  const [peak, setPeak] = useState([]);
  const [util, setUtil] = useState(null);
  const [tables, setTables] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userHistory, setUserHistory] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all"); // all, customer, staff, admin
  const [systemStatus, setSystemStatus] = useState({ firebase: false, backend: true, websocket: false });
  const [settings, setSettings] = useState({
    queue_enabled: true,
    reservations_enabled: true,
    email_notifications: true,
    max_party_size: 12
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [userStats, setUserStats] = useState({ total: 0, newToday: 0, suspended: 0, staff: 0, admin: 0 });
  const [adminActivity, setAdminActivity] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", message: "", type: "info", duration: 30 });
  
  // Menu management state
  const [menuItems, setMenuItems] = useState([]);
  const [newMenuItem, setNewMenuItem] = useState({ name: "", description: "", price: "", category: "Mains", image_url: "" });

  // Reservations and Queue management state
  const [reservations, setReservations] = useState([]);
  const [queueEntries, setQueueEntries] = useState([]);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [selectedQueueEntry, setSelectedQueueEntry] = useState(null);

  const ok = (msg) => setToast({ message: msg, type: "success" });
  const err = (e) => setToast({ message: e?.response?.data?.error || e.message || "Error", type: "error" });

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(Date.now() - 6 * 24 * 3600 * 1000);
    return { from: toISO(from), to: toISO(to) };
  }, []);

  async function loadAll() {
    try {
      const [s, d, u, t, us, st, act] = await Promise.allSettled([
        api.analyticsSummary(),
        api.analyticsByDay(range.from, range.to),
        api.analyticsUtil(range.from, range.to),
        api.adminTables(),
        api.adminUsers(),
        api.adminGetSettings?.().catch(() => null),
        api.adminActivity?.().catch(() => ({ activity: [] })),
      ]);
      if (s.status === "fulfilled") {
        setSummary(s.value);
        try {
          const p = await api.analyticsPeakHours(s.value.today);
          setPeak((p.rows || []).map(x => ({ time: x.time, count: x.count })));
        } catch { }
      }
      if (d.status === "fulfilled") setByDay(d.value.rows || []);
      if (u.status === "fulfilled") setUtil(u.value);
      if (t.status === "fulfilled") setTables(t.value.tables || []);
      if (us.status === "fulfilled") {
        const userData = us.value.users || [];
        setUsers(userData);
        
        // Calculate user statistics
        const today = toISO(new Date());
        setUserStats({
          total: userData.length,
          newToday: userData.filter(u => u.created_at?.startsWith(today)).length,
          suspended: userData.filter(u => !u.is_verified).length,
          staff: userData.filter(u => u.role === "staff").length,
          admin: userData.filter(u => u.role === "admin").length
        });
      }
      if (st.status === "fulfilled" && st.value?.settings) {
        setSettings(st.value.settings);
      }
      if (act.status === "fulfilled" && act.value) {
        setAdminActivity(act.value.activity || []);
      }
    } catch (e) { err(e); }
  }

  async function checkSystemStatus() {
    try {
      // Check backend health
      const health = await api.health?.().catch(() => ({ ok: false }));
      
      // Check WebSocket
      const wsConnected = window.WebSocket && window.wsConnected;
      
      setSystemStatus({
        backend: health?.ok || false,
        firebase: true, // If we got here, Firebase is working
        websocket: wsConnected || false
      });
    } catch {
      setSystemStatus({ backend: false, firebase: true, websocket: false });
    }
  }

  useEffect(() => {
    loadAll();
    checkSystemStatus();
    connectWS();
    const off = onWSMessage((msg) => {
      if (["queue:changed", "reservations:changed", "tables:changed"].includes(msg.type)) loadAll();
      if (msg.type === "activity" && msg.activity) {
        setAdminActivity(prev => [msg.activity, ...prev].slice(0, 50));
      }
    });
    return () => off();
  }, []);

  // Load menu items when Menu tab is selected
  useEffect(() => {
    if (tab === "Menu") {
      loadMenuItems();
    }
  }, [tab]);

  // Load reservations and queue when tabs are selected
  useEffect(() => {
    if (tab === "Reservations") {
      loadReservations();
    }
    if (tab === "Queue") {
      loadQueueEntries();
    }
  }, [tab]);

  async function createTable() {
    const name = prompt("Table name (e.g. T8)"); if (!name) return;
    const area = prompt("Area: indoor/outdoor/vip", "indoor") || "indoor";
    const capacity = Number(prompt("Capacity", "4") || "4");
    try { await api.createTable({ name, area, capacity }); ok("Table added!"); loadAll(); } catch (e) { err(e); }
  }

  async function toggleTable(t) {
    try { await api.updateTable(t.id, { is_active: t.is_active ? 0 : 1 }); ok("Updated!"); loadAll(); } catch (e) { err(e); }
  }

  async function deleteTable(id) {
    if (!confirm("Delete this table?")) return;
    try { await api.deleteTable(id); ok("Deleted!"); loadAll(); } catch (e) { err(e); }
  }

  async function changeRole(id, role) {
    try { await api.adminUpdateUserRole(id, role); ok("Role updated!"); loadAll(); } catch (e) { err(e); }
  }

  async function toggleSuspend(u) {
    const suspend = u.is_verified === 1;
    try { await api.adminSuspendUser(u.id, suspend); ok(suspend ? "User suspended!" : "Unsuspended!"); loadAll(); } catch (e) { err(e); }
  }

  async function resetPassword(id) {
    const pw = prompt("New password:");
    if (!pw) return;
    try { await api.adminResetPassword(id, pw); ok("Password reset!"); } catch (e) { err(e); }
  }

  async function deleteUser(id) {
    if (!confirm("Delete this user?")) return;
    try { await api.adminDeleteUser(id); ok("User deleted!"); loadAll(); } catch (e) { err(e); }
  }

  async function viewHistory(u) {
    setSelectedUser(u);
    try { const h = await api.adminUserHistory(u.id); setUserHistory(h); } catch (e) { err(e); }
  }

  async function loadMenuItems() {
    try {
      const data = await api.adminGetMenuItems();
      setMenuItems(data.items || []);
    } catch (e) {
      console.error("Load menu items error:", e);
    }
  }

  async function loadReservations() {
    try {
      const data = await api.adminGetReservations?.().catch(() => ({ reservations: [] }));
      setReservations(data?.reservations || []);
    } catch (e) {
      console.error("Load reservations error:", e);
    }
  }

  async function loadQueueEntries() {
    try {
      const data = await api.adminGetQueue?.().catch(() => ({ entries: [] }));
      setQueueEntries(data?.entries || []);
    } catch (e) {
      console.error("Load queue error:", e);
    }
  }

  async function confirmReservation(id) {
    if (!confirm("Confirm this reservation?")) return;
    try {
      await api.adminConfirmReservation?.(id);
      ok("Reservation confirmed! ✅");
      loadReservations();
    } catch (e) {
      err(e);
    }
  }

  async function cancelReservation(id) {
    if (!confirm("Cancel this reservation?")) return;
    try {
      await api.adminCancelReservation?.(id);
      ok("Reservation cancelled!");
      loadReservations();
    } catch (e) {
      err(e);
    }
  }

  async function callQueueEntry(id) {
    if (!confirm("Call this customer to the counter?")) return;
    try {
      await api.adminCallQueue?.(id);
      ok("Customer called! 📢");
      loadQueueEntries();
    } catch (e) {
      err(e);
    }
  }

  async function seatQueueEntry(id) {
    if (!confirm("Mark as seated?")) return;
    try {
      await api.adminSeatQueue?.(id);
      ok("Customer seated! ✅");
      loadQueueEntries();
    } catch (e) {
      err(e);
    }
  }

  async function cancelQueueEntry(id) {
    if (!confirm("Cancel this queue entry?")) return;
    try {
      await api.adminCancelQueue?.(id);
      ok("Queue entry cancelled!");
      loadQueueEntries();
    } catch (e) {
      err(e);
    }
  }

  async function loadAnnouncements() {
    try {
      const data = await api.getAnnouncements?.().catch(() => ({ announcements: [] }));
      setAnnouncements(data?.announcements || []);
    } catch (e) { console.error("Load announcements error:", e); }
  }

  async function sendAnnouncement() {
    console.log("[Admin] Send announcement clicked", newAnnouncement);
    if (!newAnnouncement.title || !newAnnouncement.message) {
      err({ message: "Title and message are required" });
      return;
    }
    try {
      console.log("[Admin] Calling api.createAnnouncement...");
      const result = await api.createAnnouncement(newAnnouncement);
      console.log("[Admin] Announcement created:", result);
      ok("Announcement sent to all users!");
      setNewAnnouncement({ title: "", message: "", type: "info", duration: 30 });
      loadAnnouncements();
    } catch (e) { 
      console.error("[Admin] Failed to send announcement:", e);
      err(e); 
    }
  }

  async function deleteAnnouncement(id) {
    if (!confirm("Delete this announcement?")) return;
    try {
      await api.deleteAnnouncement?.(id);
      ok("Announcement deleted");
      loadAnnouncements();
    } catch (e) { err(e); }
  }

  const cardStyle = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "0.85rem 1rem", marginBottom: "0.5rem" };
  const rowStyle = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" };
  const badgeStyle = (color) => ({ fontSize: "0.7rem", padding: "0.2rem 0.6rem", borderRadius: 999, background: color === "green" ? "rgba(16,185,129,0.12)" : color === "red" ? "rgba(239,68,68,0.12)" : "var(--bg-subtle)", color: color === "green" ? "#10b981" : color === "red" ? "#ef4444" : "var(--text-muted)" });
  const btnSm = { fontSize: "0.72rem", padding: "0.25rem 0.65rem", borderRadius: "0.5rem", border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-main)", cursor: "pointer" };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />

      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl md:text-3xl font-black">Admin Dashboard</h2>
        <button className="ml-auto btn btn-outline" onClick={loadAll}>Refresh</button>
      </div>

      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setSelectedUser(null); setUserHistory(null); }} style={{
            padding: "0.45rem 1rem", borderRadius: 999, border: "1px solid",
            fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
            background: tab === t ? "var(--red)" : "var(--bg-input)",
            borderColor: tab === t ? "var(--red)" : "var(--border)",
            color: tab === t ? "#fff" : "var(--text-main)",
          }}>{t}</button>
        ))}
      </div>

      {tab === "Dashboard" && (
        <>
          {/* Operations Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Reservations Today", value: summary?.reservationsToday },
              { label: "Active Queue", value: summary?.activeQueue },
              { label: "Active Tables", value: summary?.availableTables },
            ].map(s => (
              <div key={s.label} className="card p-4 md:p-6">
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                <div className="text-3xl md:text-4xl font-black mt-1">{s.value ?? "—"}</div>
              </div>
            ))}
          </div>

          {/* User Statistics */}
          <div className="card p-5 mb-4">
            <div className="font-black mb-3">User Statistics</div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "Total Users", value: userStats.total, color: "var(--text-main)" },
                { label: "New Today", value: userStats.newToday, color: "#10b981" },
                { label: "Suspended", value: userStats.suspended, color: "#ef4444" },
                { label: "Staff", value: userStats.staff, color: "#f59e0b" },
                { label: "Admins", value: userStats.admin, color: "#8b5cf6" },
              ].map(s => (
                <div key={s.label} className="text-center p-3" style={{ background: "var(--bg-subtle)", borderRadius: "0.5rem" }}>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="card p-5 mb-4">
            <div className="font-black mb-3">System Status</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Backend API", status: systemStatus.backend, icon: "🖥️" },
                { label: "Firebase", status: systemStatus.firebase, icon: "🔥" },
                { label: "WebSocket", status: systemStatus.websocket, icon: "📡" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 p-3" style={{ background: "var(--bg-subtle)", borderRadius: "0.5rem" }}>
                  <span className="text-lg">{s.icon}</span>
                  <div>
                    <div className="text-sm font-semibold">{s.label}</div>
                    <div className="text-xs" style={{ color: s.status ? "#10b981" : "#ef4444" }}>
                      {s.status ? "✅ Connected" : "❌ Offline"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-5 mb-4 border border-[var(--red)] bg-[rgba(239,68,68,0.05)]">
            <div className="font-black mb-2 text-[var(--red)]">Quick Actions</div>
            <div className="flex gap-2 flex-wrap">
              <button className="btn btn-red" onClick={() => { setTab("Users"); }}>
                👥 Manage Users
              </button>
              <button className="btn btn-outline" onClick={() => { setTab("Tables"); }}>
                🪑 Manage Tables
              </button>
              <button className="btn btn-outline" onClick={() => { setTab("Settings"); }}>
                ⚙️ System Settings
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="font-black mb-3">Reservations (Last 7 Days)</div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                    <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="count" fill="var(--red)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card p-5">
              <div className="font-black mb-3">Peak Hours (Today)</div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peak}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                    <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="count" fill="var(--red)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                Utilization: {util ? `${Math.round((util.utilization || 0) * 100)}%` : "—"}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Reservations Tab ───────────────────────────────────────── */}
      {tab === "Reservations" && (
        <div className="card p-5">
          <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
            <div className="font-black">📅 Reservations ({reservations.length})</div>
            <button className="ml-auto btn btn-outline text-sm" onClick={loadReservations}>🔄 Refresh</button>
          </div>
          
          {reservations.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📅</div>
              <p style={{ color: "var(--text-muted)" }}>No reservations yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {reservations.map(r => (
                <div key={r.id} style={{ ...cardStyle, borderLeft: `4px solid ${r.status === 'confirmed' ? '#10b981' : r.status === 'pending' ? '#f59e0b' : '#ef4444'}` }}>
                  <div style={rowStyle}>
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold">
                        {r.user_name || r.name || "Guest"} · {r.email || "No email"}
                      </div>
                      <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                        📅 {r.date} at {r.time} · 👥 Party of {r.party_size}
                        {r.area_pref && ` · 🪴 ${r.area_pref}`}
                        {r.table_name && ` · 🪑 Table: ${r.table_name}`}
                      </div>
                      {r.special_requests && (
                        <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                          📝 {r.special_requests}
                        </div>
                      )}
                      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        Created: {r.created_at?.slice(0, 16).replace('T', ' ')}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-end" }}>
                      <span style={badgeStyle(r.status === 'confirmed' ? 'green' : r.status === 'pending' ? 'yellow' : r.status === 'cancelled' ? 'red' : '')}>
                        {r.status || "pending"}
                      </span>
                      <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.3rem" }}>
                        {r.status === 'pending' && (
                          <button style={{ ...btnSm, background: '#10b981', color: 'white' }} onClick={() => confirmReservation(r.id)}>
                            ✅ Confirm
                          </button>
                        )}
                        {r.status !== 'cancelled' && r.status !== 'completed' && (
                          <button style={{ ...btnSm, background: '#ef4444', color: 'white' }} onClick={() => cancelReservation(r.id)}>
                            ❌ Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Queue Tab ───────────────────────────────────────── */}
      {tab === "Queue" && (
        <div className="card p-5">
          <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
            <div className="font-black">🐝 Queue Management ({queueEntries.length})</div>
            <button className="ml-auto btn btn-outline text-sm" onClick={loadQueueEntries}>🔄 Refresh</button>
          </div>
          
          {queueEntries.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🐝</div>
              <p style={{ color: "var(--text-muted)" }}>No one in queue.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {/* Waiting entries first */}
              {queueEntries.filter(e => e.status === 'waiting').map((q, idx) => (
                <div key={q.id} style={{ ...cardStyle, borderLeft: '4px solid #3b82f6' }}>
                  <div style={rowStyle}>
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold">
                        #{idx + 1} · {q.name || "Guest"} · 👥 Party of {q.party_size}
                      </div>
                      <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                        Joined: {q.joined_at?.slice(0, 16).replace('T', ' ')}
                      </div>
                      {q.user_id && (
                        <div className="text-xs" style={{ color: "var(--red)" }}>
                          👤 Registered User
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-end" }}>
                      <span style={badgeStyle('blue')}>⏳ Waiting</span>
                      <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.3rem" }}>
                        <button style={{ ...btnSm, background: '#f59e0b', color: 'white' }} onClick={() => callQueueEntry(q.id)}>
                          📢 Call
                        </button>
                        <button style={{ ...btnSm, background: '#10b981', color: 'white' }} onClick={() => seatQueueEntry(q.id)}>
                          ✅ Seat
                        </button>
                        <button style={{ ...btnSm, background: '#ef4444', color: 'white' }} onClick={() => cancelQueueEntry(q.id)}>
                          ❌
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Called entries */}
              {queueEntries.filter(e => e.status === 'called').map(q => (
                <div key={q.id} style={{ ...cardStyle, borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>
                  <div style={rowStyle}>
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold">
                        {q.name || "Guest"} · 👥 Party of {q.party_size}
                      </div>
                      <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                        📢 Called at: {q.called_at?.slice(0, 16).replace('T', ' ')}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-end" }}>
                      <span style={badgeStyle('yellow')}>📢 Called</span>
                      <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.3rem" }}>
                        <button style={{ ...btnSm, background: '#10b981', color: 'white' }} onClick={() => seatQueueEntry(q.id)}>
                          ✅ Seat
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Seated entries (show last 5) */}
              {queueEntries.filter(e => e.status === 'seated').slice(0, 5).map(q => (
                <div key={q.id} style={{ ...cardStyle, borderLeft: '4px solid #10b981', opacity: 0.7 }}>
                  <div style={rowStyle}>
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold">
                        {q.name || "Guest"} · 👥 Party of {q.party_size}
                      </div>
                      <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                        ✅ Seated at: {q.seated_at?.slice(0, 16).replace('T', ' ')}
                      </div>
                    </div>
                    <span style={badgeStyle('green')}>✅ Seated</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Tables" && (
        <div className="card p-5">
          <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
            <div className="font-black">Tables Manager ({tables.length})</div>
            <button className="ml-auto btn btn-outline text-sm" onClick={createTable}>+ Add Table</button>
          </div>
          {tables.map(t => (
            <div key={t.id} style={cardStyle}>
              <div style={rowStyle}>
                <span className="font-bold">{t.name}</span>
                <span style={badgeStyle("")}>{t.area}</span>
                <span style={badgeStyle("")}>Cap {t.capacity}</span>
                <span style={badgeStyle(t.is_active ? "green" : "red")}>{t.is_active ? "active" : "inactive"}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem" }}>
                  <button style={btnSm} onClick={() => toggleTable(t)}>{t.is_active ? "Disable" : "Enable"}</button>
                  <button style={{ ...btnSm, color: "#ef4444" }} onClick={() => deleteTable(t.id)}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Users" && !selectedUser && (
        <div className="card p-5">
          <div className="font-black mb-3">User Management ({users.length} users)</div>
          
          {/* Search and Filter */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-main)" }}
            />
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              style={{ padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-main)" }}
            >
              <option value="all">All Users</option>
              <option value="customer">Customers</option>
              <option value="staff">Staff</option>
              <option value="admin">Admins</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          
          {(() => {
            // Filter users based on search and filter
            const filteredUsers = users.filter(u => {
              const matchesSearch = !userSearch || 
                (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) ||
                (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()));
              
              const matchesFilter = userFilter === "all" || 
                (userFilter === "suspended" ? !u.is_verified : u.role === userFilter);
              
              return matchesSearch && matchesFilter;
            });
            
            if (filteredUsers.length === 0) {
              return <div className="text-sm" style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>No users found matching your criteria.</div>;
            }
            
            return filteredUsers.map(u => (
            <div key={u.id} style={cardStyle}>
              <div style={rowStyle}>
                <div>
                  <div className="font-semibold text-sm">{u.name || "—"}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{u.email}</div>
                </div>
                <span style={badgeStyle(u.role === "admin" ? "red" : u.role === "staff" ? "green" : "")}>{u.role}</span>
                <span style={badgeStyle(u.is_verified ? "green" : "red")}>{u.is_verified ? "active" : "suspended"}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <select style={{ ...btnSm, paddingRight: "0.4rem" }} value={u.role} onChange={e => changeRole(u.id, e.target.value)}>
                    <option value="customer">Customer</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button style={btnSm} onClick={() => toggleSuspend(u)}>{u.is_verified ? "🚫 Suspend" : "✅ Unsuspend"}</button>
                  <button style={btnSm} onClick={() => resetPassword(u.id)}>🔑 Reset PW</button>
                  <button style={btnSm} onClick={() => viewHistory(u)}>📋 History</button>
                  <button style={{ ...btnSm, color: "#ef4444" }} onClick={() => deleteUser(u.id)}>🗑 Delete</button>
                </div>
              </div>
            </div>
          ))})()}
        </div>
      )}

      {tab === "Users" && selectedUser && (
        <div className="card p-5">
          <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <div className="font-black">{selectedUser.name || selectedUser.email}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{selectedUser.email} · {selectedUser.role}</div>
            </div>
            <button className="ml-auto btn btn-outline" onClick={() => { setSelectedUser(null); setUserHistory(null); }}>← Back</button>
          </div>
          <div className="font-bold mb-2">Reservations</div>
          {!userHistory && <div className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</div>}
          {userHistory?.reservations?.length === 0 && <div className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>No reservations.</div>}
          {userHistory?.reservations?.map(r => (
            <div key={r.id} style={{ ...cardStyle, marginBottom: "0.35rem" }}>
              <div style={rowStyle}>
                <span className="text-sm">{r.date} {r.time}</span>
                <span style={badgeStyle("")}>Party {r.party_size}</span>
                <span style={badgeStyle(r.status === "confirmed" ? "green" : r.status === "cancelled" ? "red" : "")}>{r.status}</span>
                {r.table_name && <span style={badgeStyle("")}>Table {r.table_name}</span>}
              </div>
            </div>
          ))}
          <div className="font-bold mb-2 mt-4">Queue History</div>
          {userHistory?.queue?.length === 0 && <div className="text-sm" style={{ color: "var(--text-muted)" }}>No queue history.</div>}
          {userHistory?.queue?.map(q => (
            <div key={q.id} style={{ ...cardStyle, marginBottom: "0.35rem" }}>
              <div style={rowStyle}>
                <span className="text-sm">{q.created_at?.slice(0, 16)}</span>
                <span style={badgeStyle("")}>Party {q.party_size}</span>
                <span style={badgeStyle(q.status === "seated" ? "green" : q.status === "cancelled" ? "red" : "")}>{q.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Announcements" && (
        <div className="card p-5">
          <div className="font-black mb-4">📢 Global Announcements</div>
          
          {/* Create New Announcement */}
          <form className="mb-4 p-4" style={{ background: "var(--bg-subtle)", borderRadius: "0.75rem" }} onSubmit={(e) => { e.preventDefault(); sendAnnouncement(); }}>
            <div className="font-semibold mb-3">Send New Announcement</div>
            <label htmlFor="ann-title" className="text-sm" style={{ display: "block", marginBottom: "0.25rem" }}>Title:</label>
            <input
              id="ann-title"
              name="title"
              type="text"
              placeholder="Announcement Title"
              value={newAnnouncement.title}
              onChange={e => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
              style={{ width: "100%", marginBottom: "0.75rem", padding: "0.6rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-main)" }}
            />
            <label htmlFor="ann-message" className="text-sm" style={{ display: "block", marginBottom: "0.25rem" }}>Message:</label>
            <textarea
              id="ann-message"
              name="message"
              placeholder="Message to all users..."
              value={newAnnouncement.message}
              onChange={e => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
              rows={3}
              style={{ width: "100%", marginBottom: "0.75rem", padding: "0.6rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-main)", resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              <label htmlFor="ann-type" className="text-sm">Type:</label>
              <select
                id="ann-type"
                name="type"
                value={newAnnouncement.type}
                onChange={e => setNewAnnouncement(prev => ({ ...prev, type: e.target.value }))}
                style={{ padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-main)" }}
              >
                <option value="info">ℹ️ Info (Blue)</option>
                <option value="warning">⚠️ Warning (Yellow)</option>
                <option value="success">✅ Success (Green)</option>
                <option value="error">🚨 Urgent (Red)</option>
              </select>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label htmlFor="ann-duration" className="text-sm">Duration:</label>
                <input
                  id="ann-duration"
                  name="duration"
                  type="number"
                  min="5"
                  max="300"
                  value={newAnnouncement.duration}
                  onChange={e => setNewAnnouncement(prev => ({ ...prev, duration: Number(e.target.value) }))}
                  style={{ width: 70, padding: "0.4rem", borderRadius: "0.5rem", border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-main)" }}
                />
                <span className="text-sm">seconds</span>
              </div>
            </div>
            <button type="submit" className="btn btn-red">
              📢 Send to All Users
            </button>
          </form>

          {/* Previous Announcements */}
          <div>
            <div className="font-semibold mb-3">Recent Announcements</div>
            {announcements.length === 0 && (
              <div className="text-sm" style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>
                No announcements sent yet.
              </div>
            )}
            {announcements.map(a => (
              <div key={a.id} style={{ ...cardStyle, borderLeft: `4px solid ${a.type === 'error' ? '#ef4444' : a.type === 'warning' ? '#f59e0b' : a.type === 'success' ? '#10b981' : '#3b82f6'}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="font-semibold text-sm">{a.title}</div>
                    <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{a.message}</div>
                    <div className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                      Sent: {a.created_at?.slice(0, 16)} • Duration: {a.duration}s • Type: {a.type}
                    </div>
                  </div>
                  <button style={{ ...btnSm, color: "#ef4444" }} onClick={() => deleteAnnouncement(a.id)}>🗑 Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "Activity" && (
        <div className="card p-5">
          <div className="font-black mb-4">📋 Live Activity Feed</div>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Real-time tracking of user actions. Updates automatically when users login, make reservations, join queue, etc.
          </p>
          
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {adminActivity.length === 0 && (
              <div className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                No activity recorded yet. Actions will appear here when users interact with the system.
              </div>
            )}
            {adminActivity.map((a, idx) => (
              <div key={a.id || idx} className="flex items-start gap-3 p-3 mb-2" style={{ background: "var(--bg-subtle)", borderRadius: "0.5rem", borderLeft: `3px solid ${
                a.action?.includes('login') ? '#10b981' :
                a.action?.includes('reservation') ? '#3b82f6' :
                a.action?.includes('queue') ? '#f59e0b' : '#6b7280'
              }` }}>
                <div style={{ fontSize: 20 }}>
                  {a.action?.includes('login') ? '🔑' :
                   a.action?.includes('logout') ? '👋' :
                   a.action?.includes('reservation') ? '📅' :
                   a.action?.includes('queue') ? '🐝' : '📌'}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="font-medium">
                    {a.user?.email || a.user_id?.slice(0, 8) + '...'}
                  </div>
                  <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {a.action?.replace(/_/g, ' ')}
                    {a.details?.party_size && ` (${a.details.party_size} guests)`}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {a.created_at?.slice(0, 19).replace('T', ' ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "Settings" && (
        <div className="card p-5">
          <div className="font-black mb-4">System Settings</div>
          
          {/* Feature Toggles */}
          <div className="mb-4">
            <div className="font-semibold mb-2">Feature Toggles</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { key: "queue_enabled", label: "🐝 Queue System", desc: "Allow guests to join the queue" },
                { key: "reservations_enabled", label: "📅 Reservations", desc: "Allow table reservations" },
                { key: "email_notifications", label: "📧 Email Notifications", desc: "Send confirmation emails" },
              ].map(({ key, label, desc }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem", background: "var(--bg-subtle)", borderRadius: "0.5rem" }}>
                  <div>
                    <div className="font-medium text-sm">{label}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</div>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, [key]: !prev[key] }))}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      border: "none",
                      background: settings[key] ? "var(--red)" : "var(--border)",
                      position: "relative",
                      cursor: "pointer",
                      transition: "background 0.2s"
                    }}
                  >
                    <span style={{
                      position: "absolute",
                      top: 2,
                      left: settings[key] ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s"
                    }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Max Party Size */}
          <div className="mb-4">
            <div className="font-semibold mb-2">Configuration</div>
            <div style={{ padding: "0.75rem", background: "var(--bg-subtle)", borderRadius: "0.5rem" }}>
              <label className="text-sm" style={{ display: "block", marginBottom: "0.5rem" }}>
                Max Party Size: <span className="font-bold">{settings.max_party_size}</span>
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={settings.max_party_size}
                onChange={e => setSettings(prev => ({ ...prev, max_party_size: Number(e.target.value) }))}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Save Button */}
          <button className="btn btn-red" onClick={async () => {
            try {
              await api.adminUpdateSettings({
                max_party_size: settings.max_party_size,
                queue_enabled: settings.queue_enabled,
                reservations_enabled: settings.reservations_enabled,
                email_notifications: settings.email_notifications
              });
              ok("Settings saved successfully! Changes will apply immediately.");
            } catch (e) {
              err(e);
            }
          }}>
            💾 Save Settings
          </button>

          <div className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
            Settings are saved to the database and broadcast to all users in real-time.
          </div>
        </div>
      )}

      {/* ── Menu Tab ───────────────────────────────────────── */}
      {tab === "Menu" && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-4">🍽️ Menu Management (Phase 2)</h2>
          
          {/* Add Menu Item Form */}
          <div className="card mb-4" style={{ padding: "1rem" }}>
            <h3 className="text-md font-medium mb-3">Add New Menu Item</h3>
            <div style={{ display: "grid", gap: "0.75rem", maxWidth: "500px" }}>
              <input
                type="text"
                placeholder="Item name (e.g., Chicken Joy)"
                value={newMenuItem.name}
                onChange={e => setNewMenuItem(prev => ({ ...prev, name: e.target.value }))}
                className="input"
              />
              <input
                type="text"
                placeholder="Description"
                value={newMenuItem.description}
                onChange={e => setNewMenuItem(prev => ({ ...prev, description: e.target.value }))}
                className="input"
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="number"
                  placeholder="Price (₱)"
                  value={newMenuItem.price}
                  onChange={e => setNewMenuItem(prev => ({ ...prev, price: e.target.value }))}
                  className="input"
                  style={{ flex: 1 }}
                />
                <select
                  value={newMenuItem.category}
                  onChange={e => setNewMenuItem(prev => ({ ...prev, category: e.target.value }))}
                  className="input"
                  style={{ flex: 1 }}
                >
                  <option value="Appetizers">Appetizers</option>
                  <option value="Mains">Mains</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Drinks">Drinks</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Image URL (optional)"
                value={newMenuItem.image_url}
                onChange={e => setNewMenuItem(prev => ({ ...prev, image_url: e.target.value }))}
                className="input"
              />
              <button 
                className="btn btn-red"
                onClick={async () => {
                  try {
                    await api.adminCreateMenuItem(newMenuItem);
                    ok("Menu item added!");
                    setNewMenuItem({ name: "", description: "", price: "", category: "Mains", image_url: "" });
                    // Reload menu items
                    const data = await api.adminGetMenuItems();
                    setMenuItems(data.items || []);
                  } catch (e) {
                    err(e);
                  }
                }}
                disabled={!newMenuItem.name || !newMenuItem.price}
              >
                ➕ Add Item
              </button>
            </div>
          </div>

          {/* Menu Items List */}
          <div className="card" style={{ padding: "1rem" }}>
            <h3 className="text-md font-medium mb-3">Current Menu</h3>
            {menuItems.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No menu items yet. Add some above!
              </p>
            ) : (
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {menuItems.map(item => (
                  <div 
                    key={item.id} 
                    className="flex justify-between items-center p-3 rounded"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center gap-3">
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 4 }}
                        />
                      )}
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {item.category} • ₱{item.price}
                        </p>
                        {item.description && (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-sm"
                        onClick={async () => {
                          try {
                            await api.adminUpdateMenuItem(item.id, { 
                              is_available: !item.is_available 
                            });
                            ok(item.is_available ? "Item disabled" : "Item enabled");
                            const data = await api.adminGetMenuItems();
                            setMenuItems(data.items || []);
                          } catch (e) {
                            err(e);
                          }
                        }}
                      >
                        {item.is_available ? "🟢" : "🔴"}
                      </button>
                      <button
                        className="btn btn-sm btn-red"
                        onClick={async () => {
                          if (!confirm("Delete this item?")) return;
                          try {
                            await api.adminDeleteMenuItem(item.id);
                            ok("Item deleted");
                            const data = await api.adminGetMenuItems();
                            setMenuItems(data.items || []);
                          } catch (e) {
                            err(e);
                          }
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Info Box */}
          <div className="card mt-4" style={{ padding: "1rem", background: "#1a1a2e" }}>
            <h3 className="text-md font-medium mb-2">💳 Payment Integration (Coming Soon)</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              PayMongo integration for GCash, Maya, GrabPay, and credit cards. 
              Customers can pre-order food during reservation to reduce no-shows and secure revenue.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}