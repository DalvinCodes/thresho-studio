/**
 * ThemeToggle Component
 * Switch between light and dark themes
 */

import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

interface ThemeToggleProps {
  variant?: "icon" | "button";
  size?: "sm" | "md" | "lg";
}

export function ThemeToggle({ variant = "icon", size = "md" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-9 h-9",
    lg: "w-10 h-10",
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  if (variant === "button") {
    return (
      <button
        onClick={toggleTheme}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-3xl
          text-text-muted hover:text-text
          bg-surface hover:bg-surface-raised
          border border-border hover:border-border
          transition-all duration-200
        `}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        {theme === "light" ? (
          <Moon size={iconSizes[size]} />
        ) : (
          <Sun size={iconSizes[size]} />
        )}
        <span className="text-sm font-medium">
          {theme === "light" ? "Dark" : "Light"}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center
        rounded-3xl
        text-text-muted hover:text-text
        bg-surface hover:bg-surface-raised
        border border-border hover:border-border
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 focus:ring-offset-bg
      `}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <Moon size={iconSizes[size]} />
      ) : (
        <Sun size={iconSizes[size]} />
      )}
    </button>
  );
}
