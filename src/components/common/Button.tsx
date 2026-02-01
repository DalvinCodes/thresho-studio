import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer active:scale-[0.98]";

    const variants = {
      primary:
        "bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-md hover:shadow-lg",
      secondary:
        "bg-surface text-text border-2 border-border hover:bg-bg-subtle hover:border-border shadow-sm",
      ghost: "bg-transparent text-text-muted hover:bg-bg-subtle hover:text-text",
      danger:
        "bg-status-danger text-white hover:bg-red-600 shadow-sm",
    };

    const sizes = {
      sm: "h-9 px-4 text-sm rounded-full gap-2",
      md: "h-11 px-5 text-sm rounded-full gap-2",
      lg: "h-12 px-6 text-base rounded-full gap-3",
    };

    const iconSizes = {
      sm: "w-4 h-4",
      md: "w-4 h-4",
      lg: "w-5 h-5",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className={`animate-spin ${iconSizes[size]}`} />}
        {!isLoading && leftIcon && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}

        {children}

        {!isLoading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
