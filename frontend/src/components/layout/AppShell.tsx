import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { GoldParticles } from '../common/GoldParticles';
import { DataModeBanner } from '../common/DataModeBanner';
import { useSites } from '../../services/siteStore';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { mode } = useSites();

  const handleScanCompleted = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#08090C] text-[#F8F6F0] selection:bg-[#D4AF37]/30 selection:text-[#F5D76E] overflow-x-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="fixed inset-0 pointer-events-none z-0 no-print">
        <GoldParticles particleCount={28} maxDistance={90} />
      </div>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-[#D4AF37]/[0.05] via-transparent to-transparent pointer-events-none z-0" />
      <div className="gold-streak no-print absolute top-[30%] left-0 w-1/2 h-px pointer-events-none opacity-40" />

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/55 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <TopBar
        isSidebarCollapsed={isSidebarCollapsed}
        onScanCompleted={handleScanCompleted}
        onOpenMobileNav={() => setMobileOpen(true)}
      />

      <main
        key={refreshKey}
        className={`relative z-10 pt-20 transition-all duration-300 ease-in-out min-h-screen flex flex-col app-reveal ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-8">
          <DataModeBanner />
          {children}
        </div>

        <footer className="py-6 px-8 border-t border-[#D4AF37]/10 text-center text-xs text-[#77736A] flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl w-full mx-auto">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
            <span className="font-brand text-[#C5A059] font-semibold">PRIVACYLENS</span>
            <span>&mdash; Local privacy intelligence for your browser permissions</span>
          </div>
          <div className="font-mono text-[11px] text-[#8A8B95]">
            {mode === 'offline' ? 'Backend offline · Demo data shown' : 'Data from the ConsentScope backend · Exposure map is demo data'}
          </div>
        </footer>
      </main>
    </div>
  );
};
