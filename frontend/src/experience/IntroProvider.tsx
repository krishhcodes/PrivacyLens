import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  markIntroSeen,
  requestIntroReplay,
  shouldShowIntro
} from './introStorage';

interface IntroContextValue {
  showIntro: boolean;
  revealApp: boolean;
  completeIntro: (opts?: { skip?: boolean }) => void;
  replayIntro: () => void;
}

const IntroContext = createContext<IntroContextValue | null>(null);

export const IntroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showIntro, setShowIntro] = useState(() => shouldShowIntro());
  const [revealApp, setRevealApp] = useState(() => !shouldShowIntro());

  const completeIntro = useCallback((opts?: { skip?: boolean }) => {
    markIntroSeen();
    setShowIntro(false);
    setRevealApp(true);
    document.documentElement.classList.toggle('app-settling', !opts?.skip);
    window.setTimeout(() => {
      document.documentElement.classList.remove('app-settling');
    }, 900);
  }, []);

  const replayIntro = useCallback(() => {
    requestIntroReplay();
    setRevealApp(false);
    setShowIntro(true);
  }, []);

  const value = useMemo(
    () => ({ showIntro, revealApp, completeIntro, replayIntro }),
    [showIntro, revealApp, completeIntro, replayIntro]
  );

  return <IntroContext.Provider value={value}>{children}</IntroContext.Provider>;
};

export function useIntro() {
  const ctx = useContext(IntroContext);
  if (!ctx) {
    throw new Error('useIntro must be used within IntroProvider');
  }
  return ctx;
}
