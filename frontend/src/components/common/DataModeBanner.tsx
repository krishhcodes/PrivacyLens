import React, { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { loadSites, useSites } from '../../services/siteStore';
import { API_BASE } from '../../api/client';

/** Shown only when the backend can't be reached: everything below it is demo data. */
export const DataModeBanner: React.FC = () => {
  const { mode, error } = useSites();
  const [retrying, setRetrying] = useState(false);
  if (mode === 'live' || mode === 'loading') {
    return error ? (
      <div className="no-print p-3 rounded-2xl bg-red-950/25 border border-red-500/35 text-xs text-red-200 font-mono">
        Backend error: {error}
      </div>
    ) : null;
  }
  return (
    <div className="no-print p-4 rounded-2xl bg-[#1A1408] border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-[#E8D9B0] leading-relaxed">
          <strong className="text-amber-300">Backend offline — showing demo data.</strong>{' '}
          Could not reach <code className="text-[#F5D76E]">{API_BASE}</code>. Start it with{' '}
          <code className="text-[#F5D76E]">backend\run.bat</code>; nothing on these pages is your real browser data until then.
        </div>
      </div>
      <button
        type="button"
        disabled={retrying}
        onClick={async () => { setRetrying(true); await loadSites(); setRetrying(false); }}
        className="btn-secondary px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 flex-shrink-0"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
        Retry
      </button>
    </div>
  );
};
