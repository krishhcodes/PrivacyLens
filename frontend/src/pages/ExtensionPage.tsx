import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Puzzle, Download, CheckCircle2, AlertTriangle, History } from 'lucide-react';
import { getExtensionLink } from '../api/extension';

const ZIP = '/consentscope-extension.zip';
const SCANNER = '/consentscope-scan.py';

const code = (t: string) => <code className="text-[#F5D76E]">{t}</code>;

const scannerSteps: { title: string; body: React.ReactNode }[] = [
  { title: 'Install Python 3', body: <>Get it from {code('python.org/downloads')}. On Windows, tick <strong className="text-white">Add python.exe to PATH</strong> on the first screen of the installer.</> },
  { title: 'Download the scanner', body: <>Click <strong className="text-white">Download scanner</strong>. It saves {code('scan.py')}, usually in your Downloads folder.</> },
  { title: 'Get your command', body: <>Open <Link to="/settings" className="text-[#F5D76E] hover:underline">System Settings → Account</Link>, click <strong className="text-white">Create scanner token</strong> and then <strong className="text-white">Copy command</strong>.</> },
  { title: 'Run it', body: <>Open a terminal in the folder with {code('scan.py')} (on Windows: open the Downloads folder, type {code('cmd')} in its address bar and press Enter). Paste the command and press Enter. If Windows says python was not found, change {code('python')} at the start to {code('py')}.</> },
  { title: 'See your sites', body: <>The scanner reads the permissions Chrome, Edge and Brave saved for every site on this computer and sends them to your account. Reload the website to see them. Run it again any time to refresh.</> },
];

const steps: { title: string; body: React.ReactNode }[] = [
  { title: 'Download and unzip', body: <>Click <strong className="text-white">Download extension</strong> above, then unzip the file. You get a folder named <code className="text-[#F5D76E]">consentscope-extension</code>.</> },
  { title: 'Open the extensions page', body: <>In Chrome (or Edge or Brave), type <code className="text-[#F5D76E]">chrome://extensions</code> in the address bar and press Enter.</> },
  { title: 'Turn on Developer mode', body: <>Use the <strong className="text-white">Developer mode</strong> switch in the top-right corner.</> },
  { title: 'Load the folder', body: <>Click <strong className="text-white">Load unpacked</strong> and pick the unzipped <code className="text-[#F5D76E]">consentscope-extension</code> folder. Keep the folder where it is; Chrome loads it from there.</> },
  { title: 'Come back here', body: <>Reload this page while signed in. The extension links to your account by itself, and Settings → Account shows <strong className="text-white">Linked to this account</strong>.</> },
];

const StepList: React.FC<{ items: { title: string; body: React.ReactNode }[] }> = ({ items }) => (
  <ol className="space-y-4">
    {items.map((s, i) => (
      <li key={s.title} className="flex gap-4">
        <span className="w-7 h-7 rounded-full border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-mono flex items-center justify-center flex-shrink-0">
          {i + 1}
        </span>
        <div className="space-y-1">
          <div className="text-sm text-white font-semibold">{s.title}</div>
          <p className="text-xs text-[#A89874] leading-relaxed">{s.body}</p>
        </div>
      </li>
    ))}
  </ol>
);

export const ExtensionPage: React.FC = () => {
  const [installed, setInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    getExtensionLink().then(link => setInstalled(Boolean(link))).catch(() => setInstalled(false));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="bg-[#0A0B10] p-6 rounded-3xl border border-[#D4AF37]/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-[#D4AF37]" />
            <h1 className="text-xl font-bold font-['Cinzel',serif] text-white">Browser Extension</h1>
          </div>
          <p className="text-xs text-[#8E8F99] max-w-xl">
            The ConsentScope extension reads what each site can access in your browser and sends it here. Install it once per browser.
          </p>
        </div>
        <a
          href={ZIP}
          download
          className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download extension</span>
        </a>
      </div>

      {installed !== null && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${installed
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          : 'bg-[#1A1408] border-amber-500/40 text-[#E8D9B0]'}`}
        >
          {installed
            ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            : <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />}
          <span>{installed
            ? 'The extension is installed in this browser.'
            : 'The extension is not installed in this browser yet. Follow the steps below.'}</span>
        </div>
      )}

      <div className="bg-[#0B0C12] rounded-3xl border border-[#D4AF37]/25 p-6 space-y-5">
        <h2 className="text-sm font-bold text-white font-['Cinzel',serif] border-b border-white/5 pb-3">How to install</h2>
        <StepList items={steps} />
        <p className="text-[11px] text-[#71717A] leading-relaxed pt-2 border-t border-white/5">
          The extension records a site when you visit it after installing. For permissions you gave before that, use the scanner below.
          Chrome may show a "Developer mode extensions" notice when it starts. That is normal for extensions installed this way.
          To update, download the new zip, replace the folder, and click the reload icon on the extension card.
        </p>
      </div>

      <div className="bg-[#0B0C12] rounded-3xl border border-[#D4AF37]/25 p-6 space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#D4AF37]" />
              <h2 className="text-sm font-bold text-white font-['Cinzel',serif]">Import past permissions</h2>
            </div>
            <p className="text-xs text-[#8E8F99] max-w-xl">
              Optional. The scanner adds every site you already gave permissions to, in one go. It only reads your browser settings and never changes them.
            </p>
          </div>
          <a
            href={SCANNER}
            download="scan.py"
            className="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Download scanner</span>
          </a>
        </div>
        <StepList items={scannerSteps} />
      </div>
    </div>
  );
};
