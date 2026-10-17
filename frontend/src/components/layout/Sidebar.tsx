import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanEye,
  Network,
  ScrollText,
  Sliders,
  FileText,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { useSites } from '../../services/siteStore';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
  description: string;
  future?: boolean; // listed under "Future scope": preview only, not backed by the backend yet
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  mobileOpen = false,
  onMobileClose
}) => {
  const location = useLocation();
  const { mode, sites } = useSites();
  const mismatchCount = sites.reduce((n, s) => n + (s.assessment?.mismatches.length || 0), 0);

  const navItems: NavItem[] = [
    { name: 'Command Centre', path: '/', icon: LayoutDashboard, description: 'Global Privacy Posture' },
    {
      name: 'Privacy Scanner',
      path: '/scanner',
      icon: ScanEye,
      badge: mismatchCount > 0 ? mismatchCount : undefined,
      badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
      description: 'Sites, Permissions & Mismatches'
    },
    { name: 'Policy Analyzer', path: '/policy', icon: ScrollText, description: 'Policy Sentence Rules' },
    { name: 'Privacy Report', path: '/reports', icon: FileText, description: 'Printable Audit Summary' },
    { name: 'System Settings', path: '/settings', icon: Settings, description: 'Connection & Preferences' },
    { name: 'Exposure Map', path: '/exposure', icon: Network, description: 'Preview · Demo Data', future: true },
    { name: 'What-If Simulator', path: '/simulator', icon: Sliders, description: 'Preview · Estimates Only', future: true }
  ];

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 bottom-0 z-40 flex flex-col bg-[#07080B]/95 border-r border-[#D4AF37]/18 transition-all duration-300 ease-in-out',
        isCollapsed ? 'lg:w-20' : 'lg:w-72',
        mobileOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full lg:translate-x-0'
      )}
    >
      <div className="h-20 flex items-center justify-between px-5 border-b border-[#D4AF37]/15">
        <NavLink to="/" className="flex items-center gap-3 group" onClick={onMobileClose}>
          <div className="relative w-11 h-11 rounded-lg bg-gradient-to-br from-[#1A1812] to-[#0D0D0F] border border-[#D4AF37]/40 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.15)] group-hover:border-[#D4AF37] transition-all">
            <Shield className="w-6 h-6 text-[#D4AF37] group-hover:scale-105 transition-transform" />
          </div>
          {(!isCollapsed || mobileOpen) && (
            <div className="flex flex-col lg:flex">
              <span className="font-brand text-lg font-bold tracking-wider text-white">
                PRIVACY<span className="gold-gradient-text font-black">LENS</span>
              </span>
              <span className="text-[10px] tracking-widest text-[#A89874] uppercase font-mono">
                Cyber Intelligence
              </span>
            </div>
          )}
        </NavLink>

        <button
          onClick={onToggleCollapse}
          className="hidden lg:inline-flex p-1.5 rounded-lg text-[#888890] hover:text-[#D4AF37] hover:bg-[#14151C] transition-colors border border-transparent hover:border-[#D4AF37]/30"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mx-4 my-3 p-2.5 rounded-xl bg-gradient-to-r from-[#161208] via-[#100F14] to-[#161208] border border-[#D4AF37]/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#D4AF37]" />
            <span className="text-[11px] font-semibold text-[#F5D76E] uppercase tracking-wider font-mono">
              {mode === 'offline' ? 'Demo data' : 'Audited sites'}
            </span>
          </div>
          <p className="text-[11px] text-[#A0A0A8] leading-tight">
            {mode === 'offline' ? (
              <>Backend offline · sample target <span className="text-white font-mono font-medium">PocketCalc</span></>
            ) : (
              <><span className="text-white font-mono font-medium">{sites.length}</span> origins from the extension &amp; local scanner</>
            )}
          </p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {navItems.map((item, i) => {
          const isActive = location.pathname === item.path;
          const startsFuture = item.future && !navItems[i - 1]?.future;
          return (
            <React.Fragment key={item.path}>
            {startsFuture && (
              (!isCollapsed || mobileOpen) ? (
                <div className="pt-4 pb-1 px-3 text-[10px] font-mono uppercase tracking-widest text-[#786333]">
                  Future scope
                </div>
              ) : (
                <div className="my-3 mx-3 border-t border-[#D4AF37]/15" />
              )
            )}
            <NavLink
              to={item.path}
              title={isCollapsed ? item.name : undefined}
              onClick={onMobileClose}
              className={cn(
                'relative flex items-center gap-3.5 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-[#201A0C]/80 text-white'
                  : 'text-[#8E8F99] hover:text-white hover:bg-[#111219]'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#D4AF37]" />
              )}
              <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-[#D4AF37]' : 'group-hover:text-[#F5D76E]')} />
              {(!isCollapsed || mobileOpen) && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className={cn('text-sm tracking-tight truncate', isActive ? 'text-white font-semibold' : 'font-medium')}>
                      {item.name}
                    </span>
                    <span className="text-[10px] text-[#71717A] truncate">{item.description}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ml-1 flex-shrink-0 ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#D4AF37]/15 bg-[#090A0E]">
        {(!isCollapsed || mobileOpen) ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#888892]">ENGINE</span>
              <span className="text-[#40D9A2] flex items-center gap-1.5 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#40D9A2]" />
                {mode === 'live' ? 'BACKEND LIVE' : mode === 'offline' ? 'OFFLINE · DEMO' : 'CONNECTING'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#71717A]">
              <span>Sites tracked</span>
              <span className="text-[#D4AF37] font-mono">{sites.length}</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title={mode === 'live' ? 'Backend live' : 'Backend offline (demo data)'}>
            <span className="w-2.5 h-2.5 rounded-full bg-[#40D9A2] ring-4 ring-[#40D9A2]/20" />
          </div>
        )}
      </div>
    </aside>
  );
};
