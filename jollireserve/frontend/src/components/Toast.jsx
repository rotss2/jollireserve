import React from "react";

export default function Toast({ value, onClose }) {
  if (!value) return null;

  const isError   = value.type === "error";
  const isSuccess = value.type === "success";

  return (
    <div style={{
      position: "fixed",
      top: "1rem",
      right: "1rem",
      zIndex: 9999,
      maxWidth: "360px",
      width: "100%",
      pointerEvents: "none",
    }}>
      <div style={{
        pointerEvents: "auto",
        background: "var(--bg-card)",
        border: `1px solid ${isError ? "var(--red)" : "var(--border)"}`,
        boxShadow: "var(--shadow-card)",
        borderRadius: "14px",
        padding: "0.85rem 1rem",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: "toastIn 0.3s ease forwards",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1rem" }}>
              {isError ? "❌" : isSuccess ? "✅" : "ℹ️"}
            </span>
            <span style={{
              fontSize: "0.85rem",
              fontWeight: 500,
              color: "var(--text-main)",
              lineHeight: 1.5,
            }}>
              {value.message}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "0.8rem",
              padding: 0,
              lineHeight: 1,
              flexShrink: 0,
              marginTop: "2px",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}