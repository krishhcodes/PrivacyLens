import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { IntroProvider, useIntro } from './experience/IntroProvider';
import { VaultIntro } from './experience/VaultIntro';
import { TorchCursor } from './experience/TorchCursor';

import { OverviewPage } from './pages/OverviewPage';
import { ScannerPage } from './pages/ScannerPage';
import { ExposurePage } from './pages/ExposurePage';
import { PolicyPage } from './pages/PolicyPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ExtensionPage } from './pages/ExtensionPage';
import { SignInPage } from './pages/SignInPage';
import { authEnabled, useAuth } from './api/auth';
import { linkExtension } from './services/accountService';
import { loadSites, resetSites } from './services/siteStore';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};

// With accounts on, nothing but the sign-in page shows until you are signed in.
const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ready, session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!authEnabled) return;
    resetSites();
    if (!session) return;
    void loadSites();
    linkExtension(session).catch(e => console.warn('Could not link the extension:', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!authEnabled) return <>{children}</>;
  if (!ready) return <div className="min-h-screen bg-[#07080B]" />;
  return session ? <>{children}</> : <SignInPage />;
};

const AppFrame: React.FC = () => {
  const { showIntro, revealApp } = useIntro();

  return (
    <>
      <TorchCursor />
      {showIntro && <VaultIntro />}
      <div
        className={showIntro ? 'select-none' : revealApp ? 'app-reveal' : undefined}
        aria-hidden={showIntro || undefined}
        inert={showIntro ? true : undefined}
      >
        <AppShell>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/overview" element={<Navigate to="/" replace />} />
            <Route path="/scanner" element={<ScannerPage />} />
            <Route path="/exposure" element={<ExposurePage />} />
            <Route path="/policy" element={<PolicyPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/extension" element={<ExtensionPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </div>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <IntroProvider>
        <ScrollToTop />
        <AuthGate>
          <AppFrame />
        </AuthGate>
      </IntroProvider>
    </BrowserRouter>
  );
};

export default App;
