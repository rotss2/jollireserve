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

const TABS = ["Dashboard", "Tables", "Users"];

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

  const ok = (msg) => setToast({ message: msg, type: "success" });
  const err = (e) => setToast({ message: e?.response?.data?.error || e.message || "Error", type: "error" });

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(Date.now() - 6 * 24 * 3600 * 1000);
    return { from: toISO(from), to: toISO(to) };
  }, []);

  async function loadAll() {
    try {
      const [s, d, u, t, us] = await Promise.allSettled([
        api.analyticsSummary(),
        api.analyticsByDay(range.from, range.to),
        api.analyticsUtil(range.from, range.to),
        api.adminTables(),
        api.adminUsers(),
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
      if (us.status === "fulfilled") setUsers(us.value.users || []);
    } catch (e) { err(e); }
  }

  useEffect(() => {
    loadAll();
    connectWS();
    const off = onWSMessage((msg) => {
      if (["queue:changed", "reservations:changed", "tables:changed"].includes(msg.type)) loadAll();
    });
    return () => off();
  }, []);

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

          {/* Quick Access Actions */}
          <div className="card p-5 mb-4 border border-[var(--red)] bg-[rgba(239,68,68,0.05)]">
            <div className="font-black mb-2 text-[var(--red)]">Admin Actions</div>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>Access full control over all users (change roles, suspend accounts, reset passwords, delete users).</p>
            <button className="btn btn-red w-full md:w-auto" onClick={() => { setTab("Users"); setSelectedUser(null); setUserHistory(null); }}>
              Manage Users & Access Control
            </button>
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
          {users.map(u => (
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
          ))}
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
    </div>
  );
}