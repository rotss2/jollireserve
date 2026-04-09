import React, { useState, useEffect } from "react";
import { onWSMessage } from "../lib/ws";

const typeColors = {
  info: { bg: "#3b82f6", border: "#2563eb" },
  warning: { bg: "#f59e0b", border: "#d97706" },
  success: { bg: "#10b981", border: "#059669" },
  error: { bg: "#ef4444", border: "#dc2626" }
};

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Listen for WebSocket announcement messages
    const handleMessage = (msg) => {
      if (msg.type === "announcement" && msg.announcement) {
        const a = msg.announcement;
        setAnnouncement(a);
        setVisible(true);

        // Auto-hide after duration
        const durationMs = (a.duration || 30) * 1000;
        const timer = setTimeout(() => {
          setVisible(false);
        }, durationMs);

        return () => clearTimeout(timer);
      }
    };

    // Subscribe to WebSocket messages
    const unsubscribe = onWSMessage(handleMessage);

    // Also check for any recent announcements on load
    checkRecentAnnouncements();

    return () => unsubscribe();
  }, []);

  const checkRecentAnnouncements = async () => {
    try {
      // This could fetch recent announcements from the API
      // For now, we'll just rely on WebSocket for real-time
    } catch (e) {
      console.error("Failed to check recent announcements:", e);
    }
  };

  const closeAnnouncement = () => {
    setVisible(false);
  };

  if (!visible || !announcement) return null;

  const colors = typeColors[announcement.type] || typeColors.info;

  return (
    <div
      style={{
        position: "fixed",
        top: 70,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        maxWidth: "600px",
        width: "90%",
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: "0.75rem",
        padding: "1rem 1.25rem",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        animation: "slideDown 0.3s ease-out"
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: "#fff", fontSize: "1rem", marginBottom: "0.25rem" }}>
            {announcement.title}
          </div>
          <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.875rem" }}>
            {announcement.message}
          </div>
        </div>
        <button
          onClick={closeAnnouncement}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.35rem 0.6rem",
            cursor: "pointer",
            color: "#fff",
            fontSize: "1rem",
            lineHeight: 1,
            transition: "background 0.2s"
          }}
          onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.3)"}
          onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.2)"}
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "3px",
          background: "rgba(255,255,255,0.5)",
          borderRadius: "0 0 0 0.75rem",
          animation: `shrink ${announcement.duration || 30}s linear forwards`
        }}
      />

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
