import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ScanEye, 
  RefreshCw, 
  X, 
  AlertTriangle
} from 'lucide-react';
import { runFullAuditScan } from '../services/scannerService';
import { useSites } from '../services/siteStore';
import { reportUrl } from '../api/client';
import { ExtensionPopupSim } from '../components/scanner/ExtensionPopupSim';
import { SiteLedgerTable } from '../components/scanner/SiteLedgerTable';
import { ScoreBreakdown } from '../components/common/ScoreBreakdown';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { SafetyBadge } from '../components/common/SafetyBadge';

export const ScannerPage: React.FC = () => {
  const { sites, mode } = useSites();
  // ?origin=… (from the extension's "Open full audit") opens that site's inspector and popup view.
  const [searchParams] = useSearchParams();
  const linkedOrigin = searchParams.get('origin');
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(linkedOrigin);
  const selectedSite = sites.find(s => s.origin === selectedOrigin) ?? null;
  const setSelectedSite = (site: { origin: string } | null) => setSelectedOrigin(site ? site.origin : null);
  const [viewMode, setViewMode] = useState<'split' | 'table' | 'extension'>('split');
  const [isAuditing, setIsAuditing] = useState(false);
  const [activeOrigin, setActiveOrigin] = useState<string>(linkedOrigin || 'http://localhost:5500');

  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      await runFullAuditScan();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#0A0B10] p-6 rounded-3xl border border-[#D4AF37]/25">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ScanEye className="w-5 h-5 text-[#D4AF37]" />
            <h1 className="text-xl font-bold font-['Cinzel',serif] text-white">
              Privacy Scanner &amp; Extension Runtime
            </h1>
          </div>
          <p className="text-xs text-[#8E8F99] max-w-xl">
            Every site the ConsentScope extension or local scanner has audited, with its permission settings, inferred purpose, mismatches and score. The popup view mirrors the extension.
          </p>
        </div>

        {/* View Mode Switcher and Audit Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#13141F] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'split'
                  ? 'bg-[#D4AF37]/20 text-[#F5D76E] border border-[#D4AF37]/40 shadow-sm'
                  : 'text-[#8E8F99] hover:text-white'
              }`}
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-[#D4AF37]/20 text-[#F5D76E] border border-[#D4AF37]/40 shadow-sm'
                  : 'text-[#8E8F99] hover:text-white'
              }`}
            >
              Ledger Table
            </button>
            <button
              onClick={() => setViewMode('extension')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'extension'
                  ? 'bg-[#D4AF37]/20 text-[#F5D76E] border border-[#D4AF37]/40 shadow-sm'
                  : 'text-[#8E8F99] hover:text-white'
              }`}
            >
              Extension Popup
            </button>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="gold-gradient-bg text-black font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 hover:brightness-110 transition-all shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Refreshing...' : 'Refresh Ledger'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area depending on viewMode */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Extension Simulator column */}
        {(viewMode === 'split' || viewMode === 'extension') && (
          <div className={`${viewMode === 'split' ? 'lg:col-span-4' : 'lg:col-span-12 flex justify-center'}`}>
            <div className="sticky top-28 space-y-3">
              <div className="flex items-center justify-between text-xs text-[#A89874] font-mono px-2">
                <span>ConsentScope extension view</span>
                <span className="text-[#40D9A2]">360 &times; 580 px</span>
              </div>
              <ExtensionPopupSim
                initialOrigin={activeOrigin}
                onNavigateDetail={origin => {
                  const match = sites.find(s => s.origin === origin);
                  if (match) setSelectedSite(match);
                }}
              />
            </div>
          </div>
        )}

        {/* Ledger Table column */}
        {(viewMode === 'split' || viewMode === 'table') && (
          <div className={`${viewMode === 'split' ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6`}>
            <SiteLedgerTable
              sites={sites}
              onSelectSite={site => {
                setSelectedSite(site);
                setActiveOrigin(site.origin);
              }}
            />
          </div>
        )}
      </div>

      {/* Detailed Site Inspection Modal / Drawer */}
      {selectedSite && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B0C12] border-2 border-[#D4AF37]/40 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 custom-scrollbar">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedSite.icon || '🌐'}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white font-['Cinzel',serif]">
                      {selectedSite.display_name}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded font-mono bg-white/5 text-[#E8E8EE] border border-white/10 capitalize">
                      {selectedSite.purpose_profile}
                    </span>
                  </div>
                  <span className="text-xs text-[#A89874] font-mono">{selectedSite.origin}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedSite(null)}
                className="text-[#71717A] hover:text-white p-2 rounded-xl hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Google Safe Browsing status */}
            {selectedSite.safety && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                selectedSite.safety.status === 'unsafe' ? 'bg-red-950/40 border-red-500/60' : 'bg-[#12131C] border-white/10'
              }`}>
                <div className="text-xs">
                  <span className="font-mono font-bold text-[#A89874] uppercase mr-2">Google Safe Browsing</span>
                  <span className={selectedSite.safety.status === 'unsafe' ? 'text-red-200' : 'text-[#C8C8D4]'}>
                    {selectedSite.safety.status === 'unsafe'
                      ? `Listed for ${selectedSite.safety.threats.join(', ')}. Avoid granting this site any permission.`
                      : selectedSite.safety.status === 'safe'
                      ? 'Not listed as malware, phishing or unwanted software.'
                      : selectedSite.safety.status === 'not_applicable'
                      ? 'Local address: not checked.'
                      : selectedSite.safety.status === 'error'
                      ? 'Lookup failed; it is retried automatically.'
                      : 'Not checked (no Safe Browsing API key on the backend).'}
                  </span>
                </div>
                <SafetyBadge safety={selectedSite.safety} />
              </div>
            )}

            {/* Mismatch Alerts if any */}
            {(selectedSite.assessment?.mismatches || []).length > 0 && (
              <div className="p-4 rounded-2xl bg-red-950/25 border border-red-500/40 space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-mono font-bold text-xs uppercase">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Purpose Mismatch Detected: Rule {selectedSite.assessment?.mismatches[0].rule_id}</span>
                </div>
                <p className="text-xs text-red-200">
                  {selectedSite.assessment?.mismatches[0].explanation || selectedSite.assessment?.mismatches[0].reason}
                </p>
              </div>
            )}

            {/* Two-Column Details: Technical Observations + Score Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Observations */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#A89874]">
                  Browser Settings (latest)
                </h3>
                <div className="space-y-2">
                  {selectedSite.observations.map(obs => (
                    <div
                      key={obs.permission}
                      className="p-3 rounded-xl bg-[#12131C] border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-white capitalize">{obs.permission}</span>
                        <span className="text-[10px] text-[#786333] font-mono">
                          Page State: <span className="text-white">{obs.page_state}</span>
                          {obs.source && <> &middot; {obs.source.replace(/_/g, ' ')}</>}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ProvenanceBadge provenance={obs.provenance} />
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            obs.browser_setting === 'block'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : obs.browser_setting === 'allow'
                              ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {obs.browser_setting}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Score Breakdown */}
              <div>
                {selectedSite.assessment?.risk && (
                  <ScoreBreakdown
                    assessment={selectedSite.assessment.risk}
                    siteName={selectedSite.display_name}
                  />
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-white/10 pt-4 flex items-center justify-between">
              <span className="text-xs text-[#71717A] font-mono">
                Last Audited: {selectedSite.last_audited_at ? new Date(selectedSite.last_audited_at).toLocaleString() : '—'}
              </span>
              <div className="flex items-center gap-2">
              {mode === 'live' && (
                <a
                  href={reportUrl(selectedSite.origin)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#F5D76E] border border-[#D4AF37]/40 text-xs font-medium"
                >
                  Printable report ↗
                </a>
              )}
              <button
                onClick={() => setSelectedSite(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium"
              >
                Close Inspector
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
