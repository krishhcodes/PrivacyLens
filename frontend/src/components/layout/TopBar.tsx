import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Radar, AlertTriangle, RefreshCw, Menu, Sparkles, LogOut } from 'lucide-react';
import { authEnabled, useAuth } from '../../api/auth';
import { signOutEverywhere } from '../../services/accountService';
import { runFullAuditScan } from '../../services/scannerService';
import { useSites } from '../../services/siteStore';
import { useIntro } from '../../experience/IntroProvider';

interface TopBarProps {
  isSidebarCollapsed: boolean;
  onScanCompleted?: () => void;
  onOpenMobileNav?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isSidebarCollapsed,
  onScanCompleted,
  onOpenMobileNav
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { replayIntro } = useIntro();
  const { session } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState('');
  const [scanPercent, setScanPercent] = useState(0);

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/':
        return { title: 'Command Centre', subtitle: 'Privacy posture across your audited sites' };
      case '/scanner':
        return { title: 'Privacy Scanner', subtitle: 'Every site with a permission you allowed or blocked — updates as you browse' };
      case '/exposure':
        return { title: 'Exposure Map', subtitle: 'Future scope · preview with demo data' };
      case '/policy':
        return { title: 'Policy Analyzer', subtitle: 'Find risky sentences in a privacy policy' };
      case '/simulator':
        return { title: 'What-If Simulator', subtitle: 'Future scope · rough estimates only' };
      case '/reports':
        return { title: 'Privacy Report', subtitle: 'Printable summary of all audited sites' };
      case '/settings':
        return { title: 'Platform Settings', subtitle: authEnabled ? 'Account, backend connection and cinematic intro' : 'Backend connection and cinematic intro' };
      default:
        return { title: 'PrivacyLens', subtitle: 'Browser permission privacy' };
    }
  };

  const handleGlobalScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanPercent(10);
    setScanStage('Contacting the ConsentScope backend...');

    try {
      await runFullAuditScan((percent, stage) => {
        setScanPercent(percent);
        setScanStage(stage);
      });
      onScanCompleted?.();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        setScanStage('');
        setScanPercent(0);
      }, 500);
    }
  };

  const { title, subtitle } = getPageTitle(location.pathname);
  const { mode, sites: storedSites } = useSites();
  const highRiskCount = storedSites.filter(s => s.band === 'high' || s.band === 'elevated').length;

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-20 bg-[#07080B]/88 backdrop-blur-md border-b border-[#D4AF37]/16 transition-all duration-300 ease-in-out flex items-center justify-between px-4 md:px-6 ${
        isSidebarCollapsed ? 'lg:left-20' : 'lg:left-72'
      } left-0`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className="lg:hidden btn-secondary p-2 rounded-lg"
          aria-label="Open navigation"
          onClick={onOpenMobileNav}
        >
          <Menu className="w-4 h-4 text-[#D4AF37]" />
        </button>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-semibold font-display tracking-wide text-white truncate">
              {title}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#D4AF37]/10 text-[#F5D76E] border border-[#D4AF37]/25">
              {mode === 'offline' ? 'Demo data' : mode === 'loading' ? 'Connecting' : 'Live data'}
            </span>
          </div>
          <p className="text-xs text-[#8A8B95] hidden md:block truncate">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {authEnabled && session && (
          <button
            type="button"
            onClick={() => void signOutEverywhere()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-[#B3B0A7] hover:text-[#F5D76E] border border-transparent hover:border-[#D4AF37]/25"
            title={`Signed in as ${session.user.email ?? 'you'}. Sign out here and in the extension.`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline max-w-[160px] truncate">{session.user.email ?? 'Sign out'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={replayIntro}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-[#B3B0A7] hover:text-[#F5D76E] border border-transparent hover:border-[#D4AF37]/25"
          title="Replay cinematic intro"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Replay intro</span>
        </button>

        <button
          onClick={() => navigate('/scanner')}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/25 border border-red-500/30 text-xs hover:border-red-500/60 transition-colors"
          title="Sites with elevated or high risk"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-red-300 font-mono font-semibold">{highRiskCount}</span>
        </button>

        <button
          onClick={handleGlobalScan}
          disabled={isScanning}
          className={`relative overflow-hidden flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
            isScanning ? 'bg-[#1C180C] text-[#F5D76E] border border-[#D4AF37]' : 'btn-primary'
          }`}
        >
          <Radar className={`w-4 h-4 ${isScanning ? 'animate-spin text-[#D4AF37]' : ''}`} />
          <span className="hidden sm:inline">{isScanning ? 'Refreshing…' : 'Refresh data'}</span>
          {isScanning && (
            <span className="absolute bottom-0 left-0 h-1 bg-[#D4AF37]" style={{ width: `${scanPercent}%` }} />
          )}
        </button>
      </div>

      {isScanning && (
        <div className="absolute top-20 right-6 z-50 p-3 rounded-xl bg-[#0E0F16] border border-[#D4AF37]/40 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center gap-3">
          <RefreshCw className="w-4 h-4 text-[#D4AF37] animate-spin flex-shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-white">{scanStage}</span>
            <span className="text-[10px] text-[#A89874] font-mono">{scanPercent}% completed</span>
          </div>
        </div>
      )}
    </header>
  );
};
