import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Sparkles,
  Copy,
  Check,
  Save
} from 'lucide-react';
import { analyzePolicyText } from '../services/policyService';
import { reloadSite, useSites } from '../services/siteStore';
import { analyzePolicy } from '../api/client';
import { pickSpotlight } from '../lib/spotlight';
import { SeverityBadge } from '../components/common/SeverityBadge';
import type { PolicyFinding } from '../types';

export const PolicyPage: React.FC = () => {
  const { sites, mode } = useSites();
  const pocketCalcSite = pickSpotlight(sites);

  const [selectedSiteOrigin, setSelectedSiteOrigin] = useState<string>(pocketCalcSite?.origin || '');
  const [policyText, setPolicyText] = useState<string>(pocketCalcSite?.policy_text || '');
  const [selectedFinding, setSelectedFinding] = useState<PolicyFinding | null>(null);
  const [copied, setCopied] = useState(false);
  const [liveFindings, setLiveFindings] = useState<PolicyFinding[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sites load asynchronously: default the picker once they arrive.
  useEffect(() => {
    if (!selectedSiteOrigin && pocketCalcSite) {
      setSelectedSiteOrigin(pocketCalcSite.origin);
      setPolicyText(pocketCalcSite.policy_text || '');
    }
  }, [pocketCalcSite, selectedSiteOrigin]);

  // Live preview: backend rules (POST /policy/analyze without an origin, so nothing is stored).
  // Offline demo: the local rule set.
  useEffect(() => {
    setAnalysisError(null);
    if (!policyText.trim()) {
      setLiveFindings([]);
      return;
    }
    if (mode !== 'live') {
      setLiveFindings(analyzePolicyText(policyText, selectedSiteOrigin || null).findings);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const r = await analyzePolicy(policyText);
        if (!cancelled) setLiveFindings(r.findings);
      } catch (e) {
        if (!cancelled) setAnalysisError((e as Error).message);
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [policyText, selectedSiteOrigin, mode]);

  // With an empty buffer, show the findings already saved for the site in the backend.
  const selectedSiteData = sites.find(s => s.origin === selectedSiteOrigin);
  const showingSaved = !policyText.trim();
  const analysisResult = { findings: showingSaved ? (selectedSiteData?.policy_findings || []) : liveFindings };

  const handleSelectSite = (origin: string) => {
    setSelectedSiteOrigin(origin);
    const site = sites.find(s => s.origin === origin);
    if (site) {
      setPolicyText(site.policy_text || '');
      setSelectedFinding(null);
    }
  };

  // POST /policy/analyze with the origin: replaces the site's stored findings and makes its score "full".
  const handleSaveToSite = async () => {
    if (!policyText.trim() || !selectedSiteOrigin) return;
    setSaving(true);
    setAnalysisError(null);
    try {
      await analyzePolicy(policyText, selectedSiteOrigin);
      await reloadSite(selectedSiteOrigin);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setAnalysisError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(policyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'data_collection':
      case 'collection':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'third_party_sharing':
      case 'sharing':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'data_sale':
      case 'sale':
        return 'bg-red-500/25 text-red-300 border-red-500/50';
      case 'retention_indefinite':
      case 'retention':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'no_deletion_right':
      case 'deletion':
        return 'bg-pink-500/20 text-pink-300 border-pink-500/40';
      case 'cross_site_tracking':
      case 'tracking':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-[#0A0B10] p-6 rounded-3xl border border-[#D4AF37]/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-[#D4AF37]" />
            <h1 className="text-xl font-bold font-['Cinzel',serif] text-white">
              Policy Workspace &amp; Sentence Extractor
            </h1>
          </div>
          <p className="text-xs text-[#8E8F99] max-w-xl">
            Paste a privacy policy to find sentences about data collection, sharing, sale, retention and deletion, with exact character offsets. Uses the ConsentScope backend rules.
          </p>
        </div>

        {/* Site Preset Switcher */}
        <div className="flex items-center gap-2 bg-[#12131C] p-2 rounded-2xl border border-white/10">
          <span className="text-[10px] text-[#A89874] font-mono uppercase">TARGET POLICY:</span>
          <select
            value={selectedSiteOrigin}
            onChange={e => handleSelectSite(e.target.value)}
            className="bg-[#181926] text-white text-xs rounded-xl px-2.5 py-1.5 border border-[#D4AF37]/30 font-mono outline-none focus:border-[#D4AF37]"
          >
            {sites.map(s => (
              <option key={s.origin} value={s.origin}>
                {s.display_name} ({s.origin.replace(/^https?:\/\//, '')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Policy Document Viewer & Editor (7 cols) */}
        <div className="lg:col-span-7 bg-[#0B0C12] rounded-3xl border border-[#D4AF37]/25 overflow-hidden flex flex-col shadow-xl">
          <div className="bg-[#11121A] border-b border-white/10 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#40D9A2]" />
              <span className="text-xs font-mono font-semibold text-white">
                DOCUMENT BUFFER ({policyText.length} chars)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyText}
                className="p-1.5 rounded-lg text-[#8E8F99] hover:text-white hover:bg-white/5 transition-colors text-xs flex items-center gap-1 font-mono"
                title="Copy text"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              {mode === 'live' && (
                <button
                  onClick={handleSaveToSite}
                  disabled={saving || !policyText.trim() || !selectedSiteOrigin}
                  className="p-1.5 rounded-lg text-[#F5D76E] hover:bg-[#D4AF37]/10 border border-[#D4AF37]/30 transition-colors text-xs flex items-center gap-1 font-mono disabled:opacity-40"
                  title="Store these findings for the selected site; its score then includes the policy"
                >
                  {saved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{saving ? 'Saving…' : saved ? 'Saved' : 'Save to site'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Document Display */}
          <div className="p-6 bg-[#07080C] min-h-[460px] max-h-[600px] overflow-y-auto custom-scrollbar font-['JetBrains_Mono',monospace] text-xs text-[#C8C8D4] leading-relaxed select-text space-y-4">
            <div className="p-3 bg-[#131420] rounded-xl border border-white/5 text-[11px] text-[#A89874] font-mono">
              💡 Tip: Click any extracted sentence finding on the right to inspect its exact offset span and rule classification.
            </div>

            <textarea
              value={policyText}
              onChange={e => setPolicyText(e.target.value)}
              className="w-full h-96 bg-transparent text-[#E0E0EC] font-mono text-xs outline-none resize-none leading-relaxed"
              placeholder="Paste a privacy policy here to analyze it. Nothing is stored until you click Save to site."
            />
          </div>

          <div className="bg-[#0E0F16] border-t border-white/5 px-5 py-2.5 flex items-center justify-between text-[11px] text-[#71717A] font-mono">
            <span>Character Count: {policyText.length}</span>
            <span>Encoding: UTF-8 &middot; Offsets: Exact</span>
          </div>
        </div>

        {/* Right Column: Extracted Findings List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0B0C12] rounded-3xl border border-[#D4AF37]/25 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <h3 className="text-sm font-bold text-white font-['Cinzel',serif]">
                  {showingSaved ? 'Saved Findings' : 'Extracted Findings'} ({analysisResult.findings.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#F5D76E] px-2 py-0.5 rounded bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                {analyzing ? 'ANALYZING…' : mode === 'offline' ? 'DEMO RULES' : '100% REPRODUCIBLE'}
              </span>
            </div>

            {analysisError && (
              <p className="text-xs text-red-300 bg-red-950/30 border border-red-500/30 rounded-xl px-3 py-2">{analysisError}</p>
            )}
            {showingSaved && (
              <p className="text-[11px] text-[#8E8F99] font-mono">
                {analysisResult.findings.length > 0
                  ? 'Findings stored for this site in the backend. Paste text to run a new analysis.'
                  : 'No policy analyzed for this site yet. Paste its policy text to analyze it.'}
              </p>
            )}

            {/* Findings List */}
            <div className="space-y-3 max-h-[540px] overflow-y-auto custom-scrollbar pr-1">
              {analysisResult.findings.map(finding => {
                const isSelected = selectedFinding?.id === finding.id;
                const catColor = getCategoryColor(finding.category);

                return (
                  <div
                    key={finding.id}
                    onClick={() => setSelectedFinding(finding)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-[#1C180E] border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                        : 'bg-[#12131D] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-white">
                          {finding.rule_id}
                        </span>
                        <SeverityBadge severity={finding.severity || (finding.category === 'sale' ? 'high' : 'review')} />
                      </div>

                      <span className="text-[10px] font-mono text-[#786333]">
                        chars [{finding.char_start}..{finding.char_end}]
                      </span>
                    </div>

                    <p className="text-xs text-[#E8E8EE] italic bg-black/40 p-2.5 rounded-xl border border-white/5">
                      {finding.excerpt ? `"${finding.excerpt}"` : finding.explanation}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                      <span className={`px-2 py-0.5 rounded border capitalize ${catColor}`}>
                        {finding.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[#A89874]">
                        {finding.evidence_type === 'explicit_statement' ? 'Explicit statement' : 'Keyword match · review'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
