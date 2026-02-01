/**
 * Toast Container Component
 * Renders all active toast notifications in a stack
 */

import React from 'react';
import { ToastItem } from './Toast';

// This is a placeholder component - the actual toast container is rendered by ToastProvider
export function ToastContainer() {
  return null;
}

// This component receives toasts directly from the provider
interface ToastContainerInternalProps {
  toasts: Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; duration?: number; createdAt: number }>;
  onDismiss: (id: string) => void;
}

export function ToastContainerInternal({ toasts, onDismiss }: ToastContainerInternalProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            toast={toast}
            onDismiss={onDismiss}
          />
        </div>
      ))}
    </div>
  );
}
