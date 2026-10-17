import React from 'react';
import { cn } from '../lib/cn';

interface GoldenLockProps {
  unlocking?: boolean;
  onActivate?: () => void;
  size?: number;
}

export const GoldenLock: React.FC<GoldenLockProps> = ({
  unlocking = false,
  onActivate,
  size = 228
}) => {
  return (
    <button
      type="button"
      aria-label="Unlock your privacy"
      onClick={onActivate}
      className={cn(
        'relative group focus-visible:outline-none',
        unlocking && 'vault-unlocking'
      )}
      style={{
        width: size,
        height: size
      }}
    >
      <span
        className="lock-aura absolute inset-[-18%] rounded-full pointer-events-none opacity-70"
        style={{
          background:
            'radial-gradient(circle, rgba(245,215,110,0.28) 0%, rgba(212,175,55,0.12) 38%, transparent 70%)'
        }}
      />

      <svg
        viewBox="0 0 220 240"
        width={size}
        height={size}
        className="relative z-10 drop-shadow-[0_18px_30px_rgba(0,0,0,0.65)]"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="lockMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6f5424" />
            <stop offset="22%" stopColor="#d4af37" />
            <stop offset="48%" stopColor="#f5d76e" />
            <stop offset="72%" stopColor="#8a6a28" />
            <stop offset="100%" stopColor="#e8c65a" />
          </linearGradient>
          <linearGradient id="lockBody" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#3a2d16" />
            <stop offset="18%" stopColor="#c6a046" />
            <stop offset="42%" stopColor="#f3e2a0" />
            <stop offset="58%" stopColor="#8d6c2a" />
            <stop offset="82%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#4a3816" />
          </linearGradient>
          <linearGradient id="shackleMetal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5c471c" />
            <stop offset="30%" stopColor="#f5d76e" />
            <stop offset="55%" stopColor="#9a7628" />
            <stop offset="100%" stopColor="#e6c76a" />
          </linearGradient>
          <radialGradient id="keyholeGold" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#f8f1d0" />
            <stop offset="55%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#2a210f" />
          </radialGradient>
          <filter id="softLockShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000" floodOpacity="0.55" />
          </filter>
          <pattern id="brushed" width="4" height="8" patternUnits="userSpaceOnUse">
            <rect width="4" height="8" fill="transparent" />
            <path d="M0 1 H4" stroke="rgba(255,248,220,0.08)" strokeWidth="0.4" />
            <path d="M0 5 H4" stroke="rgba(0,0,0,0.12)" strokeWidth="0.35" />
          </pattern>
        </defs>

        {/* Shadow plate */}
        <ellipse cx="110" cy="226" rx="58" ry="8" fill="rgba(0,0,0,0.55)" />

        {/* Shackle */}
        <g
          className="lock-shackle origin-[110px_92px]"
          style={{
            transformOrigin: '110px 92px',
            transition: 'transform 0.85s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}
        >
          <path
            d="M62 118 V78 C62 46 82 28 110 28 C138 28 158 46 158 78 V118"
            fill="none"
            stroke="url(#shackleMetal)"
            strokeWidth="18"
            strokeLinecap="round"
            filter="url(#softLockShadow)"
          />
          <path
            d="M62 118 V78 C62 46 82 28 110 28 C138 28 158 46 158 78 V118"
            fill="none"
            stroke="rgba(255,248,220,0.35)"
            strokeWidth="4"
            strokeLinecap="round"
            transform="translate(-3,-2)"
          />
          <path
            d="M62 118 V78 C62 46 82 28 110 28 C138 28 158 46 158 78 V118"
            fill="none"
            stroke="rgba(40,28,8,0.35)"
            strokeWidth="3"
            strokeLinecap="round"
            transform="translate(3,2)"
          />
        </g>

        {/* Body */}
        <g filter="url(#softLockShadow)">
          <rect x="42" y="104" width="136" height="112" rx="22" fill="url(#lockBody)" />
          <rect x="42" y="104" width="136" height="112" rx="22" fill="url(#brushed)" />
          <rect
            x="48"
            y="110"
            width="124"
            height="100"
            rx="18"
            fill="none"
            stroke="rgba(245,215,110,0.28)"
            strokeWidth="1.2"
          />
          <path
            d="M54 124 C90 118, 130 118, 166 128"
            fill="none"
            stroke="rgba(255,248,220,0.28)"
            strokeWidth="2"
          />
          <text
            x="110"
            y="132"
            textAnchor="middle"
            fill="rgba(42,33,15,0.55)"
            fontFamily="Cinzel, serif"
            fontSize="9"
            letterSpacing="3"
          >
            PRIVACYLENS
          </text>
        </g>

        {/* Keyhole */}
        <g transform="translate(110,168)">
          <circle r="16" fill="#1a1408" opacity="0.9" />
          <circle r="11" fill="url(#keyholeGold)" />
          <circle className="lock-keyhole-glow" r="18" fill="rgba(245,215,110,0.0)" />
          <path d="M-4 4 L-7 22 H7 L4 4 Z" fill="#1a1408" />
          <circle r="5.5" fill="#120e08" />
        </g>
        <circle
          className="lock-keyhole-glow"
          cx="110"
          cy="168"
          r="22"
          fill="rgba(245,215,110,0.22)"
          opacity="0"
          style={{ transition: 'opacity 0.4s ease 0.25s' }}
        />

        {/* Sweeping reflection */}
        <rect
          className="lock-reflection"
          x="42"
          y="104"
          width="36"
          height="112"
          fill="url(#lockMetal)"
          opacity="0"
          style={{ mixBlendMode: 'screen' }}
        />
      </svg>
    </button>
  );
};
