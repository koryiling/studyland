'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Search, Link2, KeyRound, MailCheck, Copy, ShieldCheck, AlertCircle, RefreshCw, Activity } from 'lucide-react';
import { useFormat, useI18n } from '@/lib/i18n';
import { LanguagePicker } from '@/components/ui/LanguagePicker';

interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  mustChangePassword: boolean;
  isAdmin: boolean;
}

type Result =
  | { kind: 'link'; email: string; value: string }
  | { kind: 'password'; email: string; value: string }
  | { kind: 'info'; email: string; value: string };

const NO_ACCESS = '__no_access';
const LOAD_FAILED = '__load_failed';

export default function AdminPage() {
  const { t } = useI18n();
  const fmt = useFormat();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        // Translated when shown, so the effect doesn't depend on the language
        if (!res.ok) throw new Error(res.status === 403 ? NO_ACCESS : data.error || LOAD_FAILED);
        setUsers(data.users);
        setError('');
      })
      .catch((err: Error) => setError(err.message));
  }, [reloadKey]);

  const runAction = async (user: AdminUser, action: 'reset-link' | 'temp-password' | 'confirm-email') => {
    if (action === 'temp-password' && !confirm(t('adm.confirmTemp', { email: user.email }))) return;
    setBusyId(user.id);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const codes: Record<string, string> = { not_found: t('adm.err.notFound'), link_failed: t('adm.err.link'), self_temp_password: t('adm.err.self') };
        throw new Error(codes[data.error] || data.error || t('adm.actionFailed'));
      }
      if (action === 'reset-link') setResult({ kind: 'link', email: user.email, value: data.link });
      else if (action === 'temp-password') setResult({ kind: 'password', email: user.email, value: data.tempPassword });
      else setResult({ kind: 'info', email: user.email, value: t('adm.confirmed') });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setResult({ kind: 'info', email: user.email, value: t('adm.failed', { error: (err as Error).message }) });
    } finally {
      setBusyId(null);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const filtered = (users || []).filter((u) => u.email.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <main className="min-h-screen bg-[#F4F9F5] text-[#1C2B22]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-2xl bg-white border border-[#E2EFE7] hover:bg-[#EBF5F0]" title={t('adm.back')}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#2F8F5B]" /> {t('adm.title')}
              </h1>
              <p className="text-xs text-[#8A9E92]">{t('adm.sub')}</p>
            </div>
          </div>
          <button onClick={() => setReloadKey((k) => k + 1)} className="p-2 rounded-2xl bg-white border border-[#E2EFE7] hover:bg-[#EBF5F0]" title={t('adm.refresh')}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error === NO_ACCESS ? t('adm.noAccess') : error === LOAD_FAILED ? t('adm.loadFailed') : error}</span>
          </div>
        )}

        <LanguagePicker compact />

        {!error && <AIHealthCard />}

        {result && (
          <div className="p-4 rounded-2xl bg-white border-2 border-[#2F8F5B] space-y-2">
            <div className="text-xs font-bold text-[#2F8F5B]">{result.email}</div>
            {result.kind === 'info' ? (
              <p className="text-sm">{result.value}</p>
            ) : (
              <>
                <p className="text-xs text-[#607367]">
                  {result.kind === 'link'
                    ? t('adm.linkHint')
                    : t('adm.tempHint')}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 p-2.5 rounded-xl bg-[#F4F9F5] border border-[#E2EFE7] text-xs break-all">{result.value}</code>
                  <button onClick={() => copy(result.value)} className="px-3 py-2 rounded-xl bg-[#2F8F5B] text-white text-xs font-bold flex items-center gap-1 flex-shrink-0">
                    <Copy className="w-3.5 h-3.5" /> {copied ? t('adm.copied') : t('adm.copy')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="relative">
          <Search className="w-4 h-4 text-[#8A9E92] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('adm.search')}
            className="w-full pl-10 p-3 rounded-2xl bg-white border border-[#E2EFE7] text-sm focus:outline-none focus:border-[#2F8F5B]"
          />
        </div>

        {!users && !error && (
          <div className="py-16 flex justify-center text-[#8A9E92]"><Loader2 className="w-6 h-6 animate-spin" /></div>
        )}

        {users && (
          <div className="space-y-2.5">
            <p className="text-xs text-[#8A9E92]">{query ? t('adm.countFiltered', { n: users.length, m: filtered.length }) : t('adm.count', { n: users.length })}</p>
            {filtered.map((u) => (
              <div key={u.id} className="p-4 rounded-2xl bg-white border border-[#E2EFE7] space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold break-all">{u.email}</span>
                  {u.isAdmin && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#2F8F5B]">{t('adm.badgeAdmin')}</span>}
                  {!u.emailConfirmed && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{t('adm.badgeUnverified')}</span>}
                  {u.mustChangePassword && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">{t('adm.badgeTemp')}</span>}
                </div>
                <div className="text-[11px] text-[#8A9E92]">
                  {t('adm.joined', { when: fmt.relative(u.createdAt), last: u.lastSignInAt ? fmt.relative(u.lastSignInAt) : t('adm.never') })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busyId === u.id}
                    onClick={() => runAction(u, 'reset-link')}
                    className="px-3 py-1.5 rounded-xl bg-[#EBF5F0] text-[#2F8F5B] text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                  >
                    <Link2 className="w-3.5 h-3.5" /> {t('adm.resetLink')}
                  </button>
                  {!u.isAdmin && (
                    <button
                      disabled={busyId === u.id}
                      onClick={() => runAction(u, 'temp-password')}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#E2EFE7] text-[#1C2B22] text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> {t('adm.tempPassword')}
                    </button>
                  )}
                  {!u.emailConfirmed && (
                    <button
                      disabled={busyId === u.id}
                      onClick={() => runAction(u, 'confirm-email')}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#E2EFE7] text-[#1C2B22] text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      <MailCheck className="w-3.5 h-3.5" /> {t('adm.verify')}
                    </button>
                  )}
                  {busyId === u.id && <Loader2 className="w-4 h-4 animate-spin text-[#8A9E92] self-center" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

interface ModelHealth {
  role: 'main' | 'backup' | 'groq';
  model: string;
  configured: boolean;
  ok: boolean;
  ms: number;
  detail?: string;
}

// Pings each built-in AI once, so the owner can see which one is slow or down right now
function AIHealthCard() {
  const { t } = useI18n();
  const [state, setState] = useState<{ status: 'idle' | 'checking' | 'done' | 'error'; models?: ModelHealth[]; message?: string }>({ status: 'idle' });

  const check = async () => {
    setState({ status: 'checking' });
    try {
      const res = await fetch('/api/admin/ai-health');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 403 ? t('adm.noAccess') : t('adm.checkFailed'));
      setState({ status: 'done', models: data.models });
    } catch (err) {
      setState({ status: 'error', message: (err as Error).message });
    }
  };

  return (
    <section className="p-4 rounded-2xl bg-white border border-[#E2EFE7] space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold flex items-center gap-1.5"><Activity className="w-4 h-4 text-[#2F8F5B]" /> {t('adm.health')}</h2>
          <p className="text-[11px] text-[#8A9E92]">{t('adm.healthSub')}</p>
        </div>
        <button
          onClick={check}
          disabled={state.status === 'checking'}
          className="px-3 py-2 rounded-xl bg-[#2F8F5B] hover:bg-[#26774B] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 flex-shrink-0"
        >
          {state.status === 'checking' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
          {state.status === 'checking' ? t('adm.checking') : t('adm.check')}
        </button>
      </div>
      {state.status === 'error' && <p className="text-xs text-rose-700">{state.message}</p>}
      {state.models?.map((m) => (
        <div key={m.role} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#F4F9F5] text-xs">
          <div className="min-w-0">
            <div className="font-bold">{t(m.role === 'main' ? 'adm.role.main' : m.role === 'backup' ? 'adm.role.backup' : 'adm.role.groq')}</div>
            <div className="text-[11px] text-[#8A9E92] font-mono truncate">{m.model}</div>
            {m.detail && <div className="text-[11px] text-rose-700 mt-0.5">{m.detail}</div>}
          </div>
          <span
            className={`flex-shrink-0 font-bold px-2.5 py-1 rounded-full ${
              !m.configured ? 'bg-slate-100 text-slate-500' : !m.ok ? 'bg-rose-100 text-rose-700' : m.ms > 15_000 ? 'bg-amber-100 text-amber-800' : 'bg-[#EBF5F0] text-[#2F8F5B]'
            }`}
          >
            {!m.configured ? t('adm.notSet') : !m.ok ? t('adm.down') : t(m.ms > 15_000 ? 'adm.slow' : 'adm.ok', { s: (m.ms / 1000).toFixed(1) })}
          </span>
        </div>
      ))}
    </section>
  );
}
