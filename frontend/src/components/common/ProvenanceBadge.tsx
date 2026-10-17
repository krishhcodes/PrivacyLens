import React from 'react';
import type { Provenance } from '../../types';

interface ProvenanceBadgeProps {
  provenance: Provenance;
  className?: string;
  size?: 'sm' | 'md';
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  provenance,
  className = '',
  size = 'md'
}) => {
  const getStyle = () => {
    switch (provenance) {
      case 'observed':
        return 'bg-[#171717] text-[#D4AF37] border border-[#786333]/50';
      case 'policy_declared':
        return 'bg-[#1E1B4B]/50 text-[#818CF8] border border-[#4338CA]/60';
      case 'inferred':
        return 'bg-[#2E1E05]/60 text-[#F59E0B] border border-[#B45309]/60';
      case 'simulated':
        return 'bg-[#18181B] text-[#A1A1AA] border border-dashed border-[#52525B]';
      default:
        return 'bg-[#18181B] text-[#71717A] border border-[#27272A]';
    }
  };

  const getLabel = () => {
    switch (provenance) {
      case 'observed':
        return 'OBSERVED';
      case 'policy_declared':
        return 'POLICY DECLARED';
      case 'inferred':
        return 'INFERRED';
      case 'simulated':
        return 'SIMULATED DEMO';
      default:
        return 'UNKNOWN';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-semibold rounded-md tracking-wider uppercase ${sizeClasses} ${getStyle()} ${className}`}
      title={`Data provenance category: ${getLabel()}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      <span>{getLabel()}</span>
    </span>
  );
};
