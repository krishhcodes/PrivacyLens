import React, { useState } from 'react';
import { 
  Settings, 
  RotateCcw, 
  Database, 
  Server, 
  Download, 
  CheckCircle2, 
  Terminal,
  Sparkles
} from 'lucide-react';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { loadSites, useSites } from '../services/siteStore';
import { API_BASE } from '../api/client';
import { useIntro } from '../experience/IntroProvider';
import { getIntroPreference, setIntroPreference } from '../experience/introStorage';

export const SettingsPage: React.FC = () => {
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const { mode, sites, loadedAt, error } = useSites();
  const [refreshing, setRefreshing] = useState(false);
  const { replayIntro } = useIntro();
  const [introPref, setIntroPref] = useState(() => getIntroPreference());

  const handleFactoryReset = () => {
    try {
      // Browser-only preferences. Backend data is never deleted from the website.
      ['privacylens_intro_pref', 'privacylens_sites_state_v1', 'privacylens_recommendations_v1', 'privacylens_drift_snapshots']
        .forEach(k => localStorage.removeItem(k));

      setResetSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e) {
      console.error(e);
    } finally {
      setResetModalOpen(false);
    }
  };

  const handleExportState = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      source: mode === 'live' ? API_BASE : 'demo data (backend offline)',
      sites
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `privacylens-sites-${mode === 'live' ? 'backend' : 'demo'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-[#0A0B10] p-6 rounded-3xl border border-[#D4AF37]/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#D4AF37]" />
            <h1 className="text-xl font-bold font-['Cinzel',serif] text-white">
              Platform Settings
            </h1>
          </div>
          <p className="text-xs text-[#8E8F99] max-w-xl">
            Check the backend connection, export the loaded site data, and manage browser-only preferences.
          </p>
        </div>

        {resetSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Local preferences cleared. Reloading...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reset & Persistence Card */}
        <div className="bg-[#0B0C12] rounded-3xl border border-[#D4AF37]/25 p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <Database className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <h2 className="text-sm font-bold text-white font-['Cinzel',serif]">
                Local Preferences
              </h2>
              <p className="text-xs text-[#8E8F99]">
                Audit data lives in the backend; this browser only keeps preferences.
              </p>
            </div>
          </div>

          <p className="text-xs text-[#A89874] leading-relaxed">
            Resetting clears preferences saved in this browser, such as the intro setting. It never deletes audit data in the backend.
          </p>

          <div className="pt-2">
            <button
              onClick={() => setResetModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/40 text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
            >
              <RotateCcw className="w-4 h-4 text-red-400" />
              <span>Reset Local Preferences</span>
            </button>
          </div>
        </div>

        {/* Demo Simulation Controls */}
        <div className="bg-[#0B0C12] rounded-3xl border border-[#D4AF37]/25 p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <Server className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <h2 className="text-sm font-bold text-white font-['Cinzel',serif]">
                Backend Connection
              </h2>
              <p className="text-xs text-[#8E8F99]">
                ConsentScope API used by every page except the exposure map.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[#8E8F99]">API base:</span>
                <span className="text-[#F5D76E]">{API_BASE}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E8F99]">Status:</span>
                <span className={mode === 'live' ? 'text-[#40D9A2]' : 'text-amber-400'}>
                  {mode === 'live' ? 'Live' : mode === 'offline' ? 'Offline (demo data shown)' : 'Connecting…'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E8F99]">Sites loaded:</span>
                <span className="text-white">{sites.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E8F99]">Last refresh:</span>
                <span className="text-white">{loadedAt ? new Date(loadedAt).toLocaleTimeString() : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E8F99]">Google Safe Browsing:</span>
                <span className="text-white">
                  {sites.some(s => s.safety && ['safe', 'unsafe', 'error'].includes(s.safety.status)) ? 'On' : 'Off (no API key)'}
                </span>
              </div>
              <div className="text-[10px] text-[#71717A] leading-relaxed">
                When on, the backend sends each audited site's address (domain only) to Google to check it. Set GOOGLE_SAFE_BROWSING_API_KEY in backend\.env.
              </div>
              {error && <div className="text-red-300 text-[11px] pt-1">{error}</div>}
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                onClick={async () => { setRefreshing(true); await loadSites(); setRefreshing(false); }}
                disabled={refreshing}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-mono flex items-center gap-2 transition-colors"
              >
                <RotateCcw className={`w-3.5 h-3.5 text-[#D4AF37] ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
              </button>
              <button
                onClick={handleExportState}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-mono flex items-center gap-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Export Sites JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0B0C12] rounded-2xl border border-[#D4AF37]/25 p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-white/5 pb-3">
          <Sparkles className="w-5 h-5 text-[#D4AF37]" />
          <div>
            <h2 className="text-sm font-bold text-white font-['Cinzel',serif]">Cinematic vault intro</h2>
            <p className="text-xs text-[#8E8F99]">Replay the golden lock sequence or skip it on future visits this session.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={replayIntro} className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Replay intro
          </button>
          <label className="inline-flex items-center gap-2 text-xs text-[#B3B0A7] font-mono">
            <input
              type="checkbox"
              checked={introPref === 'never'}
              onChange={event => {
                const next = event.target.checked ? 'never' : 'session';
                setIntroPref(next);
                setIntroPreference(next);
              }}
            />
            Skip intro on future visits
          </label>
        </div>
      </div>

      {/* Chrome Extension MV3 Integration Architecture Notes */}
      <div className="bg-[#0B0C12] rounded-3xl border border-white/10 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#40D9A2]" />
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
            How the pieces fit
          </h3>
        </div>

        <p className="text-xs text-[#8E8F99] leading-relaxed">
          The ConsentScope extension (<code className="text-[#F5D76E]">extension/</code>) and the local scanner (<code className="text-[#F5D76E]">scanner/scan.py</code>) read your browser's site settings and send them to the backend.
          This website reads everything from the backend through <code className="text-[#F5D76E]">src/api/client.ts</code>. Block, Ask and Undo buttons ask the extension (through its <code className="text-[#F5D76E]">bridge.js</code>) to change the real Chrome setting with <code className="text-white">chrome.contentSettings</code>; the extension then records the change in the backend.
        </p>

        <div className="p-3 bg-black/50 rounded-xl border border-white/5 font-mono text-[11px] text-[#A89874] space-y-1">
          <div>// What the extension calls to block a permission:</div>
          <div className="text-white">chrome.contentSettings.location.set(&#123; primaryPattern: origin + "/*", setting: "block" &#125;);</div>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      <ConfirmModal
        isOpen={resetModalOpen}
        title="Reset Local Preferences?"
        message="This clears preferences stored in this browser (such as the intro setting) and reloads the page. Audit data in the backend is not affected."
        confirmText="Reset Preferences"
        cancelText="Keep Preferences"
        severity="danger"
        onConfirm={handleFactoryReset}
        onCancel={() => setResetModalOpen(false)}
      />
    </div>
  );
};
