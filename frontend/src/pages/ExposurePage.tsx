import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Network,
  Radio
} from 'lucide-react';
import { ExposureGraph } from '../components/exposure/ExposureGraph';
import { FutureScopeBanner } from '../components/common/FutureScopeBanner';

export const ExposurePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <FutureScopeBanner
        what="This map is drawn from sample data, not from your audited sites."
        needs="the backend would need to record which third parties each site shares data with (e.g. from analyzed policies) and expose it as a graph endpoint."
      />
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#0A0B10] p-6 rounded-3xl border border-[#D4AF37]/25">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-[#D4AF37]" />
            <h1 className="text-xl font-bold font-['Cinzel',serif] text-white">
              Data Exposure Mesh Topology
            </h1>
          </div>
          <p className="text-xs text-[#8E8F99] max-w-xl">
            Illustrative map of how personal data can flow: from identity &amp; browser permissions, to data categories, and external advertising exchanges. Built from demo data, not from your audited sites.
          </p>
        </div>

        {/* Quick Legend Pill */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-[#D4AF37]/15 text-[#F5D76E] border border-[#D4AF37]/30">
            Demo data
          </span>
        </div>
      </div>

      {/* Exposure Narrative Context Callout */}
      <div className="p-4 rounded-2xl bg-[#0E0F18] border border-[#D4AF37]/20 flex items-start gap-3">
        <Radio className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5 animate-pulse" />
        <div className="text-xs text-[#A89874] leading-relaxed space-y-1">
          <p>
            <strong className="text-white">Example telemetry path (demo):</strong>
            {' '}When you use <span className="text-[#F5D76E] font-medium">PocketCalc (http://localhost:5500)</span>, granting <span className="text-white font-mono">geolocation</span> exposes <span className="text-[#FF5D6C] font-mono">Precise Lat/Long Coordinates</span>. The declared policy transfers this data downstream to <span className="text-[#FF5D6C] font-semibold">AdMob</span> and syndicated data brokers without your explicit contextual expectation.
          </p>
        </div>
      </div>

      {/* Main Graph Visualization Canvas */}
      <ExposureGraph
        onSelectAppOrigin={() => {
          navigate('/scanner');
        }}
      />
    </div>
  );
};
