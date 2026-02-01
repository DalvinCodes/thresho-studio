/**
 * Toast notification types
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, defaults to 5000
}

export interface Toast extends ToastOptions {
  id: string;
  createdAt: number;
}

export interface ToastContextValue {
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}
