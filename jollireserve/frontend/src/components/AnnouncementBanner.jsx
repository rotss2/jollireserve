import React, { useState, useEffect } from "react";
import { onWSMessage } from "../lib/ws";
import * as api from "../lib/api";

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
      // Fetch the most recent active announcement from the API
      const res = await api.getActiveAnnouncement?.() || await fetch("/api/announcements/active").then(r => r.ok ? r.json() : null);
      if (res?.announcement) {
        setAnnouncement(res.announcement);
        setVisible(true);
      }
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
        left: 0,
        right: 0,
        zIndex: 1000,
        background: colors.bg,
        borderBottom: `2px solid ${colors.border}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        animation: "slideDown 0.3s ease-out",
        overflow: "hidden"
      }}
    >
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        padding: "0.75rem 1rem",
        position: "relative"
      }}>
        {/* Title - Fixed */}
        <div style={{ 
          fontWeight: 700, 
          color: "#fff", 
          fontSize: "0.875rem",
          whiteSpace: "nowrap",
          marginRight: "1rem",
          flexShrink: 0
        }}>
          📢 {announcement.title}
        </div>
        
        {/* Message - Scrolling Marquee */}
        <div style={{ 
          flex: 1, 
          overflow: "hidden",
          position: "relative",
          maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)"
        }}>
          <div 
            style={{ 
              color: "rgba(255,255,255,0.95)", 
              fontSize: "0.875rem",
              whiteSpace: "nowrap",
              animation: "marquee 15s linear infinite",
              display: "inline-block"
            }}
          >
            {announcement.message} &nbsp;&nbsp;&nbsp; {announcement.message}
          </div>
        </div>
        
        {/* Close Button */}
        <button
          onClick={closeAnnouncement}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.35rem 0.6rem",
            cursor: "pointer",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.875rem",
            marginLeft: "1rem",
            flexShrink: 0
          }}
          onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.3)"}
          onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.2)"}
        >
          ✕
        </button>
      </div>
      
      {/* Add marquee animation */}
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
