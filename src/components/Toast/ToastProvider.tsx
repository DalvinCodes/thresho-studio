/**
 * Toast Context Provider
 * Manages toast state and provides toast functions to the app
 */

import React, { useCallback, useState, useRef } from 'react';
import { ToastContainerInternal } from './ToastContainer';
import { ToastContext } from './ToastContext';
import type { Toast, ToastOptions, ToastContextValue } from './types';

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimeoutsRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    // Clear timeout if exists
    const timeoutId = toastTimeoutsRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      toastTimeoutsRef.current.delete(id);
    }

    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    // Clear all timeouts
    toastTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    toastTimeoutsRef.current.clear();

    setToasts([]);
  }, []);

  const showToast = useCallback((options: ToastOptions): string => {
    const id = crypto.randomUUID();
    const duration = options.duration ?? 5000;

    const newToast: Toast = {
      ...options,
      id,
      createdAt: Date.now(),
      duration,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss if duration > 0
    if (duration > 0) {
      const timeoutId = window.setTimeout(() => {
        dismissToast(id);
      }, duration);
      toastTimeoutsRef.current.set(id, timeoutId);
    }

    return id;
  }, [dismissToast]);

  const value: ToastContextValue = {
    showToast,
    dismissToast,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainerInternal toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}
