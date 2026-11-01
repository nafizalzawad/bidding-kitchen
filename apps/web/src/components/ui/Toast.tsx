import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps {
  message: string;
  type?: ToastType;
  isOpen: boolean;
  onClose?: () => void;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  isOpen,
  onClose,
  durationMs = 3000,
}) => {
  useEffect(() => {
    if (!isOpen || !onClose || durationMs <= 0) return;
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [isOpen, onClose, durationMs]);

  if (!isOpen) return null;

  const typeConfig: Record<ToastType, { bg: string; text: string; icon: React.ReactNode }> = {
    info: {
      bg: 'bg-[#2563EB]',
      text: 'text-[#FFFFFF]',
      icon: <Info className="w-5 h-5 shrink-0" />,
    },
    success: {
      bg: 'bg-[#1D7A4C]',
      text: 'text-[#FFFFFF]',
      icon: <CheckCircle2 className="w-5 h-5 shrink-0" />,
    },
    warning: {
      bg: 'bg-[#FFB703]',
      text: 'text-[#1E1B18]',
      icon: <AlertCircle className="w-5 h-5 shrink-0" />,
    },
    error: {
      bg: 'bg-[#DC2626]',
      text: 'text-[#FFFFFF]',
      icon: <AlertCircle className="w-5 h-5 shrink-0" />,
    },
  };

  const config = typeConfig[type];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-sm sm:max-w-md w-[calc(100%-2rem)]"
    >
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18] font-bold text-sm ${config.bg} ${config.text}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {config.icon}
          <span className="truncate">{message}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Dismiss toast"
            className="min-h-[44px] min-w-[44px] p-2 hover:opacity-80 active:translate-y-[1px] flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
