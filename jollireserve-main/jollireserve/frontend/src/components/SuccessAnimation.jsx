import React, { useEffect, useState } from "react";

export default function SuccessAnimation({ message, onComplete, duration = 2000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        animation: "fadeIn 0.3s ease-out",
      }}
    >
      {/* Success Circle */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          backgroundColor: "#27AE60",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "scaleIn 0.5s ease-out, pulse 1s ease-in-out infinite",
          boxShadow: "0 0 30px rgba(39, 174, 96, 0.5)",
        }}
      >
        {/* Checkmark */}
        <svg
          width={60}
          height={60}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            animation: "checkmark 0.5s ease-out 0.3s both",
          }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* Message */}
      <p
        style={{
          color: "white",
          fontSize: "1.5rem",
          fontWeight: "bold",
          marginTop: "1.5rem",
          textAlign: "center",
          animation: "slideUp 0.5s ease-out 0.5s both",
        }}
      >
        {message || "Success!"}
      </p>

      {/* Confetti dots */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: ["#E84C4C", "#F39C12", "#27AE60", "#3498DB"][i % 4],
            animation: `confetti 1s ease-out ${i * 0.1}s both`,
            left: `${50 + Math.cos((i * 30 * Math.PI) / 180) * 30}%`,
            top: `${50 + Math.sin((i * 30 * Math.PI) / 180) * 30}%`,
          }}
        />
      ))}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes checkmark {
          from {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
          }
          to {
            stroke-dasharray: 100;
            stroke-dashoffset: 0;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes confetti {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(
              ${Math.random() * 200 - 100}px,
              ${Math.random() * 200 - 100}px
            ) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
