import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '../lib/cn';

export interface InsightItem {
  id: string;
  kicker: string;
  title: string;
  body: string;
  accent?: 'gold' | 'danger' | 'success' | 'warn';
  onOpen?: () => void;
}

interface InsightsRailProps {
  items: InsightItem[];
}

const accentMap = {
  gold: 'text-[#F5D76E]',
  danger: 'text-[#FF5D6C]',
  success: 'text-[#40D9A2]',
  warn: 'text-[#FFB454]'
};

export const InsightsRail: React.FC<InsightsRailProps> = ({ items }) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ active: false, dragging: false, startX: 0, scroll: 0, pointerId: -1 });

  const scrollBy = (delta: number) => {
    trackRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <section className="space-y-3" aria-label="Featured insights">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] font-mono text-[#BFA15F]">Featured insights</p>
          <h3 className="font-display text-2xl text-[#F8F6F0]">What needs attention</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous insights"
            onClick={() => scrollBy(-280)}
            className="btn-secondary p-2 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4 text-[#D4AF37]" />
          </button>
          <button
            type="button"
            aria-label="Next insights"
            onClick={() => scrollBy(280)}
            className="btn-secondary p-2 rounded-lg"
          >
            <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
          </button>
        </div>
      </div>

      <div className="insights-rail">
        <div
          ref={trackRef}
          className="insights-rail-track flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory cursor-grab active:cursor-grabbing"
          data-native-cursor
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              scrollBy(280);
            }
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              scrollBy(-280);
            }
          }}
          onPointerDown={(event) => {
            const el = trackRef.current;
            if (!el || (event.pointerType === 'mouse' && event.button !== 0)) return;
            drag.current = {
              active: true,
              dragging: false,
              startX: event.clientX,
              scroll: el.scrollLeft,
              pointerId: event.pointerId
            };
            el.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current.active || !trackRef.current) return;
            const delta = event.clientX - drag.current.startX;
            if (Math.abs(delta) > 6) drag.current.dragging = true;
            if (drag.current.dragging) {
              trackRef.current.scrollLeft = drag.current.scroll - delta;
            }
          }}
          onPointerUp={(event) => {
            const el = trackRef.current;
            if (el && drag.current.pointerId === event.pointerId) {
              el.releasePointerCapture(event.pointerId);
            }
            drag.current.active = false;
          }}
          onPointerCancel={() => {
            drag.current.active = false;
            drag.current.dragging = false;
          }}
        >
          {items.map(item => (
            <GlassCard
              key={item.id}
              as="button"
              tilt={false}
              onClick={() => {
                if (drag.current.dragging) {
                  drag.current.dragging = false;
                  return;
                }
                item.onOpen?.();
              }}
              className="min-w-[260px] max-w-[280px] snap-start p-5 text-left"
            >
              <p className={cn('text-[10px] font-mono uppercase tracking-[0.22em] mb-2', accentMap[item.accent || 'gold'])}>
                {item.kicker}
              </p>
              <h4 className="text-sm font-semibold text-[#F8F6F0] mb-2">{item.title}</h4>
              <p className="text-xs text-[#B3B0A7] leading-relaxed">{item.body}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
};
