import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  hoverable?: boolean;
  variant?: "default" | "elevated" | "subtle";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { className = "", children, padding = "md", hoverable = false, variant = "default", ...props },
    ref,
  ) => {
    const paddings = {
      none: "",
      sm: "p-4",
      md: "p-5",
      lg: "p-6",
      xl: "p-8",
    };

    const variants = {
      default: "bg-surface shadow-md border border-border",
      elevated: "bg-surface shadow-lg",
      subtle: "bg-surface shadow-sm",
    };

    return (
      <div
        ref={ref}
        className={`
          ${variants[variant]}
          rounded-2xl
          ${paddings[padding]}
          ${hoverable ? "transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";
