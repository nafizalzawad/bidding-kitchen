import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }[maxWidth];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B18]/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidthStyles} bg-[#FFFFFF] rounded-3xl border-3 border-[#1E1B18] shadow-[0_8px_0_#1E1B18] p-6 text-[#1E1B18] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-[#1E1B18]">
          {title && (
            <h3 id="modal-title" className="text-xl font-extrabold font-display text-[#1E1B18]">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            aria-label="Close modal"
            data-testid="modal-close-btn"
            className="min-h-[44px] min-w-[44px] p-2 ml-auto rounded-xl bg-[#F4EFE2] hover:bg-[#FFB703] text-[#1E1B18] border-2 border-[#1E1B18] shadow-[0_2px_0_#1E1B18] active:translate-y-[1px] transition flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
