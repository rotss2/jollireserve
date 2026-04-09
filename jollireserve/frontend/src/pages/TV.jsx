import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { connectWS, onWSMessage } from "../lib/ws";
import { getToken } from "../lib/token";
import WeatherWidget from "../components/Weatherwidget";
import { getMusicState, subscribeMusicState } from "../components/MusicPlayer";

const BASE = import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:4000/api"
    : `https://${window.location.hostname}/api`);

function authHeaders() {
  const t = getToken();
  return t
    ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
    : {};
}

function decodeToken(t) {
  if (!t || typeof t !== "string") return null;
  try {
    const part = t.split(".")[1];
    if (!part) return null;
    return JSON.parse(atob(part));
  } catch (e) {
    console.error("Token decode failed", e);
    return null;
  }
}

async function fetchQueue() {
  try {
    const r = await fetch(`${BASE}/queue`, { headers: authHeaders() });
    const data = await r.json();
    // Support both { entries: [] } and flat array responses
    return Array.isArray(data) ? data : data.entries || [];
  } catch {
    return [];
  }
}

async function callEntry(id) {
  await fetch(`${BASE}/queue/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status: "called" }),
  });
}

async function seatEntry(id) {
  await fetch(`${BASE}/queue/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status: "seated" }),
  });
}

