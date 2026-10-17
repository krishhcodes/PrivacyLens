import React, { useState } from 'react';
import {
  Search,
  Filter,
  AlertTriangle,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import type { SiteDetail, PermissionType } from '../../types';
import { updateSitePermission } from '../../services/scannerService';
import { ConfirmModal } from '../common/ConfirmModal';
import { useSites } from '../../services/siteStore';
import { SafetyBadge } from '../common/SafetyBadge';

interface SiteLedgerTableProps {
  sites: SiteDetail[];
  onSelectSite?: (site: SiteDetail) => void;
  onRefresh?: () => void;
}

export const SiteLedgerTable: React.FC<SiteLedgerTableProps> = ({
  sites,
  onSelectSite,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBand, setSelectedBand] = useState<string>('all');
  const [selectedSafety, setSelectedSafety] = useState<string>('all');

  // Quick block modal state
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { mode } = useSites();
  const [targetBlock, setTargetBlock] = useState<{
    site: SiteDetail;
    permission: PermissionType;
  } | null>(null);

  // Purposes present in the loaded data (backend: calculator, video_meeting, maps, weather, general).
  const categories = ['all', ...Array.from(new Set(sites.map(s => s.purpose_profile))).sort()];
  const bands = ['all', 'high', 'elevated', 'moderate', 'low'];

  const filteredSites = sites.filter(site => {
    const matchesSearch =
      site.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.purpose_profile.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || site.purpose_profile.toLowerCase() === selectedCategory;
    const matchesBand = selectedBand === 'all' || site.band === selectedBand;
    const matchesSafety = selectedSafety === 'all' || (site.safety?.status ?? 'not_checked') === selectedSafety;

    return matchesSearch && matchesCategory && matchesBand && matchesSafety;
  });

  const getPermStatusBadge = (site: SiteDetail, perm: PermissionType) => {
    const obs = site.observations.find(o => o.permission === perm);
    if (!obs) {
      return (
        <span className="text-[10px] text-zinc-600 font-mono" title="Not observed">
          &mdash;
        </span>
      );
    }

    const isMismatched = (site.assessment?.mismatches || []).some(m => m.permission === perm);

    let color = 'bg-zinc-800 text-zinc-400 border-zinc-700';
    if (obs.browser_setting === 'allow') {
      color = isMismatched
        ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-[0_0_8px_rgba(255,93,108,0.3)]'
        : 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    } else if (obs.browser_setting === 'block') {
      color = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }

    return (
      <button
        onClick={e => {
          e.stopPropagation();
          if (obs.browser_setting !== 'block') {
            setTargetBlock({ site, permission: perm });
            setBlockModalOpen(true);
          }
        }}
        className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-transform hover:scale-105 flex items-center gap-1 ${color}`}
        title={`${perm}: setting=${obs.browser_setting}, page=${obs.page_state}. Click to block.`}
      >
        <span>{obs.browser_setting.slice(0, 3).toUpperCase()}</span>
        {isMismatched && obs.browser_setting !== 'block' && (
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        )}
      </button>
    );
  };

  const handleConfirmBlock = async () => {
    if (!targetBlock) return;
    try {
      await updateSitePermission(targetBlock.site.origin, targetBlock.permission, 'block');
      if (onRefresh) onRefresh();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBlockModalOpen(false);
      setTargetBlock(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0F1017] p-3.5 rounded-2xl border border-[#D4AF37]/20">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#A89874] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search site, address or purpose..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#161722] border border-white/10 rounded-xl text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#D4AF37] font-mono"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-[#161722] px-2.5 py-1 rounded-xl border border-white/10 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#D4AF37]" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs text-[#E8E8EE] outline-none font-mono capitalize"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-[#12131A]">
                  {cat === 'all' ? 'All Purposes' : cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Band Filter */}
          <div className="flex items-center gap-1.5 bg-[#161722] px-2.5 py-1 rounded-xl border border-white/10 text-xs">
            <span className="text-[10px] text-[#A89874] font-mono">BAND:</span>
            <select
              value={selectedBand}
              onChange={e => setSelectedBand(e.target.value)}
              className="bg-transparent text-xs text-[#E8E8EE] outline-none font-mono uppercase"
            >
              {bands.map(b => (
                <option key={b} value={b} className="bg-[#12131A]">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Google Safe Browsing Filter */}
          <div className="flex items-center gap-1.5 bg-[#161722] px-2.5 py-1 rounded-xl border border-white/10 text-xs">
            <span className="text-[10px] text-[#A89874] font-mono">SAFETY:</span>
            <select
              value={selectedSafety}
              onChange={e => setSelectedSafety(e.target.value)}
              className="bg-transparent text-xs text-[#E8E8EE] outline-none font-mono uppercase"
            >
              {[['all', 'all'], ['unsafe', 'unsafe'], ['safe', 'safe'], ['not_checked', 'not checked'], ['not_applicable', 'local'], ['error', 'check failed']].map(([v, l]) => (
                <option key={v} value={v} className="bg-[#12131A]">
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between gap-3">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-[#F5D76E] font-mono hover:underline">Dismiss</button>
        </div>
      )}

      {/* Empty state */}
      {sites.length === 0 && mode !== 'loading' && (
        <div className="p-6 rounded-2xl bg-[#0F1017] border border-[#D4AF37]/20 text-xs text-[#A89874] text-center">
          No audited sites yet. Open a site and use the ConsentScope extension, or run <code className="text-[#F5D76E]">python scanner\scan.py</code>.
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-[#0B0C11] rounded-2xl border border-[#D4AF37]/20 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#111219] border-b border-[#D4AF37]/20 text-[11px] font-mono text-[#A89874] uppercase tracking-wider">
                <th className="py-3 px-4">Origin / Site</th>
                <th className="py-3 px-3">Purpose Profile</th>
                <th className="py-3 px-3 text-center">Location</th>
                <th className="py-3 px-3 text-center">Cam</th>
                <th className="py-3 px-3 text-center">Mic</th>
                <th className="py-3 px-3 text-center">Notif</th>
                <th className="py-3 px-3">Mismatches & Policy</th>
                <th className="py-3 px-4 text-right">Risk Score</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredSites.map(site => {
                const mismatches = site.assessment?.mismatches || [];
                const isAnchorTarget = site.origin.includes('localhost:5500');

                return (
                  <tr
                    key={site.origin}
                    onClick={() => onSelectSite && onSelectSite(site)}
                    className={`hover:bg-[#151622]/80 transition-colors cursor-pointer group ${
                      isAnchorTarget ? 'bg-[#181308]/40' : ''
                    }`}
                  >
                    {/* Site Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-base group-hover:border-[#D4AF37]/50 transition-colors">
                          {site.icon || '🌐'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white tracking-tight group-hover:text-[#F5D76E] transition-colors">
                              {site.display_name}
                            </span>
                            {isAnchorTarget && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#D4AF37]/20 text-[#F5D76E] border border-[#D4AF37]/40 font-bold">
                                ANCHOR
                              </span>
                            )}
                            <SafetyBadge safety={site.safety} />
                          </div>
                          <span className="text-[10px] text-[#71717A] font-mono truncate max-w-[190px]">
                            {site.origin}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Purpose Profile */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-[#E8E8EE] capitalize">
                          {site.purpose_profile.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-[#786333] font-mono">
                          conf: {typeof site.purpose_confidence === 'number' ? `${(site.purpose_confidence * 100).toFixed(0)}%` : site.purpose_confidence}
                        </span>
                      </div>
                    </td>

                    {/* Permission Status matrix cells */}
                    <td className="py-3.5 px-3 text-center">{getPermStatusBadge(site, 'location')}</td>
                    <td className="py-3.5 px-3 text-center">{getPermStatusBadge(site, 'camera')}</td>
                    <td className="py-3.5 px-3 text-center">{getPermStatusBadge(site, 'microphone')}</td>
                    <td className="py-3.5 px-3 text-center">{getPermStatusBadge(site, 'notifications')}</td>

                    {/* Mismatch badge / Policy summary */}
                    <td className="py-3.5 px-3">
                      {mismatches.length > 0 ? (
                        <div className="flex items-center gap-1.5 text-red-400">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="font-mono text-[11px] font-semibold">
                            {mismatches[0].rule_id} ({mismatches.length})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="font-mono text-[11px]">Consistent</span>
                        </div>
                      )}
                    </td>

                    {/* Risk Score */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex flex-col items-end">
                          <span
                            className={`font-mono text-sm font-bold ${
                              site.band === 'high'
                                ? 'text-red-400'
                                : site.band === 'elevated'
                                ? 'text-orange-400'
                                : site.band === 'moderate'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {site.score ?? '—'}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider font-mono text-[#786333]">
                            {site.band}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Detail Action Arrow */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (onSelectSite) onSelectSite(site);
                        }}
                        className="p-1.5 rounded-lg text-[#888890] hover:text-[#D4AF37] hover:bg-[#1A1812] transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Quick-Block from Ledger */}
      {targetBlock && (
        <ConfirmModal
          isOpen={blockModalOpen}
          title={`Enforce Block for ${targetBlock.permission.toUpperCase()}?`}
          message={`The ConsentScope extension will set ${targetBlock.permission} to 'block' for "${targetBlock.site.display_name}" in your browser, and the site's score is recalculated.`}
          confirmText="Enforce Block"
          cancelText="Cancel"
          severity="danger"
          onConfirm={handleConfirmBlock}
          onCancel={() => {
            setBlockModalOpen(false);
            setTargetBlock(null);
          }}
        />
      )}
    </div>
  );
};
