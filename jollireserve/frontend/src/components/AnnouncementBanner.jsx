import React, { useState, useEffect } from "react";
import { onWSMessage } from "../lib/ws";
import * as api from "../lib/api";

// Modern color scheme matching Jollibee theme
const typeStyles = {
  info: { 
    bg: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", 
    icon: "📢",
    shadow: "0 8px 32px rgba(220, 38, 38, 0.4)"
  },
  warning: { 
    bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", 
    icon: "⚠️",
    shadow: "0 8px 32px rgba(245, 158, 11, 0.4)"
  },
  success: { 
    bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
    icon: "✅",
    shadow: "0 8px 32px rgba(16, 185, 129, 0.4)"
  },
  error: { 
    bg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", 
    icon: "🚨",
    shadow: "0 8px 32px rgba(239, 68, 68, 0.4)"
  }
};

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleMessage = (msg) => {
      if (msg.type === "announcement" && msg.announcement) {
        const a = msg.announcement;
        setAnnouncement(a);
        setVisible(true);

        const durationMs = (a.duration || 30) * 1000;
        const timer = setTimeout(() => {
          setVisible(false);
        }, durationMs);

        return () => clearTimeout(timer);
      }
    };

    const unsubscribe = onWSMessage(handleMessage);
    checkRecentAnnouncements();

    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);

    return () => {
      unsubscribe();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const checkRecentAnnouncements = async () => {
    try {
      const res = await api.getActiveAnnouncement?.() || await fetch("/api/announcements/active").then(r => r.ok ? r.json() : null);
      if (res?.announcement) {
        setAnnouncement(res.announcement);
        setVisible(true);
      }
    } catch (e) {
      console.error("Failed to check recent announcements:", e);
    }
  };

  const closeAnnouncement = () => setVisible(false);

  if (!visible || !announcement) return null;

  const style = typeStyles[announcement.type] || typeStyles.info;

  return (
    <div style={{
      position: "fixed",
      top: isMobile ? 60 : 80,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      width: isMobile ? "calc(100% - 20px)" : "90%",
      maxWidth: "800px",
      animation: "slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
    }}>
      <div style={{
        background: style.bg,
        borderRadius: "16px",
        boxShadow: style.shadow,
        overflow: "hidden",
        position: "relative"
      }}>
        {/* Content Container */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          padding: isMobile ? "16px" : "20px",
          gap: isMobile ? "12px" : "16px"
        }}>
          {/* Icon */}
          <div style={{
            fontSize: isMobile ? "24px" : "28px",
            flexShrink: 0,
            marginTop: "2px"
          }}>
            {style.icon}
          </div>

          {/* Text Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title */}
            <h3 style={{
              margin: "0 0 8px 0",
              color: "#fff",
              fontSize: isMobile ? "16px" : "18px",
              fontWeight: 700,
              lineHeight: 1.3,
              textShadow: "0 1px 2px rgba(0,0,0,0.2)"
            }}>
              {announcement.title}
            </h3>
            
            {/* Message */}
            <p style={{
              margin: 0,
              color: "rgba(255,255,255,0.95)",
              fontSize: isMobile ? "14px" : "15px",
              lineHeight: 1.6,
              wordWrap: "break-word",
              overflowWrap: "break-word"
            }}>
              {announcement.message}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={closeAnnouncement}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: "50%",
              width: isMobile ? "32px" : "36px",
              height: isMobile ? "32px" : "36px",
              cursor: "pointer",
              color: "#fff",
              fontSize: isMobile ? "18px" : "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s ease",
              backdropFilter: "blur(4px)"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255,255,255,0.25)";
              e.target.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255,255,255,0.15)";
              e.target.style.transform = "scale(1)";
            }}
            aria-label="Close announcement"
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{
          height: "3px",
          background: "rgba(255,255,255,0.3)",
          position: "relative"
        }}>
          <div style={{
            height: "100%",
            background: "rgba(255,255,255,0.8)",
            borderRadius: "0 0 0 16px",
            animation: `progress ${announcement.duration || 30}s linear forwards`
          }} />
        </div>
      </div>

      <style>{`
        @keyframes slideInDown {
          from { 
            opacity: 0; 
            transform: translateX(-50%) translateY(-30px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateX(-50%) translateY(0) scale(1); 
          }
        }
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
