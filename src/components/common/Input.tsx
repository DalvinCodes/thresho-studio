import React, { useId } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className = "", label, helperText, error, leftIcon, rightIcon, ...props },
    ref,
  ) => {
    const id = useId();
    const inputId = props.id || id;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block mb-2 text-sm font-medium text-text"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`
              w-full bg-surface text-text border rounded-3xl transition-all duration-200
              placeholder:text-text-subtle
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-subtle
              ${leftIcon ? "pl-11" : "pl-4"}
              ${rightIcon ? "pr-11" : "pr-4"}
              ${
                error
                  ? "border-status-danger focus:ring-status-danger focus:border-status-danger"
                  : "border-border hover:border-text-muted"
              }
              h-11 py-2 text-sm
              ${className}
            `}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-text-muted">
              {rightIcon}
            </div>
          )}
        </div>

        {error && <p className="mt-2 text-sm text-status-danger">{error}</p>}
        {!error && helperText && (
          <p className="mt-2 text-sm text-text-muted">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
