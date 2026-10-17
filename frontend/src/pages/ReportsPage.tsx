import React, { useMemo } from 'react';
import { 
  Printer, 
  Download, 
  Shield, 
  Award
} from 'lucide-react';
import { generateReportFromSites } from '../services/reportService';
import { useSites } from '../services/siteStore';
import { openReport } from '../api/client';
import { ScoreGauge } from '../components/common/ScoreGauge';

export const ReportsPage: React.FC = () => {
  const { sites, mode } = useSites();
  const report = useMemo(() => generateReportFromSites(sites), [sites]);
  const topSite = [...sites].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0];
  const topMismatch = sites.flatMap(s => (s.assessment?.mismatches || []).map(m => ({ site: s, m })))
    .sort((a, b) => (a.m.severity === 'high' ? 0 : 1) - (b.m.severity === 'high' ? 0 : 1))[0];
  const policyFlagSites = sites.filter(s => (s.policy_findings || []).some(f => f.category === 'sale' || f.category === 'sharing')).length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `privacylens-audit-${report.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Screen-Only Header with Export Controls */}
      <div className="no-print bg-[#0A0B10] p-6 rounded-3xl border border-[#D4AF37]/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#D4AF37]" />
            <h1 className="text-xl font-bold font-['Cinzel',serif] text-white">
              Privacy Report
            </h1>
          </div>
          <p className="text-xs text-[#8E8F99] max-w-xl">
            Printable report compiling audited site permissions, policy findings and purpose mismatches{mode === 'offline' ? ' (demo data: backend offline)' : ' from the ConsentScope backend'}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportJSON}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-mono flex items-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handlePrint}
            className="gold-gradient-bg text-black font-semibold text-xs px-5 py-2 rounded-xl flex items-center gap-2 hover:brightness-110 transition-all shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Formal Printable Dossier Document Container */}
      <div className="print-dossier bg-[#0B0C12] rounded-3xl border-2 border-[#D4AF37]/35 p-8 md:p-12 space-y-8 shadow-2xl relative">
        {/* Dossier Header Watermark */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-[#D4AF37]/30 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="w-7 h-7 text-[#D4AF37]" />
              <span className="font-['Cinzel',serif] text-2xl font-black tracking-wider text-white">
                PRIVACY<span className="gold-gradient-text">LENS</span>
              </span>
            </div>
            <p className="text-xs tracking-widest text-[#A89874] uppercase font-mono">
              Browser Permission Audit &middot; Summary Report
            </p>
          </div>

          <div className="text-right font-mono text-xs space-y-1">
            <div className="inline-block px-2.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-bold uppercase text-[10px]">
              CONFIDENTIAL // INDICATIVE AUDIT
            </div>
            <div className="text-[#8E8F99] text-[11px]">Report ID: <span className="text-white">{report.id}</span></div>
            <div className="text-[#8E8F99] text-[11px]">Timestamp: {new Date(report.generated_at).toLocaleString()}</div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-[#11121B] p-6 rounded-2xl border border-white/5">
          <div className="md:col-span-2 space-y-3">
            <span className="text-[10px] uppercase font-mono text-[#D4AF37] tracking-wider font-semibold">
              Section 1 &mdash; Executive Summary
            </span>
            <h2 className="text-lg font-bold text-white font-['Cinzel',serif]">
              What Your Sites Can Access
            </h2>
            <p className="text-xs text-[#C8C8D4] leading-relaxed">
              This dossier documents browser permission settings across {sites.length} audited web origins,
              with {report.total_mismatches_count} purpose mismatch{report.total_mismatches_count === 1 ? '' : 'es'} ({report.high_severity_count} high)
              and {report.policies_analyzed_count} analyzed privacy polic{report.policies_analyzed_count === 1 ? 'y' : 'ies'}.{' '}
              {topMismatch ? (
                <>The most notable finding is <strong className="text-white">rule {topMismatch.m.rule_id}</strong> on {topMismatch.site.display_name} (<code>{topMismatch.site.origin}</code>): {topMismatch.m.explanation}</>
              ) : topSite ? (
                <>The highest-scoring site is {topSite.display_name} (<code>{topSite.origin}</code>) at {topSite.score ?? '—'}/100.</>
              ) : (
                <>No sites have been audited yet.</>
              )}
            </p>
          </div>

          <div className="flex justify-center">
            <ScoreGauge
              score={report.overall_score}
              band={report.overall_band}
              size={150}
              label="Network Risk Index"
            />
          </div>
        </div>

        {/* Regulatory Compliance Breakdown */}
        <div className="space-y-4">
          <span className="text-[10px] uppercase font-mono text-[#D4AF37] tracking-wider font-semibold">
            Section 2 &mdash; Related Privacy Principles
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#12131F] border border-red-500/30 space-y-1.5">
              <span className="text-red-400 font-mono font-bold text-[11px] block">
                GDPR Article 5(1)(c)
              </span>
              <span className="font-semibold text-white">Data Minimization Principle</span>
              <p className="text-[11px] text-[#8E8F99] leading-relaxed">
                {report.total_mismatches_count} permission{report.total_mismatches_count === 1 ? '' : 's'} held by sites whose purpose does not obviously need {report.total_mismatches_count === 1 ? 'it' : 'them'}.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#12131F] border border-amber-500/30 space-y-1.5">
              <span className="text-amber-400 font-mono font-bold text-[11px] block">
                CCPA / CPRA &sect; 1798.120
              </span>
              <span className="font-semibold text-white">Commercial Sale &amp; Sharing</span>
              <p className="text-[11px] text-[#8E8F99] leading-relaxed">
                {policyFlagSites} analyzed polic{policyFlagSites === 1 ? 'y declares' : 'ies declare'} selling or sharing data with third parties.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#12131F] border border-blue-500/30 space-y-1.5">
              <span className="text-blue-400 font-mono font-bold text-[11px] block">
                FTC Act Section 5
              </span>
              <span className="font-semibold text-white">Purpose vs. Access</span>
              <p className="text-[11px] text-[#8E8F99] leading-relaxed">
                Mismatches mark where a site's apparent purpose and the access it holds diverge. Review, not proof of misuse.
              </p>
            </div>
          </div>
        </div>

        {/* Complete Audited Site Ledger Table */}
        <div className="space-y-3">
          <span className="text-[10px] uppercase font-mono text-[#D4AF37] tracking-wider font-semibold">
            Section 3 &mdash; Audited Sites
          </span>

          <div className="overflow-x-auto border border-white/10 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#12131F] border-b border-white/10 text-[10px] font-mono text-[#A89874] uppercase">
                  <th className="py-2.5 px-3">Origin / Application</th>
                  <th className="py-2.5 px-3" title="Guessed from keywords in the address or page title">Purpose (inferred)</th>
                  <th className="py-2.5 px-3">Active Grants</th>
                  <th className="py-2.5 px-3">Mismatches</th>
                  <th className="py-2.5 px-3 text-right">Risk Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sites.map(site => (
                  <tr key={site.origin}>
                    <td className="py-2.5 px-3 font-medium text-white">
                      {site.display_name} <span className="text-[#71717A] text-[10px] font-mono">({site.origin})</span>
                      {mode === 'live' && (
                        <a href="#" onClick={e => { e.preventDefault(); openReport(site.origin).catch(err => alert((err as Error).message)); }} className="no-print ml-2 text-[10px] font-mono text-[#F5D76E] hover:underline">
                          report ↗
                        </a>
                      )}
                    </td>
                    <td className="py-2.5 px-3 capitalize text-[#8E8F99] font-mono">{site.purpose_profile}</td>
                    <td className="py-2.5 px-3 text-[#C8C8D4] font-mono">
                      {site.observations.filter(o => o.browser_setting === 'allow').map(o => o.permission).join(', ') || 'None'}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {(site.assessment?.mismatches || []).length > 0 ? (
                        <span className="text-red-400 font-bold">{[...new Set((site.assessment?.mismatches || []).map(m => m.rule_id))].join(', ')} (Flagged)</span>
                      ) : (
                        <span className="text-emerald-400">Consistent</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      {site.score ?? '—'}/100 ({(site.band || 'n/a').toUpperCase()})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dossier Footer / Sign-off */}
        <div className="border-t border-[#D4AF37]/20 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#71717A] font-mono gap-4">
          <div>
            <span>Generated by: </span>
            <span className="text-white">PrivacyLens · ConsentScope backend rules</span>
          </div>
          <div>
            <span>Assessment: </span>
            <span className="text-[#D4AF37] font-bold">INDICATIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
