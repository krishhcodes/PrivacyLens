import React, { useRef } from 'react';
import { cn } from '../lib/cn';

interface GlassCardProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'article' | 'section' | 'button';
  tilt?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  as = 'div',
  tilt = true,
  className,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const Tag: any = as;

  const handleMove = (event: React.PointerEvent<any>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    el.style.setProperty('--pointer-x', `${x}px`);
    el.style.setProperty('--pointer-y', `${y}px`);
    const allowTilt =
      tilt &&
      event.pointerType !== 'touch' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (allowTilt) {
      const tx = ((x / rect.width) - 0.5) * 5;
      const ty = ((y / rect.height) - 0.5) * -5;
      el.style.setProperty('--tilt-x', `${ty}deg`);
      el.style.setProperty('--tilt-y', `${tx}deg`);
    }
    onPointerMove?.(event);
  };

  const handleLeave = (event: React.PointerEvent<any>) => {
    const el = ref.current;
    if (el) {
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
    }
    onPointerLeave?.(event);
  };

  return (
    <Tag
      ref={ref as never}
      className={cn('glass-card rounded-2xl', className)}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      {...props}
    >
      {children}
    </Tag>
  );
};
