import React, { useEffect, useRef } from 'react';

const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], input, select, textarea, .glass-card, .vault-lock-hotspot, [data-torch]';

export const TorchCursor: React.FC = () => {
  const enabledRef = useRef(false);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const interactiveRef = useRef(false);

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const layer = layerRef.current;
    let frame = 0;

    const setEnabled = (next: boolean) => {
      enabledRef.current = next;
      document.documentElement.classList.toggle('torch-on', next);
      if (layer) layer.hidden = !next;
    };

    const syncEnabled = () => {
      setEnabled(!coarse.matches && !reduced.matches);
    };

    const onMove = (event: PointerEvent) => {
      if (!enabledRef.current) return;
      targetRef.current.x = event.clientX;
      targetRef.current.y = event.clientY;
      const target = event.target as HTMLElement | null;
      const isInteractive = Boolean(target?.closest(INTERACTIVE_SELECTOR));
      if (isInteractive !== interactiveRef.current) {
        interactiveRef.current = isInteractive;
        pointerRef.current?.classList.toggle('is-interactive', isInteractive);
        ringRef.current?.classList.toggle('is-interactive', isInteractive);
        document.documentElement.style.setProperty(
          '--torch-intensity',
          isInteractive ? '0.32' : '0.2'
        );
      }
    };

    const loop = () => {
      if (enabledRef.current) {
        const current = currentRef.current;
        const target = targetRef.current;
        current.x += (target.x - current.x) * 0.18;
        current.y += (target.y - current.y) * 0.18;
        const root = document.documentElement;
        root.style.setProperty('--torch-x', `${current.x}px`);
        root.style.setProperty('--torch-y', `${current.y}px`);
      }
      frame = requestAnimationFrame(loop);
    };

    targetRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 3 };
    currentRef.current = { ...targetRef.current };
    syncEnabled();
    coarse.addEventListener('change', syncEnabled);
    reduced.addEventListener('change', syncEnabled);
    window.addEventListener('pointermove', onMove, { passive: true });
    frame = requestAnimationFrame(loop);

    return () => {
      coarse.removeEventListener('change', syncEnabled);
      reduced.removeEventListener('change', syncEnabled);
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
      document.documentElement.classList.remove('torch-on');
    };
  }, []);

  return (
    <div ref={layerRef} className="torch-layer no-print" aria-hidden="true" hidden>
      <div className="torch-field" />
      <div ref={ringRef} className="torch-ring" />
      <div ref={pointerRef} className="torch-pointer" />
    </div>
  );
};
