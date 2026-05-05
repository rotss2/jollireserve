import React, { useEffect } from "react";

export default function Toast({ value, onClose }) {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (value) {
      const timer = setTimeout(() => {
        onClose?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [value, onClose]);

  if (!value) return null;

  const isError = value.type === "error";
  const isSuccess = value.type === "success";

  return (
    <div className="fixed top-16 sm:top-4 right-4 left-4 sm:left-auto z-[9999] sm:max-w-sm w-auto">
      <div
        className={`
          pointer-events-auto rounded-xl shadow-lg backdrop-blur-md
          border px-4 py-3 flex items-start gap-3
          animate-in slide-in-from-top-2 fade-in duration-300
          ${isError ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" : ""}
          ${isSuccess ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" : ""}
          ${!isError && !isSuccess ? "bg-[var(--bg-card)] border-[var(--border)]" : ""}
        `}
      >
        {/* Icon */}
        <span className="text-xl flex-shrink-0 mt-0.5">
          {isError ? "❌" : isSuccess ? "✅" : "ℹ️"}
        </span>

        {/* Message */}
        <span className="text-sm font-medium text-[var(--text-main)] leading-relaxed flex-1">
          {value.message}
        </span>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[var(--text-muted)]"
          aria-label="Close notification"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}