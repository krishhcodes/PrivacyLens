import React from 'react';
import type { Severity } from '../../types';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  className = ''
}) => {
  const getStyle = () => {
    switch (severity) {
      case 'high':
        return 'bg-[#450A0A]/70 text-[#FF5D6C] border border-[#DC2626]/50 shadow-[0_0_10px_rgba(255,93,108,0.2)]';
      case 'review':
        return 'bg-[#451A03]/70 text-[#FFB454] border border-[#D97706]/50';
      case 'info':
        return 'bg-[#1C1917]/80 text-[#BFA15F] border border-[#786333]/40';
      default:
        return 'bg-[#18181B] text-slate-400 border border-slate-700';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase ${getStyle()} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{severity}</span>
    </span>
  );
};
