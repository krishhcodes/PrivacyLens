import React from 'react';
import type { RiskFactor, RiskAssessment } from '../../types';
import { ProvenanceBadge } from './ProvenanceBadge';
import { ShieldAlert, Info } from 'lucide-react';

export interface ScoreBreakdownProps {
  assessment?: RiskAssessment | null;
  factors?: RiskFactor[];
  siteName?: string;
  disclaimer?: string;
  missing?: string[];
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  assessment,
  factors: explicitFactors,
  siteName,
  disclaimer,
  missing: explicitMissing = []
}) => {
  const factors = explicitFactors || assessment?.factors || [];
  const missing = explicitMissing.length > 0 ? explicitMissing : (assessment?.missing || []);
  const resolvedDisclaimer = disclaimer || assessment?.disclaimer;

  return (
    <div className="rounded-2xl bg-[#111111] border border-[#29251A] p-5 sm:p-6 backdrop-blur-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#29251A]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#D4AF37]" />
          <h4 className="text-xs font-bold text-[#F8F6F0] uppercase tracking-wider font-['Cinzel',serif]">
            {siteName ? `${siteName} Risk Attribution` : 'Risk Factor Attribution'}
          </h4>
        </div>
        <span className="text-[11px] font-mono text-[#77736A]">
          {factors.length} active factors
        </span>
      </div>

      <div className="space-y-2.5">
        {factors.map((factor) => (
          <div
            key={factor.factor_id}
            className="p-3 rounded-xl bg-[#171717]/80 border border-[#29251A] hover:border-[#3A3424] transition-colors flex items-start justify-between gap-3 text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[#F8F6F0] font-sans">
                  {factor.label}
                </span>
                <ProvenanceBadge provenance={factor.provenance} />
              </div>
              <p className="text-[11px] text-[#A89874] leading-relaxed">
                {factor.explanation}
              </p>
            </div>

            <div className="flex-shrink-0 text-right">
              <span className={`font-mono font-bold text-xs ${
                factor.points > 20 ? 'text-[#FF5D6C]' : factor.points > 10 ? 'text-[#FFB454]' : 'text-[#D4AF37]'
              }`}>
                +{factor.points} pts
              </span>
            </div>
          </div>
        ))}

        {factors.length === 0 && (
          <p className="text-xs text-[#77736A] italic py-2">
            No risk factors identified. Excellent privacy posture.
          </p>
        )}
      </div>

      {missing.length > 0 && (
        <div className="pt-2 border-t border-[#29251A] flex items-start gap-2 text-[11px] text-[#77736A]">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#D4AF37]" />
          <div>
            <span>Pending Signals: </span>
            <span className="text-[#A89874] font-mono">{missing.join(', ')}</span>
          </div>
        </div>
      )}

      {resolvedDisclaimer && (
        <p className="text-[10px] text-[#55524B] leading-tight pt-1">
          {resolvedDisclaimer}
        </p>
      )}
    </div>
  );
};
