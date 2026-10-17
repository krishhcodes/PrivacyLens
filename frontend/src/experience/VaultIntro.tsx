import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoldenLock } from './GoldenLock';
import { prefersReducedMotion } from './introStorage';
import { useIntro } from './IntroProvider';

const UNLOCK_MS = 2400;

export const VaultIntro: React.FC = () => {
  const { completeIntro } = useIntro();
  const [unlocking, setUnlocking] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [typed, setTyped] = useState({ eyebrow: false, h1: false, h2: false, copy: false, cta: false });
  const lockWrapRef = useRef<HTMLDivElement | null>(null);
  const unlockingRef = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const delays = reduced
      ? [0, 0, 0, 0, 0]
      : [180, 420, 720, 980, 1280];
    delays.forEach((delay, index) => {
      timers.current.push(
        window.setTimeout(() => {
          setTyped(prev => {
            const keys = ['eyebrow', 'h1', 'h2', 'copy', 'cta'] as const;
            return { ...prev, [keys[index]]: true };
          });
        }, delay)
      );
    });
    return () => {
      timers.current.forEach(id => window.clearTimeout(id));
    };
  }, []);

  const beginUnlock = useCallback(() => {
    if (unlockingRef.current) return;
    if (prefersReducedMotion()) {
      completeIntro({ skip: true });
      return;
    }
    unlockingRef.current = true;
    setUnlocking(true);
    timers.current.push(
      window.setTimeout(() => setExiting(true), 1600),
      window.setTimeout(() => completeIntro(), UNLOCK_MS)
    );
  }, [completeIntro]);

  const skipIntro = useCallback(() => {
    unlockingRef.current = true;
    completeIntro({ skip: true });
  }, [completeIntro]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        skipIntro();
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && !unlockingRef.current) {
        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-skip-intro]')) return;
        if (target?.tagName === 'BUTTON' || target?.tagName === 'A') return;
        event.preventDefault();
        beginUnlock();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [beginUnlock, skipIntro]);

  const dust = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${8 + ((i * 17) % 84)}%`,
        top: `${12 + ((i * 29) % 70)}%`,
        delay: `${(i % 7) * 0.7}s`,
        dx: `${(i % 2 === 0 ? 1 : -1) * (12 + (i % 9) * 4)}px`,
        dy: `${-40 - (i % 11) * 6}px`,
        size: 1 + (i % 3)
      })),
    []
  );

  const onPointerMove = (event: React.PointerEvent) => {
    const wrap = lockWrapRef.current;
    if (!wrap || unlockingRef.current) return;
    const rect = wrap.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const near = dist < 220;
    wrap.classList.toggle('is-near', near);
    wrap.style.setProperty('--magnet-x', `${near ? Math.max(-10, Math.min(10, dx * 0.04)) : 0}px`);
    wrap.style.setProperty('--magnet-y', `${near ? Math.max(-8, Math.min(8, dy * 0.04)) : 0}px`);
  };

  return (
    <div
      className={`vault-intro fixed inset-0 z-[90] overflow-hidden text-[#F8F6F0] ${unlocking ? 'vault-unlocking' : ''} ${exiting ? 'vault-exiting' : ''}`}
      onPointerMove={onPointerMove}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-headline"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.16),transparent_68%)]" />
        <div className="vault-orbits absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[430px] h-[430px] rounded-full border border-[#D4AF37]/15" />
        <div className="vault-orbits absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full border border-[#D4AF37]/10 [animation-duration:72s]" />
        <div className="gold-streak no-print absolute top-[18%] left-[-20%] w-[48%] h-px bg-gradient-to-r from-transparent via-[#F5D76E]/50 to-transparent" />
        {dust.map(p => (
          <span
            key={p.id}
            className="absolute rounded-full bg-[#F5D76E] pointer-events-none"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: 0.4,
              animation: 'dustDrift 9s linear infinite',
              animationDelay: p.delay,
              ['--dx' as string]: p.dx,
              ['--dy' as string]: p.dy
            }}
          />
        ))}
      </div>

      <button
        type="button"
        data-skip-intro
        onClick={skipIntro}
        className="absolute top-5 right-5 z-20 text-[11px] font-mono tracking-widest uppercase text-[#B3B0A7] hover:text-[#F5D76E] px-3 py-2 border border-[#D4AF37]/20 rounded-lg bg-black/30"
      >
        Skip intro
      </button>

      <div className="relative z-10 h-full max-w-6xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-20">
        <div
          ref={lockWrapRef}
          className="vault-lock-hotspot flex flex-col items-center"
        >
          <GoldenLock
            unlocking={unlocking}
            onActivate={beginUnlock}
            size={228}
          />
          <p
            className={`mt-5 text-[10px] tracking-[0.35em] uppercase font-mono text-[#786333] transition-opacity duration-700 ${
              typed.cta ? 'opacity-80' : 'opacity-0'
            }`}
          >
            Move closer to explore
          </p>
        </div>

        <div
          className={`max-w-xl text-center lg:text-left space-y-5 transition-all duration-700 ${
            unlocking ? 'opacity-0 -translate-y-6 pointer-events-none' : 'opacity-100'
          }`}
        >
          <p
            className={`text-[11px] tracking-[0.32em] uppercase font-mono text-[#BFA15F] transition-all duration-700 ${
              typed.eyebrow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            A new standard of digital privacy
          </p>
          <div id="vault-headline" className="space-y-1">
            <h1
              className={`font-display text-4xl sm:text-5xl lg:text-6xl leading-[0.95] text-[#F8F6F0] uppercase tracking-[0.02em] transition-all duration-700 ${
                typed.h1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Your digital world.
            </h1>
            <h2
              className={`font-display text-4xl sm:text-5xl lg:text-6xl leading-[0.95] gold-gradient-text uppercase tracking-[0.02em] transition-all duration-700 ${
                typed.h2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Under your control.
            </h2>
          </div>
          <p
            className={`text-sm sm:text-base text-[#B3B0A7] leading-relaxed max-w-md mx-auto lg:mx-0 transition-all duration-700 ${
              typed.copy ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            See what your apps can access. Understand what they disclose. Take back control.
          </p>
          <div
            className={`flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2 transition-all duration-700 ${
              typed.cta ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            <button
              type="button"
              onClick={beginUnlock}
              className="btn-primary px-6 py-3 rounded-xl text-xs uppercase tracking-[0.18em]"
            >
              Unlock your privacy
            </button>
            <span className="text-[11px] font-mono text-[#77736A]">
              Your browser permissions · scored locally
            </span>
          </div>
        </div>
      </div>

      {unlocking && (
        <>
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-[42%] w-1.5 h-1.5 rounded-full bg-[#F5D76E] pointer-events-none"
              style={{
                animation: `dustDrift 1.3s ease-out ${i * 0.04}s both`,
                ['--dx' as string]: `${(i % 2 ? 1 : -1) * (40 + i * 12)}px`,
                ['--dy' as string]: `${(i % 3 ? -1 : 1) * (20 + i * 8)}px`
              }}
            />
          ))}
          <div className="vault-bloom absolute left-1/2 top-[42%] w-28 h-28 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none mix-blend-screen animate-[bloomExpand_1.4s_ease-in_0.9s_forwards] opacity-0" />
        </>
      )}
    </div>
  );
};
