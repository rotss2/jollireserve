import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { connectWS, onWSMessage } from "../lib/ws";

const BASE = import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:4000/api"
    : `https://${window.location.hostname}/api`);

export default function QueueStatus() {
  const { id } = useParams();
  const [entry, setEntry] = useState(null);
  const [position, setPosition] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [entryRes, queueRes] = await Promise.all([
        fetch(`${BASE}/queue/${id}/status`),
        fetch(`${BASE}/queue/active`),
      ]);
      const entryData = await entryRes.json();
      const queueData = await queueRes.json();

      if (!entryData.entry) { setError("Queue entry not found."); setLoading(false); return; }

      const entries = queueData.entries || [];
      const waiting = entries.filter((e) => e.status === "waiting");
      const pos = waiting.findIndex((e) => e.id === id);

      setEntry(entryData.entry);
      setPosition(pos === -1 ? null : pos + 1);
      setTotal(waiting.length);
    } catch {
      setError("Could not load queue status.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    connectWS();
    const off = onWSMessage((msg) => {
      if (msg.type === "queue:changed") load();
    });
    return () => off();
  }, [id]);

  const statusColor = {
    waiting: "var(--red)",
    called: "#16a34a",
    seated: "#2563eb",
    cancelled: "#9ca3af",
  };

  const statusMessage = {
    waiting: "You're in the queue — hang tight!",
    called: "Your table is ready — please proceed to the counter!",
    seated: "You've been seated. Enjoy your meal! 🎉",
    cancelled: "This queue entry has been cancelled.",
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      background: "var(--bg-body, #fbf3df)",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
    }}>
      <div style={{
        background: "var(--bg-card, rgba(255,255,255,0.8))",
        border: "1px solid var(--border, rgba(0,0,0,0.08))",
        borderRadius: "2rem",
        padding: "3rem 2.5rem",
        maxWidth: "420px",
        width: "100%",
        textAlign: "center",
        boxShadow: "0 4px 40px rgba(0,0,0,0.08)",
      }}>
        {/* Brand */}
        <div style={{ fontWeight: 800, fontSize: "1.2rem", marginBottom: "1.5rem" }}>
          <span style={{ color: "var(--text-main, #121212)" }}>Jolli</span>
          <span style={{ color: "var(--red, #d10b14)" }}>Reserve</span>
        </div>

        {loading && (
          <div style={{ color: "var(--text-muted)", fontSize: "1rem" }}>Loading your queue status…</div>
        )}

        {error && (
          <div style={{ color: "#e8352a", fontWeight: 600 }}>{error}</div>
        )}

        {!loading && !error && entry && (
          <>
            {/* Status badge */}
            <div style={{
              display: "inline-block",
              background: statusColor[entry.status] || "#aaa",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.8rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "0.3rem 1rem",
              borderRadius: "999px",
              marginBottom: "1.5rem",
            }}>
              {entry.status}
            </div>

            {/* Position (only when waiting) */}
            {entry.status === "waiting" && position !== null && (
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{
                  fontSize: "6rem",
                  fontWeight: 900,
                  lineHeight: 1,
                  color: "var(--red, #d10b14)",
                }}>
                  #{position}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.4rem" }}>
                  {position === 1 ? "You're next!" : `${position - 1} ${position - 1 === 1 ? "person" : "people"} ahead of you`}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                  ~{position * 7} min estimated wait
                </div>
              </div>
            )}

            {/* Called / Seated animation */}
            {entry.status === "called" && (
              <div style={{ fontSize: "4rem", marginBottom: "1rem", animation: "pulse 1s infinite" }}>📣</div>
            )}
            {entry.status === "seated" && (
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
            )}

            {/* Status message */}
            <div style={{
              fontSize: "1.05rem",
              fontWeight: 600,
              color: "var(--text-main)",
              marginBottom: "1.5rem",
              lineHeight: 1.4,
            }}>
              {statusMessage[entry.status]}
            </div>

            {/* Guest info */}
            <div style={{
              background: "rgba(0,0,0,0.03)",
              borderRadius: "1rem",
              padding: "1rem 1.2rem",
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              textAlign: "left",
            }}>
              <div><strong>Name:</strong> {entry.name || "Guest"}</div>
              <div><strong>Party size:</strong> {entry.party_size}</div>
              <div><strong>Joined:</strong> {entry.created_at ? new Date(entry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
            </div>

            {/* Live indicator */}
            <div style={{
              marginTop: "1.2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
            }}>
              <span style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#16a34a",
                display: "inline-block",
                animation: "blink 1.2s step-end infinite",
              }} />
              LIVE · Updates automatically
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.15); }
        }
        @keyframes blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}