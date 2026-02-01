/**
 * Individual Toast Component
 * Displays a single toast notification with animations
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { Toast, ToastType } from './types';

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5" />,
  error: <XCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
};

// Solid backgrounds - NO transparency
const colorMap: Record<ToastType, { bg: string; border: string; icon: string; progress: string }> = {
  success: {
    bg: 'bg-[#1A2F1A]',
    border: 'border-[#2D5A2D]',
    icon: 'text-[#5CA86C]',
    progress: '#5CA86C',
  },
  error: {
    bg: 'bg-[#2F1A1A]',
    border: 'border-[#5A2D2D]',
    icon: 'text-[#E85D4C]',
    progress: '#E85D4C',
  },
  warning: {
    bg: 'bg-[#2F2A1A]',
    border: 'border-[#5A4D2D]',
    icon: 'text-[#E8A54C]',
    progress: '#E8A54C',
  },
  info: {
    bg: 'bg-[#1A252F]',
    border: 'border-[#2D455A]',
    icon: 'text-[#4A90A4]',
    progress: '#4A90A4',
  },
};

export function ToastItem({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation after mount
    const enterTimeout = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(enterTimeout);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    // Wait for exit animation to complete before removing
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300);
  };

  const colors = colorMap[toast.type];

  return (
    <div
      className={`
        relative flex items-start gap-3 px-4 py-3 rounded-3xl shadow-2xl 
        border-2 ${colors.border} ${colors.bg}
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        min-w-[320px] max-w-[400px]
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${colors.icon}`}>
        {iconMap[toast.type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-white">{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-gray-300 mt-0.5">{toast.message}</p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-3xl text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar for auto-dismiss */}
      {toast.duration && toast.duration > 0 && (
        <div
          className="absolute bottom-0 left-0 h-0.5 rounded-b-xl"
          style={{
            width: '100%',
            animation: `shrink ${toast.duration}ms linear forwards`,
            backgroundColor: colors.progress,
          }}
        />
      )}
    </div>
  );
}