import React, { useEffect, useState } from 'react';
import type { ScoreBand, Completeness } from '../../types';

interface ScoreGaugeProps {
  score: number; // 0 to 100 risk score
  band: ScoreBand;
  completeness?: Completeness;
  size?: number;
  label?: string;
  showHealthScore?: boolean;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  band,
  completeness = 'full',
  size = 180,
  label = 'Privacy Risk Score',
  showHealthScore = false
}) => {
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.min(100, Math.max(0, score));
  const [animatedRisk, setAnimatedRisk] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setAnimatedRisk(normalizedScore);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1100);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedRisk(normalizedScore * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [normalizedScore]);

  const strokeDashoffset = circumference - (animatedRisk / 100) * circumference;

  const getBandDetails = () => {
    switch (band) {
      case 'low':
        return {
          color: '#40D9A2',
          bgColor: 'rgba(64, 217, 162, 0.1)',
          borderColor: 'rgba(64, 217, 162, 0.3)',
          label: 'LOW RISK',
          subtext: 'Few sensitive permissions allowed'
        };
      case 'moderate':
        return {
          color: '#FFB454',
          bgColor: 'rgba(255, 180, 84, 0.1)',
          borderColor: 'rgba(255, 180, 84, 0.3)',
          label: 'MODERATE EXPOSURE',
          subtext: 'Some mismatches or policy concerns'
        };
      case 'elevated':
        return {
          color: '#F97316',
          bgColor: 'rgba(249, 115, 22, 0.1)',
          borderColor: 'rgba(249, 115, 22, 0.3)',
          label: 'ELEVATED RISK',
          subtext: 'Several sensitive grants or policy flags'
        };
      case 'high':
        return {
          color: '#FF5D6C',
          bgColor: 'rgba(255, 93, 108, 0.15)',
          borderColor: 'rgba(255, 93, 108, 0.4)',
          label: 'HIGH EXPOSURE',
          subtext: 'Many sensitive grants, mismatches or data-sale clauses'
        };
    }
  };

  const bandInfo = getBandDetails();
  const displayScore = Math.round(showHealthScore ? Math.max(0, 100 - animatedRisk) : animatedRisk);
  const scoreUnit = showHealthScore ? '/100 Health' : '/100 Risk';

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#171717"
            strokeWidth="10"
          />

          {/* Golden Ambient Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#29251A"
            strokeWidth="8"
          />

          {/* Active Gradient Stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="url(#goldGaugeGradient)"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />

          {/* SVG Linear Gradient Definition */}
          <defs>
            <linearGradient id="goldGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8E6B22" />
              <stop offset="35%" stopColor="#D4AF37" />
              <stop offset="70%" stopColor="#F5D76E" />
              <stop offset="100%" stopColor={bandInfo.color} />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl sm:text-4xl font-extrabold font-['Cinzel',serif] text-transparent bg-clip-text bg-gradient-to-b from-[#F8F6F0] to-[#D4AF37] tracking-tight">
            {displayScore}
          </span>
          <span className="text-[11px] font-mono text-[#77736A] uppercase tracking-wider -mt-0.5">
            {scoreUnit}
          </span>
        </div>
      </div>

      {/* Label & Band Pill */}
      <div className="mt-3 flex flex-col items-center gap-1.5">
        <span className="text-[11px] font-mono text-[#A89874] tracking-wider uppercase">
          {label}
        </span>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-bold tracking-widest uppercase border"
          style={{
            color: bandInfo.color,
            backgroundColor: bandInfo.bgColor,
            borderColor: bandInfo.borderColor
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: bandInfo.color }} />
          <span>{bandInfo.label}</span>
        </span>

        <p className="text-xs text-[#B3B0A7] max-w-[200px] leading-tight font-sans">
          {bandInfo.subtext}
        </p>

        {completeness === 'partial' && (
          <span className="text-[10px] text-[#77736A] font-mono mt-0.5">
            (Partial assessment · Policy pending)
          </span>
        )}
      </div>
    </div>
  );
};
