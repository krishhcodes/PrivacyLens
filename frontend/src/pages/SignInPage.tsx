import React, { useState } from 'react';
import { Lock, Mail, CheckCircle2 } from 'lucide-react';
import { signInWithEmail, signInWithGoogle } from '../api/auth';

export const SignInPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#07080B] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#0A0B10] p-8 rounded-3xl border border-[#D4AF37]/25 space-y-6 shadow-[0_10px_40px_rgba(0,0,0,0.7)]">
        <div className="space-y-2 text-center">
          <Lock className="w-8 h-8 text-[#D4AF37] mx-auto" />
          <h1 className="text-2xl font-bold font-['Cinzel',serif] text-white">PrivacyLens</h1>
          <p className="text-xs text-[#8E8F99]">Sign in to see the sites you audited. Your data is only visible to you.</p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => run(signInWithGoogle)}
          className="btn-primary w-full px-4 py-3 rounded-xl text-sm font-semibold"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-[10px] font-mono text-[#71717A]">
          <span className="flex-1 h-px bg-white/10" />or<span className="flex-1 h-px bg-white/10" />
        </div>

        {sent ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Check {email} for a sign-in link. Open it in this browser.</span>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={e => { e.preventDefault(); run(async () => { await signInWithEmail(email); setSent(true); }); }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#D4AF37]/60"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm font-mono flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4 text-[#D4AF37]" />
              Email me a sign-in link
            </button>
          </form>
        )}

        {error && <div className="text-red-300 text-xs">{error}</div>}
      </div>
    </div>
  );
};
