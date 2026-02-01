/**
 * useToast Hook
 * Provides easy access to toast notification functions
 */

import { useContext } from 'react';
import { ToastContext } from './ToastContext';
import type { ToastContextValue } from './types';

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

// Convenience hook with shorthand methods
export function useToastHelpers() {
  const { showToast, dismissToast, dismissAll } = useToast();

  return {
    showToast,
    dismissToast,
    dismissAll,
    // Shorthand methods
    success: (title: string, message?: string, duration?: number) =>
      showToast({ type: 'success', title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      showToast({ type: 'error', title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      showToast({ type: 'warning', title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      showToast({ type: 'info', title, message, duration }),
  };
}
