import React from 'react';
import type { Safety } from '../../types';

const STYLE: Record<string, { label: string; cls: string; title: string }> = {
  safe: { label: 'SAFE', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', title: 'Not listed by Google Safe Browsing' },
  unsafe: { label: 'UNSAFE', cls: 'bg-red-500/25 text-red-300 border-red-500/50', title: 'Listed by Google Safe Browsing' },
  error: { label: 'CHECK FAILED', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', title: 'Google Safe Browsing lookup failed; retried in 10 minutes' },
  not_checked: { label: 'NOT CHECKED', cls: 'bg-white/5 text-[#8E8F99] border-white/10', title: 'No Safe Browsing API key set on the backend, or not checked yet' },
  not_applicable: { label: 'LOCAL', cls: 'bg-white/5 text-[#8E8F99] border-white/10', title: 'Local address: never sent to Google' },
};

/** Google Safe Browsing status for a site. */
export const SafetyBadge: React.FC<{ safety?: Safety }> = ({ safety }) => {
  if (!safety) return null;
  const s = STYLE[safety.status] ?? STYLE.not_checked;
  const detail = safety.threats.length ? `: ${safety.threats.join(', ')}` : '';
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${s.cls}`}
      title={`${s.title}${detail}${safety.checked_at ? ` (checked ${new Date(safety.checked_at).toLocaleString()})` : ''}`}
    >
      {s.label}
    </span>
  );
};
