import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Layers,
  Eye,
  Sliders,
  CheckCircle2,
  Ban
} from 'lucide-react';
import { updateSitePermission } from '../services/scannerService';
import { useSites } from '../services/siteStore';
import { averageScore, bandFor } from '../lib/band';
import { pickSpotlight } from '../lib/spotlight';
import { ScoreGauge } from '../components/common/ScoreGauge';
import { ScoreBreakdown } from '../components/common/ScoreBreakdown';
import { GlassCard } from '../experience/GlassCard';
import { InsightsRail } from '../experience/InsightsRail';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { sites, mode } = useSites();
  const aggregateScore = averageScore(sites);
  const [showScoreDetail, setShowScoreDetail] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isDemo = mode === 'offline';

  const allMismatches = sites.flatMap(s => s.assessment?.mismatches || []);
  const pocketCalcSite = pickSpotlight(sites);
  const spotlightMismatch = pocketCalcSite?.assessment?.mismatches[0];
  const pocketCalcLocationObs = pocketCalcSite?.observations.find(
    o => o.permission === (spotlightMismatch?.permission ?? 'location')
  );
  const isLocationBlocked = pocketCalcLocationObs?.browser_setting === 'block';
  const allowedCount = sites.reduce(
    (n, s) => n + s.observations.filter(o => o.browser_setting === 'allow').length, 0
  );
  const analyzedCount = sites.filter(s => s.completeness === 'full').length;

  const handleQuickBlockPocketCalc = async () => {
    if (!pocketCalcSite || !pocketCalcLocationObs) return;
    setActionError(null);
    try {
      await updateSitePermission(pocketCalcSite.origin, pocketCalcLocationObs.permission, 'block');
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  return (
    <div className="space-y-8 animate-reveal-child">
      <GlassCard className="relative overflow-hidden p-6 md:p-8">
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex-1 space-y-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/12 border border-[#D4AF37]/30 text-[#F5D76E] text-[10px] font-mono font-semibold tracking-[0.18em]">
              {isDemo ? 'Demo command centre' : 'Command centre'}
            </div>
            <h1 className="text-3xl md:text-5xl font-display tracking-tight text-white leading-[0.95]">
              Your privacy. Your terms.
            </h1>
            <p className="text-sm md:text-base text-[#B3B0A7] max-w-2xl leading-relaxed">
              {isDemo
                ? 'The backend is offline, so these scores come from seeded demo data. Start the backend to see your own browser permissions.'
                : `Scores for ${sites.length} sites recorded by the ConsentScope extension and local scanner. Every point traces to a permission you allowed or a policy sentence.`}
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button onClick={() => navigate('/scanner')} className="btn-primary text-xs px-5 py-2.5 rounded-xl flex items-center gap-2">
                Open privacy scanner
                <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate('/exposure')} className="btn-secondary text-xs px-5 py-2.5 rounded-xl flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#D4AF37]" />
                Open exposure map
              </button>
              <button onClick={() => navigate('/simulator')} className="btn-secondary text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#A89874]" />
                Launch what-if simulator
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowScoreDetail(v => !v)}
            className="flex-shrink-0 rounded-2xl p-2 text-left"
            aria-expanded={showScoreDetail}
            aria-controls="score-breakdown-panel"
          >
            <ScoreGauge
              score={aggregateScore}
              band={bandFor(aggregateScore)}
              size={190}
              label="Network Risk Index"
              showHealthScore
            />
            <p className="mt-2 text-[10px] text-center font-mono text-[#77736A]">
              {showScoreDetail ? 'Hide breakdown' : 'Click for score breakdown'}
            </p>
          </button>
        </div>
      </GlassCard>

      <InsightsRail
        items={[
          {
            id: 'mismatch',
            kicker: 'Purpose rules',
            title: `${allMismatches.length} purpose mismatches`,
            body: 'Sites holding access that their inferred purpose does not obviously need.',
            accent: 'danger',
            onOpen: () => navigate('/scanner')
          },
          {
            id: 'pocket',
            kicker: 'Priority finding',
            title: pocketCalcSite
              ? `${pocketCalcSite.display_name}${spotlightMismatch ? ` · ${spotlightMismatch.permission}` : ''}`
              : 'No sites audited yet',
            body: spotlightMismatch?.explanation ?? 'Audit a site with the extension or run scanner/scan.py to fill the ledger.',
            accent: 'warn',
            onOpen: () => navigate('/scanner')
          },
          {
            id: 'allowed',
            kicker: 'Access',
            title: `${allowedCount} allowed permissions`,
            body: 'Every site setting currently set to allow, across all audited sites.',
            accent: 'gold',
            onOpen: () => navigate('/scanner')
          },
          {
            id: 'policy',
            kicker: 'Policies',
            title: `${analyzedCount} of ${sites.length} policies analyzed`,
            body: 'A site score stays partial until its privacy policy has been analyzed.',
            accent: 'warn',
            onOpen: () => navigate('/policy')
          },
          {
            id: 'demo',
            kicker: 'Honest label',
            title: isDemo ? 'Demo data (backend offline)' : 'Indicative, not a verdict',
            body: isDemo
              ? 'Start the ConsentScope backend to replace this demo data with your own.'
              : 'Scores reflect allowed settings and policy text, not observed data use.',
            accent: 'success',
            onOpen: () => navigate('/settings')
          }
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-mono text-[#8E8F99]">Sites ledgered</span>
            <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-2">
              <span>{sites.length}</span>
              <span className="text-xs text-[#40D9A2] font-normal">Origins</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
            <Layers className="w-5 h-5 text-[#D4AF37]" />
          </div>
        </GlassCard>

        <GlassCard
          as="button"
          onClick={() => navigate('/scanner')}
          className="p-4 flex items-center justify-between w-full text-left"
        >
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-mono text-red-300">Purpose mismatches</span>
            <div className="text-2xl font-bold font-mono text-red-400 flex items-baseline gap-2">
              <span>{allMismatches.length}</span>
              <span className="text-xs text-red-300 font-normal">Findings</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
        </GlassCard>

        <GlassCard
          as="button"
          onClick={() => navigate('/scanner')}
          className="p-4 flex items-center justify-between w-full text-left"
        >
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-mono text-amber-300">Allowed permissions</span>
            <div className="text-2xl font-bold font-mono text-amber-400 flex items-baseline gap-2">
              <span>{allowedCount}</span>
              <span className="text-xs text-amber-300 font-normal">Settings</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
        </GlassCard>

        <GlassCard
          as="button"
          onClick={() => navigate('/policy')}
          className="p-4 flex items-center justify-between w-full text-left"
        >
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-mono text-[#F5D76E]">Policies analyzed</span>
            <div className="text-2xl font-bold font-mono text-[#F5D76E] flex items-baseline gap-2">
              <span>{analyzedCount}</span>
              <span className="text-xs text-[#A89874] font-normal">of {sites.length}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
          </div>
        </GlassCard>
      </div>

      {pocketCalcSite && (
        <GlassCard className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-[#FF5D6C]/25">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-950/50 border border-red-500/40 flex items-center justify-center text-2xl flex-shrink-0">
              {pocketCalcSite.icon || '🌐'}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                  {isDemo ? 'Demo finding' : 'Top finding'}
                </span>
                <span className="text-white font-semibold text-base">
                  {pocketCalcSite.display_name} ({pocketCalcSite.origin})
                </span>
                <span className="text-xs text-[#71717A] font-mono">Profile: {pocketCalcSite.purpose_profile}</span>
              </div>
              <p className="text-xs text-[#B3B0A7] leading-relaxed max-w-2xl">
                {spotlightMismatch ? (
                  <>
                    <strong className="text-red-200">Permission–purpose mismatch ({spotlightMismatch.permission}):</strong>{' '}
                    {spotlightMismatch.explanation}
                  </>
                ) : (
                  <>No purpose mismatch on this site. Its score of {pocketCalcSite.score ?? '—'} comes from allowed permissions and policy findings.</>
                )}
              </p>
              <p className="text-[11px] text-[#77736A] font-mono">
                {spotlightMismatch
                  ? `Recommended action: block ${spotlightMismatch.permission} for this site, then review rule ${spotlightMismatch.rule_id}.`
                  : 'Recommended action: analyze this site\'s privacy policy to complete its score.'}
              </p>
              {actionError && (
                <p className="text-[11px] text-amber-200 bg-amber-950/30 border border-amber-500/40 rounded-lg px-2.5 py-1.5">{actionError}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {isLocationBlocked ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Protected (blocked)
              </span>
            ) : (
              <button
                onClick={handleQuickBlockPocketCalc}
                className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-500/50 text-xs font-semibold flex items-center gap-2"
              >
                <Ban className="w-4 h-4 text-red-400" />
                Revoke & block {pocketCalcLocationObs?.permission ?? 'location'}
              </button>
            )}
            <button onClick={() => navigate(`/scanner?origin=${encodeURIComponent(pocketCalcSite.origin)}`)} className="btn-secondary px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5">
              View site details
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="text-lg font-display text-white">Audited sites snapshot</h3>
            </div>
            <button onClick={() => navigate('/scanner')} className="text-xs text-[#F5D76E] hover:underline font-mono">
              Full ledger →
            </button>
          </div>
          <div className="space-y-2.5">
            {sites.slice(0, 5).map(site => (
              <button
                key={site.origin}
                onClick={() => navigate('/scanner')}
                className="w-full p-3 rounded-xl bg-[#111219] hover:bg-[#161724] border border-white/5 hover:border-[#D4AF37]/30 transition-all flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{site.icon || '🌐'}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">{site.display_name}</span>
                    <span className="text-[10px] text-[#71717A] font-mono">{site.origin}</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span
                    className={`text-xs font-bold ${
                      site.band === 'high'
                        ? 'text-red-400'
                        : site.band === 'elevated'
                          ? 'text-orange-400'
                          : site.band === 'moderate'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                    }`}
                  >
                    {site.score}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-[#786333] block">{site.band}</span>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

        <div id="score-breakdown-panel">
          {pocketCalcSite?.assessment?.risk ? (
            <ScoreBreakdown assessment={pocketCalcSite.assessment.risk} siteName={pocketCalcSite.display_name} />
          ) : (
            <GlassCard className="p-5 flex items-center justify-center text-xs text-[#71717A]">No assessment loaded.</GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};
