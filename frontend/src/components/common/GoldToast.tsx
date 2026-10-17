import React, { useEffect, useState } from 'react';
import { CheckCircle2, X, RotateCcw } from 'lucide-react';

export interface ToastData {
  id?: string;
  message: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  onUndo?: () => void;
  undoDuration?: number; // in seconds (e.g. 10s)
}

export interface GoldToastProps {
  toast?: ToastData | null;
  message?: string;
  onUndo?: () => void;
  duration?: number;
  onClose: () => void;
}

export const GoldToast: React.FC<GoldToastProps> = ({ 
  toast, 
  message, 
  onUndo, 
  duration = 10, 
  onClose 
}) => {
  const resolvedMessage = toast?.message || message || '';
  const resolvedUndo = toast?.onUndo || onUndo;
  const initialDuration = toast?.undoDuration || duration || 10;

  const [secondsRemaining, setSecondsRemaining] = useState(initialDuration);

  useEffect(() => {
    if (!resolvedMessage) return;

    if (resolvedUndo) {
      setSecondsRemaining(initialDuration);
      const interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [resolvedMessage, resolvedUndo, initialDuration, onClose]);

  if (!resolvedMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#111111] border border-[#D4AF37]/50 shadow-[0_0_25px_rgba(212,175,55,0.2)] animate-in slide-in-from-bottom-5 duration-200">
      <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
      </div>

      <div className="flex flex-col pr-2 max-w-sm">
        <span className="text-xs font-semibold text-[#F8F6F0]">
          {resolvedMessage}
        </span>
        {resolvedUndo && (
          <span className="text-[10px] text-[#A89874] font-mono">
            Auto-applying in {secondsRemaining}s
          </span>
        )}
      </div>

      {resolvedUndo && (
        <button
          onClick={() => {
            resolvedUndo();
            onClose();
          }}
          className="px-2.5 py-1 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#F5D76E] border border-[#D4AF37]/40 text-xs font-mono font-bold flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>UNDO ({secondsRemaining}s)</span>
        </button>
      )}

      <button
        onClick={onClose}
        className="p-1 rounded-lg text-[#77736A] hover:text-[#F8F6F0] hover:bg-white/5 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