async function cancelEntry(id) {
  await fetch(`${BASE}/queue/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status: "cancelled" }),
  });
}

function estimateWait(pos, avg = 7) {
  if (pos <= 0) return "Now";
  const m = pos * avg;
  return m < 60 ? `~${m} min` : `~${Math.round(m / 60)}h ${m % 60}m`;
}

function useFlash(calledEntries) {
  const [flashing, setFlashing] = useState(false);
  const prevIds = useRef(new Set());
  useEffect(() => {
    const hasNew = calledEntries.some((e) => !prevIds.current.has(e.id));
    if (hasNew && calledEntries.length > 0) {
      setFlashing(true);
      setTimeout(() => setFlashing(false), 2000);
    }
    prevIds.current = new Set(calledEntries.map((e) => e.id));
  }, [calledEntries]);
  return flashing;
}

const TRACK_NAMES = [
  "Lofi Cafe Vibes",
  "Bossa Nova Dinner",
  "Gentle Acoustic",
  "Smooth OPM Chill",
];

export default function TV() {
  const [entries, setEntries] = useState([]);
  const [time, setTime] = useState(new Date());
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [music, setMusic] = useState(getMusicState());

  async function load() {
    setEntries(await fetchQueue());
  }

  useEffect(() => {
    const token = getToken();
    if (token) {
      const p = decodeToken(token);
      if (p && ["admin", "staff"].includes(p.role)) setIsAdmin(true);
    }
    load();
    connectWS();
    const off = onWSMessage((msg) => {
      if (msg.type === "queue:changed" || msg.type === "queue:updated") load();
    });
    // Fix: use subscribeMusicState (not onMusicChange) to match MusicPlayer exports
    const offM = subscribeMusicState((s) => setMusic(s));
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => {
      off();
      offM();
      clearInterval(clock);
    };
  }, []);

  async function handleCall(id) {
    await callEntry(id);
    flash("📣 Guest called!");
    load();
  }
  async function handleSeat(id) {
    await seatEntry(id);
    flash("🪑 Guest seated");
    load();
  }
  async function handleCancel(id) {
    await cancelEntry(id);
    flash("❌ Entry removed");
    load();
  }
  async function handleCallNext() {
    const n = waiting[0];
    if (!n) return;
    await callEntry(n.id);
    flash(`📣 Calling ${n.name || "Guest"}`);
    load();
  }
  function flash(msg) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  }

  const called = entries.filter((e) => e.status === "called");
  const waiting = entries.filter((e) => e.status === "waiting");
  const flashing = useFlash(called);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0a0a!important;}
        nav,header.app-nav{display:none!important;}
        @keyframes flashPulse{0%{background:#0a0a0a}15%{background:#c0170f}30%{background:#0a0a0a}45%{background:#c0170f}60%{background:#0a0a0a}100%{background:#0a0a0a}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ticker{0%{transform:translateX(100vw)}100%{transform:translateX(-100%)}}
        @keyframes callPop{0%{transform:scale(0.92);opacity:0}60%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes toastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes noteFloat{0%{transform:translateY(0) rotate(-5deg);opacity:0.9}100%{transform:translateY(-16px) rotate(5deg);opacity:0}}
        .tv-root{min-height:100vh;background:#0a0a0a;color:#fff;font-family:'DM Sans',sans-serif;display:flex;flex-direction:column;overflow:hidden;}
        .tv-root.flashing{animation:flashPulse 2s ease forwards;}
        /* ── Header ── */
        .tv-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 2rem;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;gap:0.75rem;flex-wrap:wrap;}
        .tv-brand{display:flex;align-items:center;gap:0.75rem;}
        .tv-logo{font-family:'Bebas Neue',sans-serif;font-size:1.8rem;letter-spacing:0.08em;color:#fff;}
        .tv-logo span{color:#e8352a;}
        .tv-home-btn{font-size:0.72rem;color:rgba(255,255,255,0.3);border:1px solid rgba(255,255,255,0.1);padding:0.28rem 0.7rem;border-radius:999px;text-decoration:none;letter-spacing:0.08em;transition:color 0.2s;}
        .tv-home-btn:hover{color:#fff;}
        .tv-admin-bar{display:flex;align-items:center;gap:0.6rem;}
        .tv-admin-badge{font-size:0.6rem;letter-spacing:0.15em;text-transform:uppercase;color:#f0c93a;border:1px solid rgba(240,201,58,0.3);padding:0.2rem 0.6rem;border-radius:999px;}
        .tv-call-next-btn{font-family:'Bebas Neue',sans-serif;font-size:0.9rem;letter-spacing:0.12em;background:#e8352a;color:#fff;border:none;padding:0.4rem 1rem;border-radius:999px;cursor:pointer;transition:background 0.2s;}
        .tv-call-next-btn:hover{background:#c0170f;}
        .tv-call-next-btn:disabled{background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.3);cursor:not-allowed;}
        .tv-now-playing{display:flex;align-items:center;gap:0.5rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:999px;padding:0.28rem 0.7rem;}
        .tv-np-dot{width:6px;height:6px;border-radius:50%;background:#e8352a;animation:blink 1s step-end infinite;}
        .tv-np-text{font-size:0.62rem;color:rgba(255,255,255,0.4);letter-spacing:0.08em;white-space:nowrap;}
        .tv-np-note{font-size:0.72rem;animation:noteFloat 2s ease-in-out infinite;display:inline-block;}
        .tv-header-right{display:flex;gap:1rem;align-items:center;}
        .tv-stats{display:flex;gap:1.4rem;align-items:center;}
        .tv-stat{text-align:center;}
        .tv-stat-num{font-family:'Bebas Neue',sans-serif;font-size:2.2rem;line-height:1;}
        .tv-stat-num.yellow{color:#f0c93a;}
        .tv-stat-num.red{color:#e8352a;}
        .tv-stat-label{font-size:0.58rem;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-top:0.12rem;}
        .tv-divider{width:1px;height:2.4rem;background:rgba(255,255,255,0.08);}
        .tv-clock{text-align:right;}
        .tv-clock-time{font-family:'Bebas Neue',sans-serif;font-size:2.2rem;line-height:1;color:#fff;letter-spacing:0.05em;}
        .tv-clock-date{font-size:0.65rem;color:rgba(255,255,255,0.35);letter-spacing:0.1em;text-transform:uppercase;margin-top:0.1rem;}
        /* ── Body ── */
        .tv-body{flex:1;display:grid;grid-template-columns:1fr 1.8fr;overflow:hidden;}
        .tv-called{border-right:1px solid rgba(255,255,255,0.06);padding:1.5rem;display:flex;flex-direction:column;gap:0.85rem;background:rgba(232,53,42,0.03);overflow-y:auto;}
        .tv-called::-webkit-scrollbar{display:none;}
        .tv-section-label{font-family:'Bebas Neue',sans-serif;font-size:0.85rem;letter-spacing:0.25em;text-transform:uppercase;margin-bottom:0.25rem;display:flex;align-items:center;gap:0.5rem;color:#e8352a;flex-shrink:0;}
        .tv-section-label.grey{color:rgba(255,255,255,0.22);}
        .tv-dot{width:7px;height:7px;border-radius:50%;background:#e8352a;animation:blink 1s step-end infinite;}
        .tv-called-card{background:linear-gradient(135deg,#e8352a 0%,#a01f15 100%);border-radius:1.1rem;padding:1.3rem 1.5rem;animation:callPop 0.5s ease forwards;position:relative;overflow:hidden;flex-shrink:0;}
        .tv-called-card::after{content:'';position:absolute;top:-30%;right:-10%;width:60%;height:160%;background:rgba(255,255,255,0.05);transform:rotate(15deg);}
        .tv-called-num{font-family:'Bebas Neue',sans-serif;font-size:3.2rem;line-height:1;color:rgba(255,255,255,0.2);position:absolute;top:0.6rem;right:1rem;}
        .tv-called-name{font-family:'Bebas Neue',sans-serif;font-size:2.5rem;line-height:1;color:#fff;letter-spacing:0.04em;}
        .tv-called-party{color:rgba(255,255,255,0.6);font-size:0.85rem;margin-top:0.3rem;font-weight:600;}
        .tv-called-cta{margin-top:0.7rem;font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:0.15em;color:rgba(255,255,255,0.85);border-top:1px solid rgba(255,255,255,0.15);padding-top:0.6rem;}
        .tv-card-actions{display:flex;gap:0.5rem;margin-top:0.7rem;position:relative;z-index:1;}
        .tv-btn-seat{font-family:'Bebas Neue',sans-serif;font-size:0.78rem;letter-spacing:0.1em;background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:0.25rem 0.8rem;border-radius:999px;cursor:pointer;transition:background 0.2s;}
        .tv-btn-seat:hover{background:rgba(255,255,255,0.35);}
        .tv-btn-remove{font-family:'Bebas Neue',sans-serif;font-size:0.78rem;letter-spacing:0.1em;background:transparent;color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.15);padding:0.25rem 0.8rem;border-radius:999px;cursor:pointer;transition:all 0.2s;}
        .tv-btn-remove:hover{color:#fff;background:rgba(0,0,0,0.2);}
        .tv-empty-called{flex:1;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.1);font-family:'Bebas Neue',sans-serif;font-size:1.2rem;letter-spacing:0.12em;text-align:center;flex-direction:column;gap:0.8rem;}
        .tv-waiting{padding:1.5rem;overflow-y:auto;display:flex;flex-direction:column;gap:0.6rem;}
        .tv-waiting::-webkit-scrollbar{display:none;}
        .tv-wait-card{background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.07);border-radius:0.9rem;padding:0.9rem 1.2rem;display:flex;align-items:center;gap:1rem;animation:slideUp 0.4s ease forwards;}
        .tv-wait-badge{width:2.6rem;height:2.6rem;border-radius:50%;background:#e8352a;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:1.3rem;color:#fff;flex-shrink:0;}
        .tv-wait-badge.dim{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.35);}
        .tv-wait-info{flex:1;min-width:0;}
        .tv-wait-name{font-family:'Bebas Neue',sans-serif;font-size:1.5rem;color:#fff;letter-spacing:0.03em;line-height:1;}
        .tv-wait-sub{color:rgba(255,255,255,0.32);font-size:0.73rem;margin-top:0.18rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .tv-wait-right{display:flex;flex-direction:column;align-items:flex-end;gap:0.3rem;flex-shrink:0;}
        .tv-wait-time{font-family:'Bebas Neue',sans-serif;font-size:0.9rem;letter-spacing:0.1em;color:#f0c93a;}
        .tv-wait-status{font-family:'Bebas Neue',sans-serif;font-size:0.72rem;letter-spacing:0.15em;color:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.08);padding:0.16rem 0.55rem;border-radius:999px;}
        .tv-btn-call{font-family:'Bebas Neue',sans-serif;font-size:0.76rem;letter-spacing:0.1em;background:#e8352a;color:#fff;border:none;padding:0.24rem 0.7rem;border-radius:999px;cursor:pointer;transition:background 0.2s;white-space:nowrap;}
        .tv-btn-call:hover{background:#c0170f;}
        .tv-empty-waiting{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;color:rgba(255,255,255,0.1);font-family:'Bebas Neue',sans-serif;font-size:1.2rem;letter-spacing:0.12em;padding-top:3rem;gap:0.8rem;}
        .tv-toast{position:fixed;bottom:4rem;left:50%;transform:translateX(-50%);background:rgba(20,20,20,0.95);border:1px solid rgba(255,255,255,0.12);color:#fff;font-size:0.85rem;font-weight:600;padding:0.6rem 1.4rem;border-radius:999px;animation:toastIn 0.3s ease;z-index:100;white-space:nowrap;backdrop-filter:blur(8px);}
        .tv-ticker{background:#e8352a;padding:0.5rem 0;overflow:hidden;flex-shrink:0;white-space:nowrap;}
        .tv-ticker-inner{display:inline-block;font-family:'Bebas Neue',sans-serif;font-size:0.9rem;letter-spacing:0.18em;color:#fff;animation:ticker 30s linear infinite;padding-left:100vw;}
        /* ── Mobile responsive ── */
        @media(max-width:640px){
          .tv-header{padding:0.75rem 1rem;gap:0.5rem;}
          .tv-logo{font-size:1.4rem;}
          .tv-header-right{gap:0.6rem;}
          .tv-stats{gap:0.8rem;}
          .tv-stat-num{font-size:1.6rem;}
          .tv-clock-time{font-size:1.6rem;}
          .tv-clock-date{display:none;}
          .tv-body{grid-template-columns:1fr;grid-template-rows:auto auto;overflow:auto;}
          .tv-called{border-right:none;border-bottom:1px solid rgba(255,255,255,0.06);padding:1rem;max-height:45vh;overflow-y:auto;}
          .tv-waiting{padding:1rem;}
          .tv-called-name{font-size:1.8rem;}
          .tv-called-num{font-size:2.2rem;}
          .tv-wait-name{font-size:1.2rem;}
          .tv-wait-badge{width:2.1rem;height:2.1rem;font-size:1.1rem;}
          .tv-now-playing{display:none;}
          .tv-admin-badge{display:none;}
        }
        @media(max-width:380px){
          .tv-logo{font-size:1.2rem;}
          .tv-stat-num{font-size:1.3rem;}
          .tv-clock-time{font-size:1.3rem;}
          .tv-divider{display:none;}
        }
      `}</style>

      <div className={`tv-root${flashing ? " flashing" : ""}`}>
        <div className="tv-header">
          <div className="tv-brand">
            <div className="tv-logo">Jolli<span>Reserve</span></div>
            <Link to="/" className="tv-home-btn">← Home</Link>
          </div>

          {isAdmin && (
            <div className="tv-admin-bar">
              <span className="tv-admin-badge">⚡ Staff Mode</span>
              <button
                className="tv-call-next-btn"
                disabled={waiting.length === 0}
                onClick={handleCallNext}
              >
                📣 Call Next
              </button>
            </div>
          )}

          {music.isPlaying && (
            <div className="tv-now-playing">
              <span className="tv-np-note">🎵</span>
              <span className="tv-np-dot" />
              <span className="tv-np-text">
                {TRACK_NAMES[music.trackIndex] || "Now Playing"}
              </span>
            </div>
          )}

          <div className="tv-header-right">
            <WeatherWidget />
            <div className="tv-divider" />
            <div className="tv-stats">
              <div className="tv-stat">
                <div className="tv-stat-num yellow">{waiting.length}</div>
                <div className="tv-stat-label">Waiting</div>
              </div>
              <div className="tv-divider" />
              <div className="tv-stat">
                <div className="tv-stat-num red">{called.length}</div>
                <div className="tv-stat-label">Called</div>
              </div>
            </div>
            <div className="tv-divider" />
            <div className="tv-clock">
              <div className="tv-clock-time">
                {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
              <div className="tv-clock-date">
                {time.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
              </div>
            </div>
          </div>
        </div>

        <div className="tv-body">
          <div className="tv-called">
            <div className="tv-section-label">
              <span className="tv-dot" />Now Serving
            </div>
            {called.length === 0 ? (
              <div className="tv-empty-called">
                <span style={{ fontSize: "3rem" }}>🪑</span>
                No one called yet
              </div>
            ) : (
              called.map((e, i) => (
                <div className="tv-called-card" key={e.id}>
                  <div className="tv-called-num">#{i + 1}</div>
                  <div className="tv-called-name">{e.name || "Guest"}</div>
                  <div className="tv-called-party">Party of {e.party_size}</div>
                  <div className="tv-called-cta">▶ Please proceed to the counter</div>
                  {isAdmin && (
                    <div className="tv-card-actions">
                      <button className="tv-btn-seat" onClick={() => handleSeat(e.id)}>✓ Seated</button>
                      <button className="tv-btn-remove" onClick={() => handleCancel(e.id)}>✕ Remove</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="tv-waiting">
            <div className="tv-section-label grey">Up Next</div>
            {waiting.length === 0 ? (
              <div className="tv-empty-waiting">
                <span style={{ fontSize: "3rem" }}>🎉</span>
                Queue is clear
              </div>
            ) : (
              waiting.map((e, i) => (
                <div className="tv-wait-card" key={e.id}>
                  <div className={`tv-wait-badge${i > 0 ? " dim" : ""}`}>{i + 1}</div>
                  <div className="tv-wait-info">
                    <div className="tv-wait-name">{e.name || "Guest"}</div>
                    <div className="tv-wait-sub">
                      Party of {e.party_size}
                      {e.created_at
                        ? ` · joined ${new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : ""}
                    </div>
                  </div>
                  <div className="tv-wait-right">
                    <div className="tv-wait-time">{estimateWait(i)}</div>
                    {isAdmin ? (
                      <button className="tv-btn-call" onClick={() => handleCall(e.id)}>📣 Call</button>
                    ) : (
                      <div className="tv-wait-status">Waiting</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="tv-ticker">
          <div className="tv-ticker-inner">
            {entries.length > 0
              ? `NOW SERVING ${entries.length} ${entries.length === 1 ? "GUEST" : "GUESTS"}  ·  ${waiting.map((e) => e.name || "GUEST").join("  ·  ")}  ·  THANK YOU FOR YOUR PATIENCE`
              : "WELCOME TO JOLLIRESERVE  ·  NO ACTIVE QUEUE AT THIS TIME  ·  PLEASE JOIN THE QUEUE TO GET STARTED"}
          </div>
        </div>

        {actionMsg && <div className="tv-toast">{actionMsg}</div>}
      </div>
    </>
  );
}