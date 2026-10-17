import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  isDestructive?: boolean;
  severity?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  isDestructive = true,
  severity,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const resolvedConfirm = confirmText || confirmLabel || 'Confirm Action';
  const resolvedCancel = cancelText || cancelLabel || 'Cancel';
  const isDanger = isDestructive || severity === 'danger' || severity === 'high';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#111111] border border-[#29251A] p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isDanger ? 'bg-[#FF5D6C]/10 text-[#FF5D6C] border border-[#FF5D6C]/30' : 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#F8F6F0] font-['Cinzel',serif]">
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-[#77736A] hover:text-[#F8F6F0] hover:bg-[#1A1812] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#A89874] leading-relaxed">
          {message}
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8E8F99] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            {resolvedCancel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md ${
              isDanger
                ? 'bg-[#FF5D6C]/20 hover:bg-[#FF5D6C]/30 text-[#FF5D6C] border border-[#FF5D6C]/40'
                : 'gold-gradient-bg text-black hover:brightness-110'
            }`}
          >
            {resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
};
