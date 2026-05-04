import React from "react";

/**
 * Professional Button Component
 * Provides consistent button hierarchy across the application
 *
 * Variants:
 * - primary: Red background, white text (main actions)
 * - secondary: White/cream background, border (secondary actions)
 * - ghost: Transparent background (subtle actions)
 * - danger: Red outline/text (destructive actions)
 *
 * Sizes:
 * - sm: Small buttons (h-9)
 * - md: Default buttons (h-10)
 * - lg: Large buttons (h-12)
 */

const Button = ({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  onClick,
  type = "button",
  className = "",
  ...props
}) => {
  // Base classes
  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-medium transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-[var(--red)] focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.98]
  `;

  // Variant classes
  const variantClasses = {
    primary: `
      bg-[var(--red)] text-white
      hover:bg-[var(--red-hover)]
      shadow-md hover:shadow-lg
      rounded-full
    `,
    secondary: `
      bg-white dark:bg-gray-800
      text-[var(--text-main)]
      border-2 border-[var(--border)]
      hover:border-[var(--red)] hover:text-[var(--red)]
      rounded-full
    `,
    ghost: `
      bg-transparent
      text-[var(--text-muted)]
      hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]
      rounded-lg
    `,
    danger: `
      bg-transparent
      text-red-600 dark:text-red-400
      border-2 border-red-200 dark:border-red-800
      hover:bg-red-50 dark:hover:bg-red-900/20
      rounded-full
    `,
    outline: `
      bg-transparent
      text-[var(--text-main)]
      border-2 border-[var(--border)]
      hover:bg-[var(--bg-subtle)]
      rounded-full
    `,
  };

  // Size classes
  const sizeClasses = {
    sm: "h-9 px-4 text-sm",
    md: "h-10 px-5 text-sm",
    lg: "h-12 px-6 text-base",
    xl: "h-14 px-8 text-lg",
  };

  // Width classes
  const widthClasses = fullWidth ? "w-full" : "";

  const combinedClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${widthClasses}
    ${className}
  `.trim();

  return (
    <button
      type={type}
      className={combinedClasses}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
};

export default Button;
