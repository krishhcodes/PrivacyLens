import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  MapPin,
  Camera,
  Mic,
  Bell,
  Database,
  Cookie,
  Ban,
  ExternalLink
} from 'lucide-react';
import type {
  PermissionType,
  BrowserSetting
} from '../../types';
import { updateSitePermission } from '../../services/scannerService';
import { useSites } from '../../services/siteStore';

// Only these are scored and can be changed; scanner-only extras are shown read-only.
const ACTIONABLE = new Set<string>(['location', 'camera', 'microphone', 'notifications']);
import { ConfirmModal } from '../common/ConfirmModal';
import { GoldToast } from '../common/GoldToast';

interface ExtensionPopupSimProps {
  initialOrigin?: string;
  onNavigateDetail?: (origin: string) => void;
  onPermissionChanged?: () => void;
}

export const ExtensionPopupSim: React.FC<ExtensionPopupSimProps> = ({
  initialOrigin = 'http://localhost:5500',
  onNavigateDetail,
  onPermissionChanged
}) => {
  const { sites, mode } = useSites();
  const [activeOrigin, setActiveOrigin] = useState<string>(initialOrigin);
  // Follow the site picked in the ledger.
  useEffect(() => setActiveOrigin(initialOrigin), [initialOrigin]);
  const activeSite =
    sites.find(s => s.origin.toLowerCase() === activeOrigin.toLowerCase()) ||
    sites.find(s => s.origin.toLowerCase() === initialOrigin.toLowerCase()) ||
    sites[0] ||
    null;

  // Modal & Toast state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    permission: PermissionType;
    newSetting: BrowserSetting;
    permLabel: string;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastUndoAction, setLastUndoAction] = useState<{
    origin: string;
    permission: PermissionType;
    revertSetting: BrowserSetting;
  } | null>(null);

  const getPermissionIcon = (perm: PermissionType) => {
    switch (perm) {
      case 'location':
      case 'geolocation':
        return <MapPin className="w-4 h-4 text-red-400" />;
      case 'camera':
        return <Camera className="w-4 h-4 text-amber-400" />;
      case 'microphone':
        return <Mic className="w-4 h-4 text-amber-400" />;
      case 'notifications':
        return <Bell className="w-4 h-4 text-blue-400" />;
      case 'storage':
        return <Database className="w-4 h-4 text-emerald-400" />;
      case 'cookies':
        return <Cookie className="w-4 h-4 text-purple-400" />;
      default:
        return <Shield className="w-4 h-4 text-[#D4AF37]" />;
    }
  };

  const handlePromptChange = (perm: PermissionType, newSetting: BrowserSetting) => {
    const permLabel = perm.toUpperCase();
    if (newSetting === 'block') {
      setPendingAction({ permission: perm, newSetting, permLabel });
      setConfirmModalOpen(true);
    } else {
      executePermissionChange(perm, newSetting);
    }
  };

  const executePermissionChange = async (perm: PermissionType, newSetting: BrowserSetting) => {
    if (!activeSite) return;

    // Save previous setting for undo
    const currentObs = activeSite.observations.find(o => o.permission === perm);
    const prevSetting = currentObs ? currentObs.browser_setting : 'ask';

    try {
      await updateSitePermission(activeSite.origin, perm, newSetting);

      // Show toast with undo
      setLastUndoAction({
        origin: activeSite.origin,
        permission: perm,
        revertSetting: prevSetting
      });
      setToastMessage(`Set ${perm} to ${newSetting.toUpperCase()} on ${activeSite.display_name}`);

      if (onPermissionChanged) {
        onPermissionChanged();
      }
    } catch (e) {
      setLastUndoAction(null);
      setToastMessage((e as Error).message);
    }
  };

  const handleUndo = async () => {
    if (!lastUndoAction) return;
    try {
      await updateSitePermission(
        lastUndoAction.origin,
        lastUndoAction.permission,
        lastUndoAction.revertSetting,
        'undo'
      );
      setToastMessage(null);
      setLastUndoAction(null);
      if (onPermissionChanged) {
        onPermissionChanged();
      }
    } catch (e) {
      setLastUndoAction(null);
      setToastMessage((e as Error).message);
    }
  };

  if (!activeSite) {
    return (
      <div className="p-4 text-center text-[#999]">
        {mode === 'loading' ? 'Loading audited sites...' : 'No audited sites yet. Audit a site with the extension or run scanner/scan.py.'}
      </div>
    );
  }

  // Check if active site has any mismatches
  const mismatches = activeSite.assessment?.mismatches || [];

  return (
    <div className="relative flex flex-col items-center">
      {/* Chrome Browser Extension Container (Fixed 360px x 580px viewport mockup) */}
      <div className="w-[360px] h-[580px] bg-[#0C0D12] rounded-2xl border-2 border-[#D4AF37]/50 shadow-[0_0_40px_rgba(212,175,55,0.15)] flex flex-col overflow-hidden relative font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Extension Chrome Header */}
        <div className="bg-gradient-to-r from-[#17140B] via-[#0E0F14] to-[#17140B] border-b border-[#D4AF37]/25 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="flex flex-col">
              <span className="font-['Cinzel',serif] text-xs font-bold text-white tracking-wider">
                CONSENTSCOPE <span className="text-[9px] font-mono text-[#D4AF37]">VIEW</span>
              </span>
              <span className="text-[9px] text-[#8E8F99] font-mono">Site permission audit</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full animate-pulse ${mode === 'offline' ? 'bg-amber-400' : 'bg-[#40D9A2]'}`} />
            <span className={`text-[10px] font-mono font-medium ${mode === 'offline' ? 'text-amber-400' : 'text-[#40D9A2]'}`}>{mode === 'offline' ? 'DEMO' : 'LIVE'}</span>
          </div>
        </div>

        {/* Tab/Origin Selector Switcher */}
        <div className="bg-[#12131C] px-3 py-2 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
            <span className="text-[10px] uppercase font-mono text-[#786333]">SITE:</span>
            <select
              value={activeSite.origin}
              onChange={e => setActiveOrigin(e.target.value)}
              className="bg-[#181924] border border-[#D4AF37]/30 text-white text-xs rounded-lg px-2 py-1 flex-1 font-mono outline-none focus:border-[#D4AF37] truncate"
            >
              {sites.map(s => (
                <option key={s.origin} value={s.origin}>
                  {s.display_name} ({s.origin.replace(/^https?:\/\//, '')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Origin Hero Card */}
        <div className="p-3.5 bg-gradient-to-b from-[#13141F] to-[#0D0E15] border-b border-white/5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-[#D4AF37]/30 flex items-center justify-center text-lg">
                {activeSite.icon || '🌐'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  {activeSite.display_name}
                  {activeSite.origin.includes('localhost:5500') && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#F5D76E] border border-[#D4AF37]/40 font-mono">
                      DEMO TARGET
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-[#8E8F99] font-mono truncate max-w-[170px]">
                  {activeSite.origin}
                </span>
              </div>
            </div>

            {/* Micro Risk Gauge */}
            <div className="flex flex-col items-center">
              <div
                className={`text-sm font-mono font-black px-2 py-0.5 rounded-lg border ${
                  activeSite.band === 'high'
                    ? 'bg-red-950/40 text-red-400 border-red-500/40'
                    : activeSite.band === 'elevated'
                    ? 'bg-orange-950/40 text-orange-400 border-orange-500/40'
                    : activeSite.band === 'moderate'
                    ? 'bg-amber-950/40 text-amber-400 border-amber-500/40'
                    : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                }`}
              >
                {activeSite.score ?? '—'}/100
              </div>
              <span className="text-[8px] uppercase tracking-wider text-[#786333] font-semibold mt-0.5">
                {activeSite.band ?? 'n/a'} RISK
              </span>
            </div>
          </div>

          {/* Mismatch Alert Box if present */}
          {mismatches.length > 0 && (
            <div className="mt-2.5 p-2 rounded-lg bg-red-950/25 border border-red-500/35 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-[10px] text-red-300 leading-tight">
                <span className="font-semibold text-red-400 font-mono">
                  {mismatches[0].rule_id}: {mismatches[0].permission.toUpperCase()}
                </span>{' '}
                not obviously needed by a{' '}
                <span className="underline">{activeSite.purpose_profile.replace(/_/g, ' ')}</span> site.
              </div>
            </div>
          )}
        </div>

        {/* Permission List (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          <div className="flex items-center justify-between text-[10px] text-[#71717A] uppercase font-mono px-1">
            <span>Permissions</span>
            <span>Browser Setting</span>
          </div>

          {activeSite.observations.map(obs => {
            const isMismatched = mismatches.some(m => m.permission === obs.permission);
            const isBlocked = obs.browser_setting === 'block';

            return (
              <div
                key={obs.permission}
                className={`p-2.5 rounded-xl border transition-all ${
                  isBlocked
                    ? 'bg-[#0E0F14]/60 border-white/5 opacity-75'
                    : isMismatched
                    ? 'bg-red-950/15 border-red-500/30 shadow-[0_0_10px_rgba(255,93,108,0.05)]'
                    : 'bg-[#12131B] border-[#D4AF37]/15'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-black/40 border border-white/5">
                      {getPermissionIcon(obs.permission)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white capitalize flex items-center gap-1.5">
                        {obs.permission}
                        {isMismatched && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                        )}
                      </span>
                      <span className="text-[9px] text-[#786333] font-mono">
                        Page: <span className="text-white">{obs.page_state}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Setting badge */}
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${
                        obs.browser_setting === 'allow'
                          ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                          : obs.browser_setting === 'block'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {obs.browser_setting}
                    </span>

                    {/* Quick Action Toggle Button (scored permissions only) */}
                    {!ACTIONABLE.has(obs.permission) ? null : obs.browser_setting === 'block' ? (
                      <button
                        onClick={() => handlePromptChange(obs.permission, 'ask')}
                        className="px-2 py-1 rounded-md text-[9px] bg-white/5 hover:bg-white/10 text-[#C5A059] border border-white/10 transition-colors"
                        title="Reset to Ask"
                      >
                        Ask
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePromptChange(obs.permission, 'block')}
                        className="px-2 py-1 rounded-md text-[9px] bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/40 transition-colors font-semibold flex items-center gap-1"
                        title="Block this permission"
                      >
                        <Ban className="w-2.5 h-2.5" />
                        Block
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtext warning if mismatched */}
                {isMismatched && !isBlocked && (
                  <div className="mt-1.5 pt-1.5 border-t border-red-500/15 flex items-center justify-between text-[9px] text-red-300">
                    <span className="capitalize">{mismatches.find(m => m.permission === obs.permission)?.severity} · purpose mismatch</span>
                    <button
                      onClick={() => handlePromptChange(obs.permission, 'block')}
                      className="text-[#F5D76E] hover:underline font-mono font-medium"
                    >
                      Remediate now &rarr;
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Extension Footer Action */}
        <div className="p-3 bg-[#0A0B0E] border-t border-[#D4AF37]/20 flex items-center justify-between">
          <button
            onClick={() => onNavigateDetail && onNavigateDetail(activeSite.origin)}
            className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#201A0C] to-[#12131A] hover:border-[#D4AF37] border border-[#D4AF37]/40 text-xs font-semibold text-[#F5D76E] flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <span>Open site details</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Block Action */}
      <ConfirmModal
        isOpen={confirmModalOpen}
        title={`Revoke ${pendingAction?.permLabel} Access?`}
        message={`Are you sure you want to block ${pendingAction?.permLabel} permission for "${activeSite.display_name}" (${activeSite.origin})? This sets the site's browser setting to 'block' and the risk score is recalculated.`}
        confirmText="Revoke & Block"
        cancelText="Keep Permission"
        severity="danger"
        onConfirm={() => {
          if (pendingAction) {
            executePermissionChange(pendingAction.permission, pendingAction.newSetting);
          }
          setConfirmModalOpen(false);
          setPendingAction(null);
        }}
        onCancel={() => {
          setConfirmModalOpen(false);
          setPendingAction(null);
        }}
      />

      {/* 10-Second Undo Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50">
          <GoldToast
            message={toastMessage}
            onUndo={lastUndoAction ? handleUndo : undefined}
            onClose={() => setToastMessage(null)}
            duration={10}
          />
        </div>
      )}
    </div>
  );
};
