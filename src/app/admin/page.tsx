'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Search, Link2, KeyRound, MailCheck, Copy, ShieldCheck, AlertCircle, RefreshCw, Activity } from 'lucide-react';
import { formatRelative } from '@/lib/dates';

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

export default function AdminPage() {
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
        if (!res.ok) throw new Error(res.status === 403 ? '你没有管理员权限。请用管理员账号登录 Studyland 后再打开这个页面。' : data.error || '读取失败');
        setUsers(data.users);
        setError('');
      })
      .catch((err: Error) => setError(err.message));
  }, [reloadKey]);

  const runAction = async (user: AdminUser, action: 'reset-link' | 'temp-password' | 'confirm-email') => {
    if (action === 'temp-password' && !confirm(`确定要为 ${user.email} 设置临时密码吗？对方原来的密码会失效。`)) return;
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
      if (!res.ok) throw new Error(data.error || '操作失败');
      if (action === 'reset-link') setResult({ kind: 'link', email: user.email, value: data.link });
      else if (action === 'temp-password') setResult({ kind: 'password', email: user.email, value: data.tempPassword });
      else setResult({ kind: 'info', email: user.email, value: 'Email 已标记为已验证，对方现在可以登录了。' });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setResult({ kind: 'info', email: user.email, value: `失败：${(err as Error).message}` });
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
            <Link href="/" className="p-2 rounded-2xl bg-white border border-[#E2EFE7] hover:bg-[#EBF5F0]" title="Back to app">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#2F8F5B]" /> 管理后台
              </h1>
              <p className="text-xs text-[#8A9E92]">管理 Studyland 用户账号。你看不到任何人的密码。</p>
            </div>
          </div>
          <button onClick={() => setReloadKey((k) => k + 1)} className="p-2 rounded-2xl bg-white border border-[#E2EFE7] hover:bg-[#EBF5F0]" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

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
                    ? '把这个链接发给用户（例如 WhatsApp）。对方打开后就可以设置新密码。链接只能用一次，大约 1 小时后失效。'
                    : '把这个临时密码告诉用户。对方用它登录后，系统会要求立刻设置新密码。这个密码只显示这一次。'}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 p-2.5 rounded-xl bg-[#F4F9F5] border border-[#E2EFE7] text-xs break-all">{result.value}</code>
                  <button onClick={() => copy(result.value)} className="px-3 py-2 rounded-xl bg-[#2F8F5B] text-white text-xs font-bold flex items-center gap-1 flex-shrink-0">
                    <Copy className="w-3.5 h-3.5" /> {copied ? '已复制' : '复制'}
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
            placeholder="搜索 Email"
            className="w-full pl-10 p-3 rounded-2xl bg-white border border-[#E2EFE7] text-sm focus:outline-none focus:border-[#2F8F5B]"
          />
        </div>

        {!users && !error && (
          <div className="py-16 flex justify-center text-[#8A9E92]"><Loader2 className="w-6 h-6 animate-spin" /></div>
        )}

        {users && (
          <div className="space-y-2.5">
            <p className="text-xs text-[#8A9E92]">共 {users.length} 个用户{query && `，符合搜索 ${filtered.length} 个`}</p>
            {filtered.map((u) => (
              <div key={u.id} className="p-4 rounded-2xl bg-white border border-[#E2EFE7] space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold break-all">{u.email}</span>
                  {u.isAdmin && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#2F8F5B]">管理员</span>}
                  {!u.emailConfirmed && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Email 未验证</span>}
                  {u.mustChangePassword && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">待修改临时密码</span>}
                </div>
                <div className="text-[11px] text-[#8A9E92]">
                  注册 {formatRelative(u.createdAt)} · 最后登录 {u.lastSignInAt ? formatRelative(u.lastSignInAt) : '从未'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busyId === u.id}
                    onClick={() => runAction(u, 'reset-link')}
                    className="px-3 py-1.5 rounded-xl bg-[#EBF5F0] text-[#2F8F5B] text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                  >
                    <Link2 className="w-3.5 h-3.5" /> 生成重设密码链接
                  </button>
                  {!u.isAdmin && (
                    <button
                      disabled={busyId === u.id}
                      onClick={() => runAction(u, 'temp-password')}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#E2EFE7] text-[#1C2B22] text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> 设置临时密码
                    </button>
                  )}
                  {!u.emailConfirmed && (
                    <button
                      disabled={busyId === u.id}
                      onClick={() => runAction(u, 'confirm-email')}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#E2EFE7] text-[#1C2B22] text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      <MailCheck className="w-3.5 h-3.5" /> 手动验证 Email
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

const ROLE_LABELS: Record<ModelHealth['role'], string> = {
  main: '主模型（Gemini）',
  backup: '备用模型（Gemini）',
  groq: 'Groq 后备',
};

// Pings each built-in AI once, so the owner can see which one is slow or down right now
function AIHealthCard() {
  const [state, setState] = useState<{ status: 'idle' | 'checking' | 'done' | 'error'; models?: ModelHealth[]; message?: string }>({ status: 'idle' });

  const check = async () => {
    setState({ status: 'checking' });
    try {
      const res = await fetch('/api/admin/ai-health');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '检查失败');
      setState({ status: 'done', models: data.models });
    } catch (err) {
      setState({ status: 'error', message: (err as Error).message });
    }
  };

  return (
    <section className="p-4 rounded-2xl bg-white border border-[#E2EFE7] space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold flex items-center gap-1.5"><Activity className="w-4 h-4 text-[#2F8F5B]" /> AI 状态检查</h2>
          <p className="text-[11px] text-[#8A9E92]">学生说 AI 很慢或出错时，按一下就知道是哪个 AI 出问题。</p>
        </div>
        <button
          onClick={check}
          disabled={state.status === 'checking'}
          className="px-3 py-2 rounded-xl bg-[#2F8F5B] hover:bg-[#26774B] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 flex-shrink-0"
        >
          {state.status === 'checking' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
          {state.status === 'checking' ? '检查中…（最多 45 秒）' : '开始检查'}
        </button>
      </div>
      {state.status === 'error' && <p className="text-xs text-rose-700">{state.message}</p>}
      {state.models?.map((m) => (
        <div key={m.role} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#F4F9F5] text-xs">
          <div className="min-w-0">
            <div className="font-bold">{ROLE_LABELS[m.role]}</div>
            <div className="text-[11px] text-[#8A9E92] font-mono truncate">{m.model}</div>
            {m.detail && <div className="text-[11px] text-rose-700 mt-0.5">{m.detail}</div>}
          </div>
          <span
            className={`flex-shrink-0 font-bold px-2.5 py-1 rounded-full ${
              !m.configured ? 'bg-slate-100 text-slate-500' : !m.ok ? 'bg-rose-100 text-rose-700' : m.ms > 15_000 ? 'bg-amber-100 text-amber-800' : 'bg-[#EBF5F0] text-[#2F8F5B]'
            }`}
          >
            {!m.configured ? '没有设定' : !m.ok ? '不能用' : `${(m.ms / 1000).toFixed(1)} 秒${m.ms > 15_000 ? ' · 很慢' : ' · 正常'}`}
          </span>
        </div>
      ))}
    </section>
  );
}
