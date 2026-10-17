import React, { useEffect, useState } from 'react';
import { UserRound, KeyRound, Trash2, Copy, CheckCircle2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '../../api/auth';
import * as api from '../../api/client';
import { getExtensionLink } from '../../api/extension';
import { linkExtension } from '../../services/accountService';
import { loadSites, resetSites } from '../../services/siteStore';

/** Settings → Account: who is signed in, the extension link, scanner tokens, delete my data. */
export const AccountCard: React.FC = () => {
  const { session } = useAuth();
  const [tokens, setTokens] = useState<api.DeviceToken[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [extension, setExtension] = useState<'checking' | 'linked' | 'not-linked' | 'missing'>('checking');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setTokens((await api.listDeviceTokens()).tokens);
      const link = await getExtensionLink();
      setExtension(!link ? 'missing' : link.linked && link.userId === session?.user.id ? 'linked' : 'not-linked');
    } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const act = async (fn: () => Promise<void>) => {
    setError(null);
    setMessage(null);
    try { await fn(); await refresh(); } catch (e) { setError((e as Error).message); }
  };

  const scannerCommand = newToken ? `python scan.py --api ${api.API_BASE} --token ${newToken}` : '';

  return (
    <div className="bg-[#0B0C12] rounded-3xl border border-[#D4AF37]/25 p-6 space-y-5">
      <div className="flex items-center gap-3 border-b border-white/5 pb-3">
        <UserRound className="w-5 h-5 text-[#D4AF37]" />
        <div>
          <h2 className="text-sm font-bold text-white font-['Cinzel',serif]">Account</h2>
          <p className="text-xs text-[#8E8F99]">Signed in as {session?.user.email ?? 'unknown'}. Only you can see your sites.</p>
        </div>
      </div>

      <div className="space-y-1.5 text-xs font-mono">
        <div className="flex justify-between items-center gap-2">
          <span className="text-[#8E8F99]">Extension:</span>
          {extension === 'linked' && <span className="text-[#40D9A2]">Linked to this account</span>}
          {extension === 'missing' && <span className="text-amber-400">Not installed in this browser</span>}
          {extension === 'checking' && <span className="text-white">Checking…</span>}
          {extension === 'not-linked' && (
            <button className="text-[#F5D76E] hover:underline" onClick={() => act(async () => { if (session) await linkExtension(session); })}>
              Link now
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-white font-semibold">
          <KeyRound className="w-4 h-4 text-[#D4AF37]" /> Device tokens
        </div>
        <p className="text-[11px] text-[#A89874] leading-relaxed">
          The extension gets its token automatically. Create one for the scanner, then run the command it shows on your computer. The token is shown only once.
        </p>
        {tokens.length > 0 && (
          <ul className="space-y-1.5 text-[11px] font-mono">
            {tokens.map(t => (
              <li key={t.id} className="flex justify-between items-center gap-2 text-[#C8C8D4]">
                <span className="truncate">{t.label} · {t.last_used_at ? `used ${new Date(t.last_used_at).toLocaleString()}` : 'never used'}</span>
                <button className="text-red-300 hover:underline" onClick={() => act(async () => { await api.revokeDeviceToken(t.id); })}>
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
        {newToken && (
          <div className="p-3 bg-black/50 rounded-xl border border-white/5 font-mono text-[11px] text-white break-all space-y-2">
            <div>{scannerCommand}</div>
            <button
              className="inline-flex items-center gap-1.5 text-[#F5D76E] hover:underline"
              onClick={() => { void navigator.clipboard.writeText(scannerCommand); setCopied(true); }}
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy command'}
            </button>
          </div>
        )}
        <button
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-mono flex items-center gap-2 transition-colors"
          onClick={() => act(async () => { setCopied(false); setNewToken((await api.createDeviceToken('Scanner')).token); })}
        >
          <KeyRound className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Create scanner token</span>
        </button>
      </div>

      <div className="pt-2 border-t border-white/5 space-y-2">
        <p className="text-[11px] text-[#A89874] leading-relaxed">
          Deleting your data removes every site, permission record, action and policy finding stored for this account, and signs out the extension and scanner.
        </p>
        <button
          onClick={() => setDeleteOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/40 text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
          <span>Delete my data</span>
        </button>
      </div>

      {message && <div className="text-emerald-300 text-[11px]">{message}</div>}
      {error && <div className="text-red-300 text-[11px]">{error}</div>}

      <ConfirmModal
        isOpen={deleteOpen}
        title="Delete all your data?"
        message="Every audited site and its history is removed from the backend for good, and the extension and scanner tokens stop working. This can't be undone."
        confirmText="Delete my data"
        cancelText="Keep my data"
        severity="danger"
        onConfirm={() => {
          setDeleteOpen(false);
          void act(async () => {
            const { deleted } = await api.deleteMyData();
            setNewToken(null);
            resetSites();
            await loadSites();
            setMessage(`Deleted ${deleted} site${deleted === 1 ? '' : 's'} and all device tokens.`);
          });
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
};
