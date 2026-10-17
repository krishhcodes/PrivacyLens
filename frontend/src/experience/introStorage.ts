export const INTRO_SEEN_KEY = 'privacylens_intro_seen_session';
export const INTRO_PREF_KEY = 'privacylens_intro_pref';
export const INTRO_REPLAY_KEY = 'privacylens_intro_replay';

export type IntroPreference = 'session' | 'never';

export function getIntroPreference(): IntroPreference {
  try {
    const value = localStorage.getItem(INTRO_PREF_KEY);
    return value === 'never' ? 'never' : 'session';
  } catch {
    return 'session';
  }
}

export function setIntroPreference(pref: IntroPreference) {
  try {
    localStorage.setItem(INTRO_PREF_KEY, pref);
  } catch {
    /* private mode */
  }
}

export function shouldShowIntro(): boolean {
  try {
    if (sessionStorage.getItem(INTRO_REPLAY_KEY) === '1') {
      return true;
    }
    if (getIntroPreference() === 'never') {
      return false;
    }
    return sessionStorage.getItem(INTRO_SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

export function markIntroSeen() {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    sessionStorage.removeItem(INTRO_REPLAY_KEY);
  } catch {
    /* private mode */
  }
}

export function requestIntroReplay() {
  try {
    sessionStorage.removeItem(INTRO_SEEN_KEY);
    sessionStorage.setItem(INTRO_REPLAY_KEY, '1');
  } catch {
    /* private mode */
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
