import React from "react";

type BadgeVariant =
  | "default"
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "error";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: BadgeVariant;
  interactive?: boolean;
  onRemove?: () => void;
}

export const Badge = ({
  children,
  variant = "default",
  interactive = false,
  onRemove,
  className = "",
  ...props
}: BadgeProps) => {
  const variants = {
    default: "bg-bg-subtle text-text border-border",
    neutral: "bg-surface text-text-muted border-border",
    brand: "bg-primary-light text-primary border-primary",
    success: "bg-green-100 text-green-700 border-green-300",
    warning: "bg-yellow-100 text-yellow-700 border-yellow-300",
    error: "bg-red-100 text-red-700 border-red-300",
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border
        ${variants[variant]}
        ${interactive ? "hover:opacity-80 cursor-pointer" : ""}
        ${className}
      `}
      {...props}
    >
      {variant === "success" && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {variant === "error" && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {variant === "warning" && (
        <span className="w-1.5 h-1.5 rounded-full border border-current" />
      )}

      {children}

      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:text-text focus:outline-none"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
};
