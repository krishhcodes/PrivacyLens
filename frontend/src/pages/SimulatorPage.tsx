import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Sliders,
  RotateCcw,
  CheckCircle2,
  TrendingDown,
  Lock
} from 'lucide-react';
import { runSimulation, type SimulationOverride, type SimulationResult } from '../services/simulatorService';
import { updateSitePermission } from '../services/scannerService';
import { useSites } from '../services/siteStore';
import { ScoreGauge } from '../components/common/ScoreGauge';
import { FutureScopeBanner } from '../components/common/FutureScopeBanner';
import type { PermissionType, BrowserSetting } from '../types';

// Only scored permissions change the outcome; scanner-only extras are left out of the matrix.
const SCORED = new Set<string>(['location', 'camera', 'microphone', 'notifications']);

export const SimulatorPage: React.FC = () => {
  const { sites } = useSites();
  const [overrides, setOverrides] = useState<SimulationOverride[]>([]);
  // Recomputed whenever the loaded sites or the overrides change.
  const simResult: SimulationResult | null = useMemo(() => runSimulation(overrides, sites), [sites, overrides]);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const handleToggleOverride = (origin: string, perm: PermissionType, targetSetting: BrowserSetting) => {
    setAppliedSuccess(false);
    const existingIndex = overrides.findIndex(
      o => o.origin.toLowerCase() === origin.toLowerCase() && o.permission === perm
    );

    let updated = [...overrides];
    if (existingIndex !== -1) {
      if (updated[existingIndex].simulatedSetting === targetSetting) {
        // Toggle off override
        updated.splice(existingIndex, 1);
      } else {
        updated[existingIndex].simulatedSetting = targetSetting;
      }
    } else {
      updated.push({
        origin,
        permission: perm,
        simulatedSetting: targetSetting
      });
    }

    setOverrides(updated);
  };

  const isOverridden = (origin: string, perm: PermissionType, setting: BrowserSetting) => {
    return overrides.some(
      o => o.origin.toLowerCase() === origin.toLowerCase() && o.permission === perm && o.simulatedSetting === setting
    );
  };

  const handleResetAll = () => {
    setOverrides([]);
    setAppliedSuccess(false);
    setApplyError(null);
  };

  const handleApplyPermanently = async () => {
    if (overrides.length === 0) return;

    setApplyError(null);
    for (const ov of overrides) {
      try {
        await updateSitePermission(ov.origin, ov.permission, ov.simulatedSetting);
      } catch (e) {
        setApplyError((e as Error).message);
        return;
      }
    }

    setOverrides([]);
    setAppliedSuccess(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#D4AF37', '#F5D76E', '#40D9A2', '#FFFFFF']
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <FutureScopeBanner
        what="Baselines are your real scores, but the projected change uses simplified preview rules and is often 0 for sites classified as general."
        needs="a backend simulation endpoint (or the backend's scoring rules in the website) so projections match real scores."
      />
      {/* Header */}
      <div className="bg-[#0A0B10] p-6 rounded-3xl border border-[#D4AF37]/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#D4AF37]" />
            <h1 className="text-xl font-bold font-['Cinzel',serif] text-white">
              What-If Risk Modeling Sandbox
            </h1>
          </div>
          <p className="text-xs text-[#8E8F99] max-w-xl">
            Preview how blocking permissions would change your scores before changing them in the browser. Projections are estimates; real scores come from the backend after the change.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetAll}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E8F99] hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Overrides</span>
          </button>
        </div>
      </div>

      {/* Side-by-side Score Delta Display */}
      {simResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0B0C12] p-6 rounded-3xl border border-[#D4AF37]/30 shadow-2xl items-center">
          {/* Baseline */}
          <div className="flex flex-col items-center p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2">
            <span className="text-[10px] uppercase font-mono text-[#786333]">Current Posture</span>
            <ScoreGauge
              score={simResult.baselineAggregateScore}
              band={simResult.baselineBand}
              size={140}
              label="Baseline Risk"
            />
          </div>

          {/* Delta Center Card */}
          <div className="flex flex-col items-center justify-center space-y-3 text-center">
            <span className="text-xs font-mono uppercase text-[#A89874] tracking-wider font-semibold">
              Projected Mitigation Delta
            </span>
            <div
              className={`text-3xl font-black font-mono px-5 py-2 rounded-2xl border flex items-center gap-2 shadow-xl ${
                simResult.scoreDelta < 0
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_25px_rgba(64,217,162,0.2)]'
                  : 'bg-white/5 text-[#E8E8EE] border-white/10'
              }`}
            >
              <TrendingDown className="w-6 h-6" />
              <span>{simResult.scoreDelta} pts</span>
            </div>
            <p className="text-xs text-[#8E8F99] max-w-[220px]">
              {simResult.mitigatedFindingsCount} risk findings mitigated by the simulated blocks.
            </p>
            {applyError && (
              <p className="text-xs text-amber-200 bg-amber-950/30 border border-amber-500/40 rounded-xl px-3 py-2 max-w-[260px]">{applyError}</p>
            )}

            <button
              onClick={handleApplyPermanently}
              disabled={overrides.length === 0}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg ${
                appliedSuccess
                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/50'
                  : 'gold-gradient-bg text-black hover:brightness-110'
              }`}
            >
              {appliedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Enforced Successfully!</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-black" />
                  <span>Enforce {overrides.length} Overrides Live</span>
                </>
              )}
            </button>
          </div>

          {/* Simulated Result */}
          <div className="flex flex-col items-center p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2">
            <span className="text-[10px] uppercase font-mono text-[#D4AF37]">Simulated Posture</span>
            <ScoreGauge
              score={simResult.simulatedAggregateScore}
              band={simResult.simulatedBand}
              size={140}
              label="Hardened Risk"
            />
          </div>
        </div>
      )}

      {/* Interactive Overrides Grid */}
      <div className="bg-[#0B0C12] rounded-3xl border border-[#D4AF37]/25 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white font-['Cinzel',serif]">
              Hypothetical Permission Policy Matrix
            </h3>
            <p className="text-xs text-[#8E8F99]">
              Toggle 'Block' on any observed permission to preview the score impact.
            </p>
          </div>
          <span className="text-xs font-mono text-[#D4AF37]">
            {overrides.length} Active Overrides
          </span>
        </div>

        <div className="space-y-3">
          {sites.map(site => {
            const isAnchor = site.origin.includes('localhost:5500');

            return (
              <div
                key={site.origin}
                className={`p-4 rounded-2xl border transition-all ${
                  isAnchor
                    ? 'bg-[#15120A] border-[#D4AF37]/40 shadow-sm'
                    : 'bg-[#11121A] border-white/5'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{site.icon || '🌐'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">
                          {site.display_name}
                        </span>
                        {isAnchor && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#F5D76E] border border-[#D4AF37]/30">
                            ANCHOR
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#71717A] font-mono">{site.origin}</span>
                    </div>
                  </div>

                  {/* Permission Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {site.observations.filter(obs => SCORED.has(obs.permission)).map(obs => {
                      const isSimBlocked = isOverridden(site.origin, obs.permission, 'block');
                      const isLiveBlocked = obs.browser_setting === 'block';

                      return (
                        <button
                          key={obs.permission}
                          onClick={() => handleToggleOverride(site.origin, obs.permission, 'block')}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-mono border transition-all flex items-center gap-1.5 ${
                            isSimBlocked
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(64,217,162,0.3)] font-bold'
                              : isLiveBlocked
                              ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                              : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                          }`}
                        >
                          <span className="capitalize">{obs.permission}</span>
                          <span className="text-[9px] opacity-75">
                            {isSimBlocked ? '(SIM BLOCKED)' : obs.browser_setting.toUpperCase()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
